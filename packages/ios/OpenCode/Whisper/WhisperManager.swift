// SIDELOAD ESCAPE HATCH: WhisperKit disabled — voice input is a no-op. Restore via the WhisperKit SPM dependency when its swift-collections resolution issue is fixed.
import Foundation
import os

private let log = Logger(subsystem: "opencode", category: "WhisperManager")

actor WhisperManager {
  static let shared = WhisperManager()

  init() {}

  func preload() async {
    log.info("preload() skipped — WhisperKit disabled")
  }

  func transcribe(_ audio: [Float]) async -> String {
    log.info("transcribe() skipped — WhisperKit disabled")
    return ""
  }
}
