const COMMANDS: &[&str] = &[
    // ANEMOS-PATCH: generate permissions for the UI 3 native bridge calls.
    "check_permissions",
    "request_permissions",
    "register_listener",
    "remove_listener",
    "scan_network",
    "cancel_scan",
    "share",
    "open_link",
    "notify",
    "haptic",
    "select_ui",
    "get_selected_ui",
    "get_default_server_url",
    "read_legacy_settings",
    "set_default_server_url",
    "get_chamber_server_url",
    "set_chamber_server_url",
    "probe_chamber_server_url",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .try_build()
        .unwrap();
}
