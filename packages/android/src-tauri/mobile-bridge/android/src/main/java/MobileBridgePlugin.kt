package ai.opencode.mobilebridge

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.webkit.WebView
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
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
import java.net.URL
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

private data class ScanEntry(val host: String, val port: Int, val url: String)
private data class WifiAddressInfo(val address: String, val prefixLength: Int)

@TauriPlugin
class MobileBridgePlugin(private val activity: Activity) : Plugin(activity) {
    private val selectionPreferences = activity.getSharedPreferences("anemos.ui", Context.MODE_PRIVATE)
    private val configPreferences = activity.getSharedPreferences("anemos.config", Context.MODE_PRIVATE)
    private val main = Handler(Looper.getMainLooper())
    private val scanExecutor = Executors.newSingleThreadExecutor()
    private var webView: WebView? = null
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
        main.removeCallbacks(debugReset)
        webView?.setOnTouchListener(null)
        webView = null
        pendingDeepLinks.clear()
    }

    override fun load(webView: WebView) {
        this.webView = webView
        selectorEnabled = readSelectorEnabled()
        if (selectorEnabled) installSelectorGestures(webView)

        val deepLink = extractDeepLink(activity.intent)
        webView.post {
            val target = if (deepLink != null) deepLinkTarget() else initialPage()
            deepLink?.let { pendingDeepLinks.addLast(it) }
            webView.loadUrl(localUrl(target))
            activity.intent?.data = null
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        extractDeepLink(intent)?.let(::openDeepLink)
    }

    @Command
    fun scanNetwork(invoke: Invoke) {
        val gen = scanGeneration + 1
        scanGeneration = gen
        scanCancelled = false
        scanTask?.cancel(true)

        scanTask = scanExecutor.submit {
            val results = runScan(gen)
            if (isScanStale(gen)) {
                main.post { invoke.resolve(JSObject().put("results", ArrayList<JSObject>())) }
                return@submit
            }
            main.post {
                invoke.resolve(JSObject().put("results", results))
                trigger("scanComplete", JSObject())
            }
        }
    }

    @Command
    fun cancelScan(invoke: Invoke) {
        scanCancelled = true
        scanGeneration += 1
        scanTask?.cancel(true)
        invoke.resolve()
    }

    @Command
    fun share(invoke: Invoke) {
        val args = invoke.parseArgs(ShareArgs::class.java)
        val parts = listOfNotNull(args.text?.trim()?.takeIf { it.isNotEmpty() }, args.url?.trim()?.takeIf { it.isNotEmpty() })
        if (parts.isEmpty()) {
            invoke.resolve(JSObject().put("success", false))
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
            invoke.resolve(JSObject().put("success", true))
        } catch (_: Throwable) {
            invoke.resolve(JSObject().put("success", false))
        }
    }

    @Command
    fun selectUI(invoke: Invoke) {
        if (!isLocalOrigin()) {
            invoke.reject("Native UI selection is only available to local content")
            return
        }

        val args = invoke.parseArgs(UISelectionArgs::class.java)
        val selection = args.id
        if (selection != "2" && selection != "3") {
            invoke.reject("Unsupported UI")
            return
        }

        selectionPreferences.edit().putString(SELECTED_UI_KEY, selection).apply()
        invoke.resolve(JSObject().put("id", selection))
        main.post { webView?.loadUrl(localUrl(pageFor(selection))) }
    }

    @Command
    fun getSelectedUI(invoke: Invoke) {
        if (!isLocalOrigin()) {
            invoke.reject("Native UI selection is only available to local content")
            return
        }
        invoke.resolve(JSObject().put("id", selectionPreferences.getString(SELECTED_UI_KEY, null)))
    }

    @Command
    fun getDefaultServerUrl(invoke: Invoke) {
        if (!isLocalOrigin()) {
            invoke.reject("Native UI selection is only available to local content")
            return
        }
        invoke.resolve(JSObject().put("url", configPreferences.getString(DEFAULT_SERVER_URL_KEY, null)))
    }

    @Command
    fun setDefaultServerUrl(invoke: Invoke) {
        if (!isLocalOrigin()) {
            invoke.reject("Native UI selection is only available to local content")
            return
        }
        val args = invoke.parseArgs(ServerUrlArgs::class.java)
        val editor = configPreferences.edit()
        if (args.url.isNullOrBlank()) editor.remove(DEFAULT_SERVER_URL_KEY) else editor.putString(DEFAULT_SERVER_URL_KEY, args.url)
        editor.apply()
        invoke.resolve()
    }

    private fun initialPage(): String {
        if (activity.intent?.getBooleanExtra(RESET_UI_EXTRA, false) == true
            || activity.intent?.getBooleanExtra("--reset-ui", false) == true) return SELECTOR_PAGE
        if (!selectorEnabled) return CLASSIC_PAGE
        return selectionPreferences.getString(SELECTED_UI_KEY, null)?.let(::pageFor) ?: SELECTOR_PAGE
    }

    private fun deepLinkTarget(): String {
        return selectionPreferences.getString(SELECTED_UI_KEY, null)?.let(::pageFor) ?: CHAMBER_PAGE
    }

    private fun pageFor(selection: String): String {
        return if (selection == "3") CHAMBER_PAGE else CLASSIC_PAGE
    }

    private fun localUrl(page: String): String = "http://tauri.localhost/$page"

    private fun isLocalOrigin(): Boolean {
        val uri = webView?.url?.let(Uri::parse) ?: return false
        return uri.scheme == "http" && uri.host == "tauri.localhost"
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
        if (!selectorEnabled || webView?.url?.endsWith("/$SELECTOR_PAGE") == true) return
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
        val value = JSONObject.quote(url)
        webView?.evaluateJavascript(
            "window.__OPENCODE__=window.__OPENCODE__||{};window.__OPENCODE__.deepLinks=window.__OPENCODE__.deepLinks||[];const u=$value;window.__OPENCODE__.deepLinks.push(u);window.dispatchEvent(new CustomEvent('opencode:deep-link',{detail:{urls:[u]}}));",
            null,
        )
    }

    private companion object {
        const val SELECTED_UI_KEY = "selectedUI"
        const val DEFAULT_SERVER_URL_KEY = "defaultServerUrl"
        const val RESET_UI_EXTRA = "reset-ui"
        const val SELECTOR_PAGE = "selector.html"
        const val CLASSIC_PAGE = "classic.html"
        const val CHAMBER_PAGE = "chamber.html"
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
