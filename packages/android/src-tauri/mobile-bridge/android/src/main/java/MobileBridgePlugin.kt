package ai.opencode.mobilebridge

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.MotionEvent
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.PermissionCallback
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.Socket
import java.net.URI
import java.net.URL
import java.io.File
import java.util.Collections
import java.util.concurrent.Executors
import java.util.concurrent.Future

@InvokeArg
class ShareArgs {
    var text: String? = null
    var url: String? = null
}

@InvokeArg
class UISelectionArgs {
    var id: String? = null
}

@InvokeArg
class ServerUrlArgs {
    var url: String? = null
}

@InvokeArg
class OpenLinkArgs {
    var url: String? = null
}

@InvokeArg
class NotifyArgs {
    var title: String? = null
    var description: String? = null
    var href: String? = null
    var kind: String? = null
    var requireHidden: Boolean = false
    var generic: Boolean = false
}

@InvokeArg
class HapticArgs {
    var style: String? = null
}

private data class ScanEntry(val host: String, val port: Int, val url: String)
private data class WifiAddressInfo(val address: String, val prefixLength: Int)
private data class ProbeResult(val reachable: Boolean, val status: Int?)

@TauriPlugin
class MobileBridgePlugin(private val activity: Activity) : Plugin(activity) {
    private val selectionPreferences = activity.getSharedPreferences("anemos.ui", Context.MODE_PRIVATE)
    private val configPreferences = activity.getSharedPreferences("anemos.config", Context.MODE_PRIVATE)
    private val main = Handler(Looper.getMainLooper())
    private val scanExecutor = Executors.newSingleThreadExecutor()
    private val probeExecutor = Executors.newCachedThreadPool()
    private var webView: WebView? = null
    private var shellMarkerInstalled = false
    private var notificationId = 0
    private var selectorEnabled = true
    private var fourFingerStartY = 0f
    private var fourFingerLastY = 0f
    private var fourFingerStartAt = 0L
    private var fourFingerMaxTravel = 0f
    private var sawFourFingerTouch = false
    private var firstTapAt = 0L
    private val pendingDeepLinks = ArrayDeque<String>()
    private val debugReset = Runnable { navigateToSelector() }

    @Volatile
    private var scanCancelled = false

    @Volatile
    private var scanTask: Future<*>? = null

    @Volatile
    private var scanGeneration = 0

    override fun onDestroy() {
        super.onDestroy()
        scanCancelled = true
        scanTask?.cancel(true)
        scanExecutor.shutdownNow()
        probeExecutor.shutdownNow()
        main.removeCallbacks(debugReset)
        webView?.setOnTouchListener(null)
        webView = null
        pendingDeepLinks.clear()
    }

    override fun load(webView: WebView) {
        this.webView = webView
        // ANEMOS-PATCH: inject the Android shell marker at document start and
        // gate it to the same local origin used by the bridge commands.
        installShellMarker(webView)
        selectorEnabled = readSelectorEnabled()
        if (selectorEnabled) installSelectorGestures(webView)

        val deepLink = extractDeepLink(activity.intent)
        webView.post {
            val target = if (deepLink != null) deepLinkTarget() else initialPage()
            deepLink?.let { pendingDeepLinks.addLast(it) }
            if (target == CHAMBER_FULL_PAGE && !loadChamberPage(webView)) {
                webView.loadUrl(localUrl(SELECTOR_PAGE))
            } else if (target != CHAMBER_FULL_PAGE) {
                webView.loadUrl(localUrl(target))
            }
            if (deepLink != null) main.postDelayed({ deliverPendingDeepLinks(target) }, 500L)
            activity.intent?.data = null
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        extractDeepLink(intent)?.let(::openDeepLink)
    }

    @Command
    fun scanNetwork(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        val gen = scanGeneration + 1
        scanGeneration = gen
        scanCancelled = false
        scanTask?.cancel(true)

        scanTask = scanExecutor.submit {
            val results = runScan(gen)
            if (isScanStale(gen)) {
                main.post {
                    if (isLocalOrigin()) invoke.resolve(JSObject().put("results", ArrayList<JSObject>()))
                }
                return@submit
            }
            main.post {
                if (!isLocalOrigin()) return@post
                invoke.resolve(JSObject().put("results", results))
                trigger("scanComplete", JSObject())
            }
        }
    }

    @Command
    fun cancelScan(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        scanCancelled = true
        scanGeneration += 1
        scanTask?.cancel(true)
        invoke.resolve()
    }

    @Command
    fun share(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        // ANEMOS-PATCH: return the boolean shape expected by the shared adapter.
        val args = invoke.parseArgs(ShareArgs::class.java)
        val parts = listOfNotNull(args.text?.trim()?.takeIf { it.isNotEmpty() }, args.url?.trim()?.takeIf { it.isNotEmpty() })
        if (parts.isEmpty()) {
            invoke.resolve(false)
            return
        }

        val text = parts.joinToString("\n")
        val sendIntent = Intent().apply {
            action = Intent.ACTION_SEND
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }

        try {
            activity.startActivity(Intent.createChooser(sendIntent, null))
            invoke.resolve(true)
        } catch (_: Throwable) {
            invoke.resolve(false)
        }
    }

    @Command
    fun openLink(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        val args = invoke.parseArgs(OpenLinkArgs::class.java)
        val raw = args.url?.trim()
        val uri = raw?.let(Uri::parse)
        val scheme = uri?.scheme?.lowercase()
        if (raw.isNullOrEmpty() || (scheme != "http" && scheme != "https")) {
            invoke.resolve(false)
            return
        }
        try {
            activity.startActivity(Intent(Intent.ACTION_VIEW, uri))
            invoke.resolve(true)
        } catch (_: Throwable) {
            invoke.resolve(false)
        }
    }

    @Command
    fun notify(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        val args = invoke.parseArgs(NotifyArgs::class.java)
        if (args.generic || (args.requireHidden && activity.hasWindowFocus())) {
            invoke.resolve(false)
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                NOTIFICATION_PERMISSION_REQUEST_CODE,
            )
            invoke.resolve(false)
            return
        }

        val manager = activity.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        if (manager == null) {
            invoke.resolve(false)
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(NOTIFICATION_CHANNEL_ID, "Anemos", NotificationManager.IMPORTANCE_DEFAULT),
            )
        }
        val notification = NotificationCompat.Builder(activity, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(if (activity.applicationInfo.icon != 0) activity.applicationInfo.icon else android.R.drawable.ic_dialog_info)
            .setContentTitle(args.title ?: "OpenCode")
            .setContentText(args.description ?: "")
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || NotificationManagerCompat.from(activity).areNotificationsEnabled()) {
            manager.notify(notificationId++, notification)
            invoke.resolve(true)
        } else {
            invoke.resolve(false)
        }
    }

    @Command
    fun haptic(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        val style = invoke.parseArgs(HapticArgs::class.java).style
        val duration = when (style) {
            "heavy" -> 36L
            "medium", "warning", "error" -> 24L
            else -> 14L
        }
        val vibrator = activity.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(duration)
            }
        }
        invoke.resolve()
    }

    @Command
    fun selectUI(invoke: Invoke) {
        if (rejectRemote(invoke)) return

        val args = invoke.parseArgs(UISelectionArgs::class.java)
        val selection = args.id
        if (selection != "1" && selection != "2") {
            invoke.reject("Unsupported UI")
            return
        }
        if (selection == "1" && chamberServerUri() == null) {
            invoke.reject("Chamber server URL is not configured")
            return
        }

        selectionPreferences.edit().putString(SELECTED_UI_KEY, selection).apply()
        invoke.resolve(JSObject().put("id", selection))
        main.post {
            if (selection == "1") {
                if (!loadChamberPage()) webView?.loadUrl(localUrl(SELECTOR_PAGE))
            } else {
                webView?.loadUrl(localUrl(CLASSIC_PAGE))
            }
        }
    }

    @Command
    fun getSelectedUI(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        invoke.resolve(JSObject().put("id", selectionPreferences.getString(SELECTED_UI_KEY, null)))
    }

    @Command
    fun getDefaultServerUrl(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        invoke.resolve(JSObject().put("url", configPreferences.getString(DEFAULT_SERVER_URL_KEY, null)))
    }

    @Command
    fun readLegacySettings(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        val result = JSObject()
        val values = readLegacySettingsFile()
        LEGACY_SETTINGS_KEYS.forEach { key ->
            val value = values?.opt(key)
            if (value is String && value.isNotBlank()) result.put(key, value)
        }
        // ANEMOS-PATCH: retain the bridge-mirrored URL as a fallback for old
        // installs that never flushed the Tauri store file.
        if (!result.has(DEFAULT_SERVER_URL_KEY)) {
            configPreferences.getString(DEFAULT_SERVER_URL_KEY, null)?.let { result.put(DEFAULT_SERVER_URL_KEY, it) }
        }
        invoke.resolve(result)
    }

    @Command
    fun setDefaultServerUrl(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        val args = invoke.parseArgs(ServerUrlArgs::class.java)
        val editor = configPreferences.edit()
        if (args.url.isNullOrBlank()) editor.remove(DEFAULT_SERVER_URL_KEY) else editor.putString(DEFAULT_SERVER_URL_KEY, args.url)
        editor.apply()
        invoke.resolve()
    }

    @Command
    fun getChamberServerUrl(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        invoke.resolve(JSObject().put("url", configPreferences.getString(CHAMBER_SERVER_URL_KEY, null)))
    }

    @Command
    fun setChamberServerUrl(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        val args = invoke.parseArgs(ServerUrlArgs::class.java)
        val raw = args.url
        if (raw.isNullOrBlank()) {
            configPreferences.edit().remove(CHAMBER_SERVER_URL_KEY).apply()
            invoke.resolve()
            return
        }
        val uri = chamberServerUri(raw)
        if (uri == null) {
            invoke.reject(INVALID_CHAMBER_SERVER_URL_MESSAGE)
            return
        }
        configPreferences.edit().putString(CHAMBER_SERVER_URL_KEY, uri.toString()).apply()
        invoke.resolve()
    }

    @Command
    fun probeChamberServerUrl(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        val args = invoke.parseArgs(ServerUrlArgs::class.java)
        val raw = args.url
        if (raw.isNullOrBlank() || chamberServerUri(raw) == null) {
            invoke.reject(INVALID_CHAMBER_SERVER_URL_MESSAGE)
            return
        }
        probeExecutor.submit {
            val result = probeUrl(raw)
            main.post {
                if (!isLocalOrigin()) return@post
                val response = JSObject().put("reachable", result.reachable)
                result.status?.let { response.put("status", it) }
                invoke.resolve(response)
            }
        }
    }

    @Command
    override fun registerListener(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        super.registerListener(invoke)
    }

    @Command
    override fun removeListener(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        super.removeListener(invoke)
    }

    @Command
    @PermissionCallback
    override fun checkPermissions(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        super.checkPermissions(invoke)
    }

    @Command
    override fun requestPermissions(invoke: Invoke) {
        if (rejectRemote(invoke)) return
        super.requestPermissions(invoke)
    }

    private fun initialPage(): String {
        if (activity.intent?.getBooleanExtra(RESET_UI_EXTRA, false) == true
            || activity.intent?.getBooleanExtra("--reset-ui", false) == true) return SELECTOR_PAGE
        if (!selectorEnabled) return CLASSIC_PAGE
        val selected = selectionPreferences.getString(SELECTED_UI_KEY, null)
        if (selected == "1" && chamberServerUri() != null) return CHAMBER_FULL_PAGE
        if (selected == "2") return CLASSIC_PAGE
        return SELECTOR_PAGE
    }

    private fun deepLinkTarget(): String = CLASSIC_PAGE

    private fun localUrl(page: String): String = "http://tauri.localhost/$page"

    private fun loadChamberPage(view: WebView? = webView): Boolean {
        val uri = chamberServerUri() ?: return false
        if (view == null) return false
        view.loadUrl(uri.toString())
        return true
    }

    private fun isLocalOrigin(): Boolean {
        val uri = webView?.url?.let(Uri::parse) ?: return false
        return uri.scheme == "http" && uri.host == "tauri.localhost"
    }

    private fun isLocalPage(page: String): Boolean {
        val uri = webView?.url?.let(Uri::parse) ?: return false
        return isLocalOrigin() && uri.path == "/$page"
    }

    private fun rejectRemote(invoke: Invoke): Boolean {
        if (isLocalOrigin()) return false
        invoke.reject("Native mobile bridge is only available to local content")
        return true
    }

    private fun chamberServerUri(raw: String? = configPreferences.getString(CHAMBER_SERVER_URL_KEY, null)): Uri? {
        val uri = raw?.trim()?.let(Uri::parse) ?: return null
        val scheme = uri.scheme?.lowercase() ?: return null
        val parsed = try {
            URI(uri.toString())
        } catch (_: Throwable) {
            return null
        }
        if (parsed.host == null || parsed.userInfo != null || parsed.port !in -1..65535 || parsed.port == 0) return null
        if (scheme != "http" && scheme != "https") return null
        return uri
    }

    private fun probeUrl(raw: String): ProbeResult {
        var result = requestUrl(raw, "HEAD")
        if (result == null || result == 405 || result == 501) result = requestUrl(raw, "GET")
        return ProbeResult(reachable = result != null, status = result)
    }

    private fun requestUrl(raw: String, method: String): Int? {
        val connection = try {
            URL(raw).openConnection() as? HttpURLConnection
        } catch (_: Throwable) {
            null
        } ?: return null

        return try {
            connection.requestMethod = method
            connection.connectTimeout = 1_500
            connection.readTimeout = 1_500
            if (method == "GET") connection.setRequestProperty("Range", "bytes=0-0")
            connection.connect()
            connection.responseCode
        } catch (_: Throwable) {
            null
        } finally {
            connection.disconnect()
        }
    }

    private fun readSelectorEnabled(): Boolean {
        return try {
            activity.assets.open("selector-config.json").bufferedReader().use {
                JSONObject(it.readText()).optBoolean("enabled", true)
            }
        } catch (_: Throwable) {
            true
        }
    }

    // ANEMOS-PATCH: read the legacy Tauri store without exposing it to remote
    // pages; the store is a JSON object under the app data directory.
    private fun readLegacySettingsFile(): JSONObject? {
        val candidates = listOf(
            File(activity.dataDir, LEGACY_SETTINGS_STORE),
            File(activity.dataDir, "app_data/$LEGACY_SETTINGS_STORE"),
            File(activity.filesDir, LEGACY_SETTINGS_STORE),
            File(activity.filesDir, "app_data/$LEGACY_SETTINGS_STORE"),
        )
        for (file in candidates) {
            if (!file.isFile) continue
            try {
                return JSONObject(file.readText())
            } catch (_: Throwable) {
                continue
            }
        }
        return null
    }

    private fun installShellMarker(webView: WebView) {
        if (shellMarkerInstalled || !WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return
        try {
            WebViewCompat.addDocumentStartJavaScript(
                webView,
                "if ((location.protocol === 'http:' && location.host === 'tauri.localhost')) window.__ANEMOS_SHELL__ = 'android';",
                setOf("http://tauri.localhost/*"),
            )
            shellMarkerInstalled = true
        } catch (_: Throwable) {
            // The Chamber bootstrap supplies the same origin-gated fallback on
            // WebViews that do not expose document-start scripts.
        }
    }

    private fun installSelectorGestures(webView: WebView) {
        webView.setOnTouchListener { _, event ->
            handleSelectorTouch(event)
            false
        }
    }

    private fun handleSelectorTouch(event: MotionEvent) {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                if (activity.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
                    main.postDelayed(debugReset, 1_200L)
                }
                fourFingerStartY = event.getY(0)
                fourFingerLastY = fourFingerStartY
                fourFingerStartAt = event.eventTime
                fourFingerMaxTravel = 0f
                sawFourFingerTouch = false
            }
            MotionEvent.ACTION_POINTER_DOWN, MotionEvent.ACTION_MOVE -> {
                main.removeCallbacks(debugReset)
                if (event.pointerCount < 4) return
                if (!sawFourFingerTouch) {
                    sawFourFingerTouch = true
                    fourFingerStartY = event.getY(0)
                    fourFingerStartAt = event.eventTime
                }
                fourFingerLastY = event.getY(0)
                fourFingerMaxTravel = maxOf(fourFingerMaxTravel, kotlin.math.abs(fourFingerLastY - fourFingerStartY))
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                main.removeCallbacks(debugReset)
                if (!sawFourFingerTouch) return
                val duration = (event.eventTime - fourFingerStartAt).coerceAtLeast(1L)
                val distance = fourFingerLastY - fourFingerStartY
                val upwardVelocity = -distance * 1000f / duration
                if (distance <= -160f && upwardVelocity >= 700f) {
                    navigateToSelector()
                } else if (fourFingerMaxTravel <= 42f && duration <= 350L) {
                    val now = event.eventTime
                    if (now - firstTapAt in 1..550) {
                        firstTapAt = 0L
                        navigateToSelector()
                    } else {
                        firstTapAt = now
                    }
                }
                sawFourFingerTouch = false
            }
        }
    }

    private fun navigateToSelector() {
        if (!selectorEnabled || isLocalPage(SELECTOR_PAGE)) return
        webView?.post { webView?.loadUrl(localUrl(SELECTOR_PAGE)) }
    }

    private fun extractDeepLink(intent: Intent?): String? {
        val candidates = listOfNotNull(
            intent?.data?.toString(),
            intent?.getStringExtra("url"),
            intent?.getStringExtra("href"),
            intent?.getStringExtra("deepLink"),
            intent?.getStringExtra("deep_link"),
        )
        return candidates.firstOrNull { it.startsWith("opencode://") }
    }

    private fun openDeepLink(url: String) {
        val view = webView ?: return
        val target = deepLinkTarget()
        if (view.url?.endsWith("/$target") == true) {
            injectDeepLink(url)
            return
        }
        pendingDeepLinks.addLast(url)
        view.post { view.loadUrl(localUrl(target)) }
        main.postDelayed({ deliverPendingDeepLinks(target) }, 500L)
    }

    private fun deliverPendingDeepLinks(target: String) {
        val view = webView ?: return
        if (view.url?.endsWith("/$target") != true) return
        while (pendingDeepLinks.isNotEmpty()) injectDeepLink(pendingDeepLinks.removeFirst())
    }

    private fun injectDeepLink(url: String) {
        if (!isLocalOrigin()) return
        val value = JSONObject.quote(url)
        webView?.evaluateJavascript(
            "window.__OPENCODE__=window.__OPENCODE__||{};window.__OPENCODE__.deepLinks=window.__OPENCODE__.deepLinks||[];const u=$value;window.__OPENCODE__.deepLinks.push(u);window.dispatchEvent(new CustomEvent('opencode:deep-link',{detail:{urls:[u]}}));",
            null,
        )
    }

    private companion object {
        const val SELECTED_UI_KEY = "selectedUI"
        const val DEFAULT_SERVER_URL_KEY = "defaultServerUrl"
        const val CHAMBER_SERVER_URL_KEY = "chamberServerUrl"
        const val INVALID_CHAMBER_SERVER_URL_MESSAGE = "Enter a valid http:// or https:// URL."
        const val RESET_UI_EXTRA = "reset-ui"
        const val SELECTOR_PAGE = "selector.html"
        const val CLASSIC_PAGE = "classic.html"
        const val CHAMBER_FULL_PAGE = "chamber-full.html"
        const val LEGACY_SETTINGS_STORE = "opencode.settings.dat"
        const val NOTIFICATION_CHANNEL_ID = "anemos"
        const val NOTIFICATION_PERMISSION_REQUEST_CODE = 4701
        val LEGACY_SETTINGS_KEYS = listOf("defaultServerUrl", "defaultServerUsername", "defaultServerPassword")
    }

    private fun runScan(gen: Int): ArrayList<JSObject> {
        val info = wifiAddress() ?: return ArrayList()

        val hosts = subnetHosts(info.address, info.prefixLength)
        if (hosts.isEmpty()) return ArrayList()

        val pool = Executors.newFixedThreadPool(48)
        val futures = ArrayList<Future<ScanEntry?>>()

        for (host in hosts) {
            if (isScanStale(gen)) break
            futures.add(pool.submit<ScanEntry?> { probeHost(host, gen) })
        }

        val found = ArrayList<JSObject>()
        for (future in futures) {
            if (isScanStale(gen)) break
            val item = try {
                future.get()
            } catch (_: Throwable) {
                null
            }
            if (item != null) {
                val value = JSObject()
                value.put("host", item.host)
                value.put("port", item.port)
                value.put("url", item.url)
                found.add(value)
                main.post {
                    if (!isScanStale(gen)) trigger("scanResult", value)
                }
            }
        }

        pool.shutdownNow()
        return found
    }

    private fun probeHost(host: String, gen: Int): ScanEntry? {
        if (isScanStale(gen)) return null

        val port = 4096
        val socket = Socket()
        return try {
            socket.connect(InetSocketAddress(host, port), 500)
            socket.close()

            val base = "http://$host:$port"
            if (!checkHealth("$base/global/health", gen) && !checkHealth("$base/health", gen)) return null
            ScanEntry(host = host, port = port, url = base)
        } catch (_: Throwable) {
            null
        } finally {
            try {
                socket.close()
            } catch (_: Throwable) {
            }
        }
    }

    private fun checkHealth(url: String, gen: Int): Boolean {
        repeat(2) {
            if (isScanStale(gen)) return false
            val connection = try {
                URL(url).openConnection() as HttpURLConnection
            } catch (_: Throwable) {
                return false
            }

            val healthy = try {
                connection.requestMethod = "GET"
                connection.connectTimeout = 1200
                connection.readTimeout = 1200
                connection.connect()
                val code = connection.responseCode
                code in 200..299
            } catch (_: Throwable) {
                false
            } finally {
                connection.disconnect()
            }

            if (healthy) return true
        }
        return false
    }

    private fun wifiAddress(): WifiAddressInfo? {
        // Primary: use ConnectivityManager to find the WiFi network's address
        try {
            val cm = activity.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            if (cm != null) {
                val network = cm.activeNetwork
                if (network != null) {
                    val caps = cm.getNetworkCapabilities(network)
                    if (caps != null && caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                        val props = cm.getLinkProperties(network)
                        if (props != null) {
                            for (la in props.linkAddresses) {
                                val addr = la.address
                                if (addr is Inet4Address && !addr.isLoopbackAddress) {
                                    val host = addr.hostAddress ?: continue
                                    return WifiAddressInfo(host, la.prefixLength)
                                }
                            }
                        }
                    }
                }
            }
        } catch (_: Throwable) {}

        // Fallback: iterate NetworkInterface, filter for wlan* (Android WiFi)
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (ni in interfaces) {
                if (!ni.isUp || ni.isLoopback) continue
                val name = ni.name ?: continue
                if (!name.startsWith("wlan")) continue
                for (ia in ni.interfaceAddresses) {
                    val addr = ia.address
                    if (addr is Inet4Address && !addr.isLoopbackAddress) {
                        val host = addr.hostAddress ?: continue
                        return WifiAddressInfo(host, ia.networkPrefixLength.toInt())
                    }
                }
            }
        } catch (_: Throwable) {}

        return null
    }

    private fun subnetHosts(ip: String, prefixLength: Int): List<String> {
        val parts = ip.split('.')
        if (parts.size != 4) return emptyList()

        val ipInt = (parts[0].toInt() shl 24) or
                (parts[1].toInt() shl 16) or
                (parts[2].toInt() shl 8) or
                parts[3].toInt()

        // Cap at /20 so scans do not take minutes on large enterprise networks.
        val prefix = prefixLength.coerceIn(20, 30)
        val mask = (-1 shl (32 - prefix))
        val network = ipInt and mask
        val broadcast = network or mask.inv()

        val local24 = ip.substringBeforeLast('.', missingDelimiterValue = "")
        val primary = ArrayList<String>()
        val secondary = ArrayList<String>()
        // Skip network address (+1) and broadcast address (-1)
        for (addr in (network + 1) until broadcast) {
            val host = "${(addr ushr 24) and 0xFF}." +
                    "${(addr ushr 16) and 0xFF}." +
                    "${(addr ushr 8) and 0xFF}." +
                    "${addr and 0xFF}"
            if (host.startsWith("$local24.")) {
                primary.add(host)
            } else {
                secondary.add(host)
            }
        }
        val hosts = ArrayList<String>(primary.size + secondary.size)
        hosts.addAll(primary)
        hosts.addAll(secondary)
        return hosts
    }

    private fun isScanStale(gen: Int): Boolean {
        return scanCancelled || scanGeneration != gen || Thread.currentThread().isInterrupted
    }
}
