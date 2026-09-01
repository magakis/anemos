use tauri::{command, AppHandle, Runtime};

use crate::{MobileBridgeExt, Result};

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
pub(crate) async fn set_default_server_url<R: Runtime>(
    app: AppHandle<R>,
    url: Option<String>,
) -> Result<()> {
    app.mobile_bridge().set_default_server_url(url)
}
