use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

// ANEMOS-PATCH: register the Chamber native capability and legacy-settings commands.

mod commands;
mod error;
mod models;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

pub use error::{Error, Result};
pub use models::{LegacySettings, ProbeResult, ScanResult};

#[cfg(desktop)]
pub use desktop::MobileBridge;
#[cfg(mobile)]
pub use mobile::MobileBridge;

pub trait MobileBridgeExt<R: Runtime> {
    fn mobile_bridge(&self) -> &MobileBridge<R>;
}

impl<R: Runtime, T: Manager<R>> crate::MobileBridgeExt<R> for T {
    fn mobile_bridge(&self) -> &MobileBridge<R> {
        self.state::<MobileBridge<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("mobile-bridge")
        .invoke_handler(tauri::generate_handler![
            commands::scan_network,
            commands::cancel_scan,
            commands::share,
            commands::open_link,
            commands::notify,
            commands::haptic,
            commands::select_ui,
            commands::get_selected_ui,
            commands::get_default_server_url,
            commands::read_legacy_settings,
            commands::set_default_server_url,
            commands::get_chamber_server_url,
            commands::set_chamber_server_url,
            commands::probe_chamber_server_url
        ])
        .setup(|app, api| {
            #[cfg(mobile)]
            let bridge = mobile::init(app, api)?;
            #[cfg(desktop)]
            let bridge = desktop::init(app, api)?;
            app.manage(bridge);
            Ok(())
        })
        .build()
}
