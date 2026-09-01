const COMMANDS: &[&str] = &[
    "check_permissions",
    "request_permissions",
    "register_listener",
    "remove_listener",
    "scan_network",
    "cancel_scan",
    "share",
    "select_ui",
    "get_selected_ui",
    "get_default_server_url",
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
