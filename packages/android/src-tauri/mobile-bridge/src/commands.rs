use tauri::{command, AppHandle, Runtime};

use crate::{MobileBridgeExt, Result};

// ANEMOS-PATCH: expose origin-gated native capabilities to the Chamber bundle.

#[command]
pub(crate) async fn scan_network<R: Runtime>(app: AppHandle<R>) -> Result<Vec<crate::ScanResult>> {
    app.mobile_bridge().scan_network()
}

#[command]
pub(crate) async fn cancel_scan<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.mobile_bridge().cancel_scan()
}

#[command]
pub(crate) async fn share<R: Runtime>(
    app: AppHandle<R>,
    text: Option<String>,
    url: Option<String>,
) -> Result<bool> {
    app.mobile_bridge().share(text, url)
}

#[command]
pub(crate) async fn open_link<R: Runtime>(app: AppHandle<R>, url: String) -> Result<bool> {
    app.mobile_bridge().open_link(url)
}

#[command]
pub(crate) async fn notify<R: Runtime>(
    app: AppHandle<R>,
    title: String,
    description: Option<String>,
    href: Option<String>,
    kind: Option<String>,
    require_hidden: Option<bool>,
    generic: Option<bool>,
) -> Result<bool> {
    app.mobile_bridge().notify(
        title,
        description,
        href,
        kind,
        require_hidden.unwrap_or(false),
        generic.unwrap_or(false),
    )
}

#[command]
pub(crate) async fn haptic<R: Runtime>(app: AppHandle<R>, style: String) -> Result<()> {
    app.mobile_bridge().haptic(style)
}

#[command]
pub(crate) async fn select_ui<R: Runtime>(app: AppHandle<R>, id: String) -> Result<()> {
    app.mobile_bridge().select_ui(id)
}

#[command]
pub(crate) async fn get_selected_ui<R: Runtime>(app: AppHandle<R>) -> Result<Option<String>> {
    app.mobile_bridge().get_selected_ui()
}

#[command]
pub(crate) async fn get_default_server_url<R: Runtime>(app: AppHandle<R>) -> Result<Option<String>> {
    app.mobile_bridge().get_default_server_url()
}

#[command]
pub(crate) async fn read_legacy_settings<R: Runtime>(app: AppHandle<R>) -> Result<crate::LegacySettings> {
    app.mobile_bridge().read_legacy_settings()
}

#[command]
pub(crate) async fn set_default_server_url<R: Runtime>(
    app: AppHandle<R>,
    url: Option<String>,
) -> Result<()> {
    app.mobile_bridge().set_default_server_url(url)
}

#[command]
pub(crate) async fn get_chamber_server_url<R: Runtime>(app: AppHandle<R>) -> Result<Option<String>> {
    app.mobile_bridge().get_chamber_server_url()
}

#[command]
pub(crate) async fn set_chamber_server_url<R: Runtime>(
    app: AppHandle<R>,
    url: Option<String>,
) -> Result<()> {
    app.mobile_bridge().set_chamber_server_url(url)
}

#[command]
pub(crate) async fn probe_chamber_server_url<R: Runtime>(
    app: AppHandle<R>,
    url: String,
) -> Result<crate::ProbeResult> {
    app.mobile_bridge().probe_chamber_server_url(url)
}
