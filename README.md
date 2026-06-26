# Anemos

iOS & Android client for [OpenCode](https://github.com/anomalyco/opencode) — true to the OpenCode desktop experience.

## Quick Start

1. Install Anemos:
   - iOS: <!-- TODO: add Anemos App Store link once published --> _Coming soon_
   - Android: <!-- TODO: add Anemos Android release link once published --> _Coming soon_
2. On your dev machine, run:

   ```
   opencode web --hostname 0.0.0.0
   ```

   <img width="816" height="217" alt="Screenshot 2026-02-20 at 11 24 33 PM" src="https://github.com/user-attachments/assets/725e4056-c279-4335-9d05-51fcb987c29f" />

3. The server will output an IP address and port (e.g. `http://192.168.1.x:port`)
4. Add that address to the Anemos app on your iPhone to connect

   <img width="430" height="335" alt="Screenshot 2026-02-20 at 11 27 08 PM" src="https://github.com/user-attachments/assets/368e0e60-8aef-4778-b658-d03c203cd0e4" />

> By default, your phone and dev machine must be on the same network. You can use a VPS or [Tailscale](https://tailscale.com) to connect from anywhere.

## What is this?

Anemos is a mobile client for [OpenCode](https://github.com/anomalyco/opencode) that adds iOS & Android support. It brings the full open-source AI coding agent to your phone & tablet.

## Key features

- **WhisperKit speech-to-text** — voice input for hands-free coding
- **Custom keyboard shortcuts** — adapted for mobile
- **Mobile UI tweaks** — e.g. always-visible search bar
- **Push Notifications** - notifies you whenever your session needs attention.

## Philosophy

Anemos is a mobile port that stays true to the desktop experience. Desktop updates from upstream are regularly synced in; mobile improvements are pushed upstream to benefit desktop users too.

## Privacy

Anemos does not collect, transmit, or store any analytics, telemetry, or personal data. There are no third-party tracking SDKs, no crash reporting services, and no usage metrics of any kind. Your code and conversations stay entirely between your device and your development server.

## Upstream

[OpenCode](https://github.com/anomalyco/opencode)
