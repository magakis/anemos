import Foundation

enum UISelection: String {
  case chamberFull = "1"
  case classic = "2"
  case chamber = "3"

  var fileName: String {
    switch self {
    case .chamberFull: return "chamber-full.html"
    case .classic: return "classic.html"
    case .chamber: return "chamber.html"
    }
  }

  static func local(rawValue: String?) -> UISelection? {
    guard let rawValue else { return nil }
    guard let selection = UISelection(rawValue: rawValue) else { return nil }
    guard selection != .chamberFull else { return nil }
    return selection
  }
}
