use serde::{de::DeserializeOwned, Serialize};
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::{LegacySettings, ProbeResult, ScanResult};

// ANEMOS-PATCH: forward Chamber capability calls to the origin-gated Android plugin.

const PLUGIN_IDENTIFIER: &str = "ai.opencode.mobilebridge";

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<MobileBridge<R>> {
    let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "MobileBridgePlugin")?;
    Ok(MobileBridge(handle))
}

pub struct MobileBridge<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> MobileBridge<R> {
    pub fn scan_network(&self) -> crate::Result<Vec<ScanResult>> {
        self.0
            .run_mobile_plugin("scanNetwork", ())
            .map_err(Into::into)
    }

    pub fn cancel_scan(&self) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("cancelScan", ())
            .map_err(Into::into)
    }

    pub fn share(&self, text: Option<String>, url: Option<String>) -> crate::Result<bool> {
        self.0
            .run_mobile_plugin("share", SharePayload { text, url })
            .map_err(Into::into)
    }

    pub fn open_link(&self, url: String) -> crate::Result<bool> {
        self.0
            .run_mobile_plugin("openLink", OpenLinkPayload { url })
            .map_err(Into::into)
    }

    pub fn notify(
        &self,
        title: String,
        description: Option<String>,
        href: Option<String>,
        kind: Option<String>,
        require_hidden: bool,
        generic: bool,
    ) -> crate::Result<bool> {
        self.0
            .run_mobile_plugin(
                "notify",
                NotifyPayload {
                    title,
                    description,
                    href,
                    kind,
                    require_hidden,
                    generic,
                },
            )
            .map_err(Into::into)
    }

    pub fn haptic(&self, style: String) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("haptic", HapticPayload { style })
            .map_err(Into::into)
    }

    pub fn select_ui(&self, id: String) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("selectUI", UISelectionPayload { id })
            .map_err(Into::into)
    }

    pub fn get_selected_ui(&self) -> crate::Result<Option<String>> {
        self.0
            .run_mobile_plugin::<SelectedUIResponse, _>("getSelectedUI", ())
            .map(|result| result.id)
            .map_err(Into::into)
    }

    pub fn get_default_server_url(&self) -> crate::Result<Option<String>> {
        self.0
            .run_mobile_plugin::<ServerURLResponse, _>("getDefaultServerUrl", ())
            .map(|result| result.url)
            .map_err(Into::into)
    }

    pub fn read_legacy_settings(&self) -> crate::Result<LegacySettings> {
        self.0
            .run_mobile_plugin("readLegacySettings", ())
            .map_err(Into::into)
    }

    pub fn set_default_server_url(&self, url: Option<String>) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("setDefaultServerUrl", ServerURLPayload { url })
            .map_err(Into::into)
    }

    pub fn get_chamber_server_url(&self) -> crate::Result<Option<String>> {
        self.0
            .run_mobile_plugin::<ServerURLResponse, _>("getChamberServerUrl", ())
            .map(|result| result.url)
            .map_err(Into::into)
    }

    pub fn set_chamber_server_url(&self, url: Option<String>) -> crate::Result<()> {
        self.0
            .run_mobile_plugin("setChamberServerUrl", ServerURLPayload { url })
            .map_err(Into::into)
    }

    pub fn probe_chamber_server_url(&self, url: String) -> crate::Result<ProbeResult> {
        self.0
            .run_mobile_plugin::<ProbeResult, _>("probeChamberServerUrl", ServerURLPayload { url: Some(url) })
            .map_err(Into::into)
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SharePayload {
    text: Option<String>,
    url: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenLinkPayload {
    url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NotifyPayload {
    title: String,
    description: Option<String>,
    href: Option<String>,
    kind: Option<String>,
    require_hidden: bool,
    generic: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HapticPayload {
    style: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UISelectionPayload {
    id: String,
}

#[derive(serde::Deserialize)]
struct SelectedUIResponse {
    id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ServerURLPayload {
    url: Option<String>,
}

#[derive(serde::Deserialize)]
struct ServerURLResponse {
    url: Option<String>,
}
