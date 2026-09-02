use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::{
    error::Error,
    models::{ProbeResult, ScanResult},
};

// ANEMOS-PATCH: keep the command surface coherent for non-mobile compilation.

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<MobileBridge<R>> {
    Ok(MobileBridge(std::marker::PhantomData))
}

pub struct MobileBridge<R: Runtime>(pub std::marker::PhantomData<fn() -> R>);

impl<R: Runtime> MobileBridge<R> {
    pub fn scan_network(&self) -> crate::Result<Vec<ScanResult>> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn cancel_scan(&self) -> crate::Result<()> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn share(&self, _text: Option<String>, _url: Option<String>) -> crate::Result<bool> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn open_link(&self, _url: String) -> crate::Result<bool> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn notify(
        &self,
        _title: String,
        _description: Option<String>,
        _href: Option<String>,
        _kind: Option<String>,
        _require_hidden: bool,
        _generic: bool,
    ) -> crate::Result<bool> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn haptic(&self, _style: String) -> crate::Result<()> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn select_ui(&self, _id: String) -> crate::Result<()> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn get_selected_ui(&self) -> crate::Result<Option<String>> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn get_default_server_url(&self) -> crate::Result<Option<String>> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn read_legacy_settings(&self) -> crate::Result<crate::LegacySettings> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn set_default_server_url(&self, _url: Option<String>) -> crate::Result<()> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn get_chamber_server_url(&self) -> crate::Result<Option<String>> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn set_chamber_server_url(&self, _url: Option<String>) -> crate::Result<()> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }

    pub fn probe_chamber_server_url(&self, _url: String) -> crate::Result<ProbeResult> {
        Err(Error::Message(
            "Mobile bridge is unavailable on this platform".to_string(),
        ))
    }
}
