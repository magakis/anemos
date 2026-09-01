import WebKit
import UniformTypeIdentifiers

// MARK: - Local file scheme handler

final class LocalFileSchemeHandler: NSObject, WKURLSchemeHandler {
  private let baseDirectory: URL

  init(baseDirectory: URL) {
    self.baseDirectory = baseDirectory
  }

  func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
    guard let url = urlSchemeTask.request.url else {
      urlSchemeTask.didFailWithError(URLError(.badURL))
      return
    }

    // Map the URL path to a local file
    var path = url.path
    if path.isEmpty || path == "/" { path = "/index.html" }

    let fileURL = baseDirectory.appendingPathComponent(path)

    guard let data = try? Data(contentsOf: fileURL) else {
      print("[OpenCode] SchemeHandler 404: \(path)")
      urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
      return
    }

    let mimeType = Self.mimeType(for: fileURL.pathExtension)
    let response = HTTPURLResponse(
      url: url,
      statusCode: 200,
      httpVersion: "HTTP/1.1",
      headerFields: [
        "Content-Type": mimeType,
        "Content-Length": "\(data.count)",
        "Access-Control-Allow-Origin": "*",
      ]
    )!
    urlSchemeTask.didReceive(response)
    urlSchemeTask.didReceive(data)
    urlSchemeTask.didFinish()
  }

  func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

  private static func mimeType(for ext: String) -> String {
    if let utType = UTType(filenameExtension: ext), let mime = utType.preferredMIMEType {
      return mime
    }
    switch ext.lowercased() {
    case "js", "mjs": return "application/javascript"
    case "css": return "text/css"
    case "html", "htm": return "text/html"
    case "json": return "application/json"
    case "svg": return "image/svg+xml"
    case "woff": return "font/woff"
    case "woff2": return "font/woff2"
    case "ttf": return "font/ttf"
    case "png": return "image/png"
    case "ico": return "image/x-icon"
    case "aac": return "audio/aac"
    case "webmanifest": return "application/manifest+json"
    default: return "application/octet-stream"
    }
  }
}

// MARK: - Bridge Controller

final class BridgeController: NSObject, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
  private let userContent = WKUserContentController()
  private let platform = PlatformBridge()
  private let gestures = GestureBridge()
  private let keyboard = KeyboardBridge()
  private let selectorEnabled = Self.readSelectorEnabled()
  private let resetRequested = ProcessInfo.processInfo.arguments.contains("--reset-ui")
  private weak var webView: WKWebView?
  private var schemeHandler: LocalFileSchemeHandler?
  private var pendingDeepLinks = [URL]()

  var configuration: WKWebViewConfiguration {
    let config = WKWebViewConfiguration()
    config.userContentController = userContent

    // Register custom scheme handler for release builds
    #if !DEBUG
    let handler = Self.resolveWebAssets()
    if let handler {
      config.setURLSchemeHandler(handler, forURLScheme: "tauri")
      self.schemeHandler = handler
      print("[OpenCode] Registered tauri:// scheme handler")
    }
    #endif

    return config
  }

  override init() {
    super.init()
    userContent.add(self, name: "opencode")
    platform.onEvent = { [weak self] type, payload in
      self?.sendEvent(type: type, payload: payload)
    }
    platform.onSelectUI = { [weak self] selection in
      self?.navigate(to: selection)
    }
  }

  func attach(to webView: WKWebView) {
    self.webView = webView
    webView.navigationDelegate = self
    platform.webView = webView
    gestures.attach(to: webView) { [weak self] type, payload in
      self?.sendEvent(type: type, payload: payload)
    }
    if selectorEnabled {
      attachSelectorGestures(to: webView)
    }
    keyboard.attach(to: webView)
    keyboard.onNavigate = { [weak self] direction in
      self?.sendEvent(type: "keyboardNavigation", payload: ["direction": direction])
    }
    keyboard.onClear = { [weak self] in
      self?.sendEvent(type: "keyboardClear", payload: nil)
    }
    keyboard.onNewline = { [weak self] in
      self?.sendEvent(type: "keyboardNewline", payload: nil)
    }
    keyboard.onDismiss = { webView.endEditing(true) }
    DeepLinkRelay.shared.onOpen = { [weak self] url in
      self?.handleDeepLink(url)
    }
    loadStartPage(in: webView)
  }

  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    guard let body = message.body as? [String: Any] else { return }
    guard let id = body["id"] as? String else { return }
    guard let method = body["method"] as? String else { return }
    let params = body["params"] as? [String: Any] ?? [:]

    if (method == "selectUI" || method == "getSelectedUI" || method == "getDefaultServerUrl")
      && !isLocalOrigin(message.frameInfo.securityOrigin) {
      sendResponse(id: id, result: nil, error: "Native UI selection is only available to local content")
      return
    }

    platform.handle(id: id, method: method, params: params) { [weak self] result, error in
      self?.sendResponse(id: id, result: result, error: error)
    }
  }

  private func loadStartPage(in webView: WKWebView) {
#if DEBUG
    if selectorEnabled, !resetRequested, let url = URL(string: "http://192.168.50.251:1421") {
      webView.load(URLRequest(url: url))
      return
    }
#endif

    if resetRequested {
      loadLocalPage(named: "selector.html", in: webView)
    } else if !selectorEnabled {
      loadLocalPage(named: UISelection.classic.fileName, in: webView)
    } else if let selection = UISelection.local(rawValue: platform.selectedUI()) {
      loadLocalPage(named: selection.fileName, in: webView)
    } else {
      loadLocalPage(named: "selector.html", in: webView)
    }
  }

  private func loadLocalPage(named name: String, in webView: WKWebView? = nil) {
    guard let webView = webView ?? self.webView else { return }

    // Use custom scheme to avoid file:// CORS restrictions with ES modules.
    if schemeHandler != nil, let url = URL(string: "tauri://localhost/\(name)") {
      webView.load(URLRequest(url: url))
      return
    }

    let resource = URL(fileURLWithPath: name).deletingPathExtension()
    if let url = Bundle.main.url(
      forResource: resource.lastPathComponent,
      withExtension: "html",
      subdirectory: "WebAssets",
    ) {
      webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    } else if let url = Bundle.main.url(forResource: resource.lastPathComponent, withExtension: "html") {
      webView.loadFileURL(url, allowingReadAccessTo: Bundle.main.bundleURL)
    }
  }

  private func navigate(to selection: UISelection) {
    guard selection != .chamberFull else { return }
    loadLocalPage(named: selection.fileName)
  }

  private func navigateToSelector() {
    guard selectorEnabled else { return }
    guard currentPage != "selector.html" else { return }
    loadLocalPage(named: "selector.html")
  }

  private var currentPage: String? {
    webView?.url?.pathComponents.last
  }

  private func handleDeepLink(_ url: URL) {
    guard url.scheme == "opencode" else { return }
    let target = UISelection.local(rawValue: platform.selectedUI()) ?? .chamber
    if currentPage == target.fileName {
      injectDeepLink(url)
      return
    }

    pendingDeepLinks.append(url)
    navigate(to: target)
  }

  private func attachSelectorGestures(to webView: WKWebView) {
    let swipe = UIPanGestureRecognizer(target: self, action: #selector(selectorSwipe(_:)))
    swipe.minimumNumberOfTouches = 4
    swipe.maximumNumberOfTouches = 4
    swipe.cancelsTouchesInView = false

    let doubleTap = UITapGestureRecognizer(target: self, action: #selector(selectorDoubleTap(_:)))
    doubleTap.numberOfTapsRequired = 2
    doubleTap.numberOfTouchesRequired = 4
    doubleTap.cancelsTouchesInView = false

    webView.addGestureRecognizer(swipe)
    webView.addGestureRecognizer(doubleTap)

#if DEBUG
    let reset = UILongPressGestureRecognizer(target: self, action: #selector(selectorReset(_:)))
    reset.minimumPressDuration = 1.2
    reset.cancelsTouchesInView = false
    webView.addGestureRecognizer(reset)
#endif
  }

  @objc private func selectorSwipe(_ recognizer: UIPanGestureRecognizer) {
    guard recognizer.state == .ended else { return }
    let translation = recognizer.translation(in: recognizer.view)
    let velocity = recognizer.velocity(in: recognizer.view)
    guard translation.y <= -140, velocity.y <= -600 else { return }
    navigateToSelector()
  }

  @objc private func selectorDoubleTap(_ recognizer: UITapGestureRecognizer) {
    guard recognizer.state == .ended else { return }
    navigateToSelector()
  }

#if DEBUG
  @objc private func selectorReset(_ recognizer: UILongPressGestureRecognizer) {
    guard recognizer.state == .began else { return }
    navigateToSelector()
  }
#endif

  private func isLocalOrigin(_ origin: WKSecurityOrigin) -> Bool {
    origin.protocol == "tauri" && origin.host == "localhost"
  }

  private static func readSelectorEnabled() -> Bool {
    guard let url = Bundle.main.url(forResource: "selector-config", withExtension: "json", subdirectory: "WebAssets"),
          let data = try? Data(contentsOf: url),
          let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let enabled = object["enabled"] as? Bool else {
      return true
    }
    return enabled
  }

  /// Locate web assets in the bundle and return a scheme handler for them
  private static func resolveWebAssets() -> LocalFileSchemeHandler? {
    let fileManager = FileManager.default
    let bundlePath = Bundle.main.bundlePath

    // Check for WebAssets subdirectory first (folder reference)
    let webAssetsDir = (bundlePath as NSString).appendingPathComponent("WebAssets")
    if fileManager.fileExists(atPath: (webAssetsDir as NSString).appendingPathComponent("classic.html"))
      || fileManager.fileExists(atPath: (webAssetsDir as NSString).appendingPathComponent("selector.html")) {
      print("[OpenCode] Serving from WebAssets/ subdirectory")
      return LocalFileSchemeHandler(baseDirectory: URL(fileURLWithPath: webAssetsDir))
    }

    // Flattened at bundle root
    if fileManager.fileExists(atPath: (bundlePath as NSString).appendingPathComponent("classic.html"))
      || fileManager.fileExists(atPath: (bundlePath as NSString).appendingPathComponent("selector.html")) {
      print("[OpenCode] Serving from bundle root (flattened)")
      return LocalFileSchemeHandler(baseDirectory: URL(fileURLWithPath: bundlePath))
    }

    print("[OpenCode] ERROR: No web assets found in bundle!")
    return nil
  }

  private func sendResponse(id: String, result: Any?, error: String?) {
    let payload: [Any] = [id, result ?? NSNull(), error ?? NSNull()]
    sendBridgeCall(function: "onResponse", payload: payload)
  }

  private func sendEvent(type: String, payload: Any?) {
    let payload: [Any] = [type, payload ?? NSNull()]
    sendBridgeCall(function: "onEvent", payload: payload)
  }

  private func sendBridgeCall(function: String, payload: [Any]) {
    guard let webView else { return }
    guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []) else { return }
    guard let json = String(data: data, encoding: .utf8) else { return }
    let script = "window.__OPENCODE_BRIDGE__ && window.__OPENCODE_BRIDGE__.\(function).apply(null, \(json))"
    webView.evaluateJavaScript(script, completionHandler: nil)
  }

  private func injectDeepLink(_ url: URL) {
    guard let webView else { return }
    guard let data = try? JSONSerialization.data(withJSONObject: url.absoluteString, options: [.fragmentsAllowed]) else { return }
    guard let json = String(data: data, encoding: .utf8) else { return }
    let script = """
    (() => {
      window.__OPENCODE__ = window.__OPENCODE__ || {};
      window.__OPENCODE__.deepLinks = window.__OPENCODE__.deepLinks || [];
      const u = \(json);
      window.__OPENCODE__.deepLinks.push(u);
      window.dispatchEvent(new CustomEvent("opencode:deep-link", { detail: { urls: [u] } }));
    })()
    """
    webView.evaluateJavaScript(script, completionHandler: nil)
  }

  // MARK: - WKNavigationDelegate

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    print("[OpenCode] Loaded: \(webView.url?.absoluteString ?? "nil")")
    DeepLinkRelay.shared.pageLoaded = true
    for url in DeepLinkRelay.shared.drain() {
      handleDeepLink(url)
    }
    let target = UISelection.local(rawValue: platform.selectedUI()) ?? .chamber
    if currentPage == target.fileName, !pendingDeepLinks.isEmpty {
      let links = pendingDeepLinks
      pendingDeepLinks = []
      for url in links {
        injectDeepLink(url)
      }
    }
  }

  func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    print("[OpenCode] Load failed: \(error.localizedDescription)")
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    print("[OpenCode] Navigation failed: \(error.localizedDescription)")
  }
}
