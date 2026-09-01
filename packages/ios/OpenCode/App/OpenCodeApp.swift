import SwiftUI

@main
struct OpenCodeApp: App {
  var body: some Scene {
    WindowGroup {
      ContentView()
        .onOpenURL { url in DeepLinkRelay.shared.push(url) }
    }
  }
}
