import Foundation

final class ServerConfig {
  private let defaults = UserDefaults.standard
  private let defaultServerKey = "opencode.defaultServerUrl"
  private let chamberServerKey = "opencode.chamberServerUrl"
  private let selectedUIKey = "opencode.selectedUI"
  private let storagePrefix = "opencode.storage."
  static let invalidChamberServerURLMessage = "Enter a valid http:// or https:// URL."

  func getDefaultServerUrl() -> String? {
    defaults.string(forKey: defaultServerKey) ?? storageGet(name: "settings.dat", key: "defaultServerUrl")
  }

  // ANEMOS-PATCH: expose the old settings store to the Chamber migration before
  // the new instance list is written.
  func readLegacySettings() -> [String: String] {
    let keys = ["defaultServerUrl", "defaultServerUsername", "defaultServerPassword"]
    var result = [String: String]()
    for key in keys {
      let value = storageGet(name: "settings.dat", key: key)
        ?? defaults.string(forKey: "opencode.settings.dat:\(key)")
        ?? defaults.string(forKey: key)
      if let value, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        result[key] = value
      }
    }
    return result
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

    guard scheme == "http" || scheme == "https" else { return nil }
    return url
  }
}
