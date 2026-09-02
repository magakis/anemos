use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub host: String,
    pub port: u16,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeResult {
    pub reachable: bool,
    pub status: Option<u16>,
}

// ANEMOS-PATCH: carry the legacy settings needed by the UI 3 migration.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LegacySettings {
    pub default_server_url: Option<String>,
    pub default_server_username: Option<String>,
    pub default_server_password: Option<String>,
}
