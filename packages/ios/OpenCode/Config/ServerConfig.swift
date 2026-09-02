import Foundation

final class ServerConfig {
  private let defaults = UserDefaults.standard
  private let defaultServerKey = "opencode.defaultServerUrl"
  private let chamberServerKey = "opencode.chamberServerUrl"
  private let selectedUIKey = "opencode.selectedUI"
  private let storagePrefix = "opencode.storage."

  func getDefaultServerUrl() -> String? {
    defaults.string(forKey: defaultServerKey) ?? storageGet(name: "settings.dat", key: "defaultServerUrl")
  }

  func setDefaultServerUrl(_ url: String?) {
    if let url {
      defaults.set(url, forKey: defaultServerKey)
      return
    }
    defaults.removeObject(forKey: defaultServerKey)
  }

  func getChamberServerUrl() -> String? {
    defaults.string(forKey: chamberServerKey)
  }

  func chamberServerURL() -> URL? {
    Self.validChamberServerURL(getChamberServerUrl())
  }

  func setChamberServerUrl(_ url: String?) -> Bool {
    guard let url else {
      defaults.removeObject(forKey: chamberServerKey)
      return true
    }
    guard Self.validChamberServerURL(url) != nil else { return false }
    defaults.set(url.trimmingCharacters(in: .whitespacesAndNewlines), forKey: chamberServerKey)
    return true
  }

  func getSelectedUI() -> String? {
    defaults.string(forKey: selectedUIKey)
  }

  func setSelectedUI(_ selection: String?) {
    if let selection {
      defaults.set(selection, forKey: selectedUIKey)
    } else {
      defaults.removeObject(forKey: selectedUIKey)
    }
  }

  func storageGet(name: String?, key: String?) -> String? {
    guard let key = storageKey(name: name, key: key) else { return nil }
    return defaults.string(forKey: key)
  }

  func storageSet(name: String?, key: String?, value: String?) {
    guard let key = storageKey(name: name, key: key) else { return }
    if let value {
      defaults.set(value, forKey: key)
      return
    }
    defaults.removeObject(forKey: key)
  }

  func storageRemove(name: String?, key: String?) {
    guard let key = storageKey(name: name, key: key) else { return }
    defaults.removeObject(forKey: key)
  }

  func storageClear(name: String?) {
    guard let name else { return }
    let prefix = storagePrefix + name + ":"
    for key in defaults.dictionaryRepresentation().keys where key.hasPrefix(prefix) {
      defaults.removeObject(forKey: key)
    }
  }

  func storageKey(name: String?, index: Int?) -> String? {
    guard let name, let index else { return nil }
    let keys = storageKeys(name: name)
    guard index >= 0 && index < keys.count else { return nil }
    return keys[index]
  }

  func storageLength(name: String?) -> Int {
    guard let name else { return 0 }
    return storageKeys(name: name).count
  }

  private func storageKeys(name: String) -> [String] {
    let prefix = storagePrefix + name + ":"
    return defaults.dictionaryRepresentation().keys
      .filter { $0.hasPrefix(prefix) }
      .map { String($0.dropFirst(prefix.count)) }
      .sorted()
  }

  private func storageKey(name: String?, key: String?) -> String? {
    guard let name, let key else { return nil }
    return storagePrefix + name + ":" + key
  }

  static func validChamberServerURL(_ value: String?) -> URL? {
    guard let value else { return nil }
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty, let components = URLComponents(string: trimmed),
          let scheme = components.scheme?.lowercased(), let host = components.host,
          !host.isEmpty, components.user == nil, components.password == nil,
          let url = components.url else { return nil }
    if let port = components.port, !(1...65535).contains(port) { return nil }

    if scheme == "https" { return url }
    guard scheme == "http", isAllowedHttpHost(host) else { return nil }
    return url
  }

  static func isAllowedHttpHost(_ host: String) -> Bool {
    let normalized = host.lowercased()
    let unbracketed = normalized.hasPrefix("[") && normalized.hasSuffix("]")
      ? String(normalized.dropFirst().dropLast())
      : normalized
    if unbracketed == "localhost" || unbracketed == "127.0.0.1" || unbracketed == "::1" || unbracketed.hasSuffix(".local") {
      return true
    }
    return isPrivateIPv4(unbracketed) || isAllowedIPv6(unbracketed)
  }

  private static func isPrivateIPv4(_ host: String) -> Bool {
    let parts = host.split(separator: ".", omittingEmptySubsequences: false)
    guard parts.count == 4,
          parts.allSatisfy({ part in
            !part.isEmpty && part.allSatisfy { "0123456789".contains($0) }
          }) else { return false }
    let octets = parts.compactMap { Int($0) }
    guard octets.count == 4, octets.allSatisfy({ (0...255).contains($0) }) else { return false }
    return octets[0] == 10
      || (octets[0] == 172 && (16...31).contains(octets[1]))
      || (octets[0] == 192 && octets[1] == 168)
      || (octets[0] == 100 && (64...127).contains(octets[1]))
  }

  private static func isAllowedIPv6(_ host: String) -> Bool {
    guard host.contains(":") else { return false }
    let sections = host.components(separatedBy: "::")
    guard sections.count <= 2 else { return false }

    func groups(_ section: String) -> [String]? {
      if section.isEmpty { return [] }
      let values = section.split(separator: ":", omittingEmptySubsequences: false).map(String.init)
      guard values.allSatisfy({ value in
        !value.isEmpty && value.count <= 4 && value.allSatisfy { "0123456789abcdef".contains($0) }
      }) else { return nil }
      return values
    }

    guard let left = groups(sections[0]) else { return false }
    let right: [String]
    if sections.count == 2 {
      guard let parsedRight = groups(sections[1]) else { return false }
      right = parsedRight
    } else {
      right = []
    }
    let count = left.count + right.count
    if sections.count == 1 {
      guard count == 8 else { return false }
    } else {
      guard count < 8 else { return false }
    }
    guard let first = left.first ?? right.first, let firstValue = Int(first, radix: 16) else { return false }
    return (firstValue & 0xfe00) == 0xfc00 || (firstValue & 0xffc0) == 0xfe80
  }
}
