import Foundation

enum UISelection: String {
  case chamberFull = "1"
  case classic = "2"

  var fileName: String {
    switch self {
    case .chamberFull: return "chamber-full.html"
    case .classic: return "classic.html"
    }
  }

  static func stored(rawValue: String?) -> UISelection? {
    guard let rawValue else { return nil }
    return UISelection(rawValue: rawValue)
  }

  static func local(rawValue: String?) -> UISelection? {
    guard let selection = stored(rawValue: rawValue) else { return nil }
    guard selection != .chamberFull else { return nil }
    return selection
  }
}
