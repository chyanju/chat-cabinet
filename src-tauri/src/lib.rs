use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

struct ServerProcess(Mutex<Option<Child>>);

impl Drop for ServerProcess {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.0.lock() {
            if let Some(ref mut child) = *guard {
                let _ = child.kill();
            }
        }
    }
}

/// Spawn `node server.js` and wait for the "running at" line to extract the port.
/// In dev mode, use fixed port 3456 so the Vite proxy can reach the backend.
fn spawn_node_server(is_dev: bool) -> Result<(Child, u16), String> {
    let cwd = std::env::current_dir().map_err(|e| format!("Failed to get cwd: {e}"))?;
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()));

    // Search candidates: cwd, cwd/.., exe dir, exe dir/..
    let candidates: Vec<std::path::PathBuf> = [
        Some(cwd.clone()),
        Some(cwd.join("..")),
        exe_dir.clone(),
        exe_dir.map(|d| d.join("..")),
    ]
    .into_iter()
    .flatten()
    .map(|d| d.join("server.js"))
    .collect();

    let server_js = candidates
        .iter()
        .find(|p| p.exists())
        .ok_or_else(|| format!("server.js not found in any of: {:?}", candidates))?
        .clone();

    let server_dir = server_js.parent().unwrap().to_path_buf();

    let port_arg = if is_dev { "3456" } else { "0" };
    let mut child = Command::new("node")
        .arg(&server_js)
        .arg("--port")
        .arg(port_arg)
        .current_dir(&server_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("Failed to spawn node: {e}"))?;

    let stdout = child.stdout.take().ok_or("No stdout")?;
    let reader = BufReader::new(stdout);

    for line in reader.lines() {
        let line = line.map_err(|e| format!("Read error: {e}"))?;
        // server.js prints: "Chat Cabinet running at http://localhost:PORT"
        if let Some(url_part) = line.strip_prefix("Chat Cabinet running at ") {
            if let Some(port_str) = url_part.rsplit(':').next() {
                if let Ok(port) = port_str.parse::<u16>() {
                    return Ok((child, port));
                }
            }
        }
    }

    Err("Node server exited without printing port".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let headless = std::env::args().any(|a| a == "--headless");
    let is_dev = cfg!(debug_assertions);

    let (mut child, port) = spawn_node_server(is_dev).expect("Failed to start backend server");
    let server_url = format!("http://localhost:{}", port);
    let dev_url = "http://localhost:5173".to_string();

    if headless {
        // CLI fallback: no GUI, just keep the Node server running until interrupted.
        eprintln!("Chat Cabinet (headless) — open {server_url} in a browser");
        eprintln!("Press Ctrl+C to stop.");
        let _ = child.wait();
        return;
    }

    tauri::Builder::default()
        .manage(ServerProcess(Mutex::new(Some(child))))
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            let window = app.get_webview_window("main").expect("no main window");
            window
                .navigate(
                    if is_dev { dev_url.parse().unwrap() } else { server_url.parse().unwrap() }
                )
                .expect("failed to navigate to app URL");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Chat Cabinet");
}
