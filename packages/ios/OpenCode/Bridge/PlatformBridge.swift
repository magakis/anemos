import Foundation
import UIKit
import WebKit
import UserNotifications

final class PlatformBridge {
  weak var webView: WKWebView?
  var onEvent: ((String, Any?) -> Void)?
  var onSelectUI: ((UISelection) -> Void)?

  private let haptics = HapticBridge()
  private let config = ServerConfig()

  func selectedUI() -> String? {
    config.getSelectedUI()
  }

  func chamberServerURL() -> URL? {
    config.chamberServerURL()
  }

  func handle(id: String, method: String, params: [String: Any], reply: @escaping (Any?, String?) -> Void) {
    switch method {
    case "openLink":
      openLink(params["url"] as? String)
      reply(nil, nil)
    case "notify":
      notify(params: params)
      reply(nil, nil)
    case "haptic":
      if let style = params["style"] as? String {
        haptics.impact(style: style)
      }
      reply(nil, nil)
    case "share":
      reply(share(params: params), nil)
    case "setDefaultServerUrl":
      config.setDefaultServerUrl(params["url"] as? String)
      reply(nil, nil)
    case "selectUI":
      guard let id = params["id"] as? String, let selection = UISelection.stored(rawValue: id) else {
        reply(nil, "Unsupported UI")
        return
      }
      guard selection != .chamberFull || config.chamberServerURL() != nil else {
        reply(nil, "Chamber server URL is not configured")
        return
      }
      config.setSelectedUI(selection.rawValue)
      reply(["id": selection.rawValue], nil)
      onSelectUI?(selection)
    case "getSelectedUI":
      var result: [String: Any] = [:]
      if let selection = config.getSelectedUI() {
        result["id"] = selection
      } else {
        result["id"] = NSNull()
      }
      reply(result, nil)
    case "getDefaultServerUrl":
      var result: [String: Any] = [:]
      if let url = config.getDefaultServerUrl() {
        result["url"] = url
      } else {
        result["url"] = NSNull()
      }
      reply(result, nil)
    case "readLegacySettings":
      reply(config.readLegacySettings(), nil)
    case "getChamberServerUrl":
      var result: [String: Any] = [:]
      if let url = config.getChamberServerUrl() {
        result["url"] = url
      } else {
        result["url"] = NSNull()
      }
      reply(result, nil)
    case "setChamberServerUrl":
      let value = params["url"] as? String
      guard config.setChamberServerUrl(value) else {
        reply(nil, "Invalid Chamber server URL")
        return
      }
      reply(nil, nil)
    case "probeChamberServerUrl":
      guard let value = params["url"] as? String, let url = ServerConfig.validChamberServerURL(value) else {
        reply(nil, "Invalid Chamber server URL")
        return
      }
      probe(url: url, reply: reply)
    case "storageGet":
      reply(config.storageGet(name: params["name"] as? String, key: params["key"] as? String), nil)
    case "storageSet":
      config.storageSet(
        name: params["name"] as? String,
        key: params["key"] as? String,
        value: params["value"] as? String,
      )
      reply(nil, nil)
    case "storageRemove":
      config.storageRemove(name: params["name"] as? String, key: params["key"] as? String)
      reply(nil, nil)
    case "storageClear":
      config.storageClear(name: params["name"] as? String)
      reply(nil, nil)
    case "storageKey":
      let name = params["name"] as? String
      let index = (params["index"] as? NSNumber)?.intValue
      reply(config.storageKey(name: name, index: index), nil)
    case "storageLength":
      reply(config.storageLength(name: params["name"] as? String), nil)
    default:
      reply(nil, "Unknown method")
    }
  }

  // ANEMOS-PATCH: route external links from Chamber's window.open through the
  // same native opener used by explicit openLink bridge calls.
  func openLink(_ value: String?) {
    guard let value, let target = URL(string: value) else { return }
    DispatchQueue.main.async {
      UIApplication.shared.open(target, options: [:], completionHandler: nil)
    }
  }

  // ANEMOS-PATCH: deliver Chamber completion notifications through iOS local
  // notifications when the app is backgrounded; generic push probes stay silent.
  private func notify(params: [String: Any]) {
    guard params["generic"] as? Bool != true else { return }
    if params["requireHidden"] as? Bool == true && UIApplication.shared.applicationState == .active { return }

    let content = UNMutableNotificationContent()
    content.title = params["title"] as? String ?? "OpenCode"
    content.body = params["description"] as? String ?? ""
    content.sound = .default
    if let href = params["href"] as? String {
      content.userInfo = ["href": href]
    }

    let request = UNNotificationRequest(
      identifier: "anemos.\(UUID().uuidString)",
      content: content,
      trigger: nil,
    )
    let center = UNUserNotificationCenter.current()
    center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
      guard granted else { return }
      center.add(request, withCompletionHandler: nil)
    }
  }

  private func probe(url: URL, reply: @escaping (Any?, String?) -> Void) {
    probe(url: url, method: "HEAD") { [weak self] status in
      guard let self else { return }
      if status == nil || status == 405 || status == 501 {
        self.probe(url: url, method: "GET") { getStatus in
          reply(self.probeResult(status: getStatus), nil)
        }
        return
      }
      reply(self.probeResult(status: status), nil)
    }
  }

  private func probe(url: URL, method: String, completion: @escaping (Int?) -> Void) {
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.timeoutInterval = 1.5
    if method == "GET" {
      request.setValue("bytes=0-0", forHTTPHeaderField: "Range")
    }
    URLSession.shared.dataTask(with: request) { _, response, _ in
      let status = (response as? HTTPURLResponse)?.statusCode
      DispatchQueue.main.async {
        completion(status)
      }
    }.resume()
  }

  private func probeResult(status: Int?) -> [String: Any] {
    var result: [String: Any] = ["reachable": status != nil]
    if let status { result["status"] = status }
    return result
  }

  private func share(params: [String: Any]) -> Bool {
    let text = params["text"] as? String
    let url = params["url"] as? String
    var items = [Any]()
    if let text { items.append(text) }
    if let url, let value = URL(string: url) { items.append(value) }
    if items.isEmpty { return false }

    DispatchQueue.main.async {
      let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
      if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
         let window = scene.windows.first,
         let root = window.rootViewController {
        if let popover = controller.popoverPresentationController {
          popover.sourceView = root.view
          popover.sourceRect = CGRect(x: root.view.bounds.midX, y: root.view.bounds.midY, width: 1, height: 1)
          popover.permittedArrowDirections = []
        }
        root.present(controller, animated: true)
      }
    }

    return true
  }
}
