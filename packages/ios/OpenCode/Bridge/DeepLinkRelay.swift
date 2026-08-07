import Foundation

final class DeepLinkRelay {
  static let shared = DeepLinkRelay()
  private(set) var pending: [URL] = []
  var pageLoaded = false
  var onOpen: ((URL) -> Void)?
  private init() {}

  func push(_ url: URL) {
    if pageLoaded, let onOpen {
      onOpen(url)
    } else {
      pending.append(url)
    }
  }

  func drain() -> [URL] {
    let pendingURLs = pending
    pending = []
    return pendingURLs
  }
}
