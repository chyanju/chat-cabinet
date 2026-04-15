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
        .args(if is_dev { vec!["--dev"] } else { vec![] })
        .current_dir(&server_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("Failed to spawn node: {e}"))?;

    let stdout = child.stdout.take().ok_or("No stdout")?;
    let mut reader = BufReader::new(stdout);
    let mut line = String::new();

    loop {
        line.clear();
        let n = reader.read_line(&mut line).map_err(|e| format!("Read error: {e}"))?;
        if n == 0 {
            break; // EOF
        }
        // server.js prints: "Chat Cabinet running at http://localhost:PORT"
        if let Some(url_part) = line.trim().strip_prefix("Chat Cabinet running at ") {
            if let Some(port_str) = url_part.rsplit(':').next() {
                if let Ok(port) = port_str.parse::<u16>() {
                    // Drain remaining stdout in a background thread to prevent Node from blocking
                    std::thread::spawn(move || {
                        let mut sink = std::io::sink();
                        let _ = std::io::copy(&mut reader, &mut sink);
                    });
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

    let (mut child, port) = match spawn_node_server(is_dev) {
        Ok(result) => result,
        Err(e) => {
            eprintln!("Failed to start backend server: {e}");
            std::process::exit(1);
        }
    };
    let server_url = format!("http://localhost:{}", port);
    let dev_url = format!("http://localhost:5173/?_port={}", port);

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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            let window = app.get_webview_window("main")
                .ok_or_else(|| "no main window".to_string())?;
            let url_str = if is_dev { &dev_url } else { &server_url };
            let parsed_url = url_str.parse()
                .map_err(|e| format!("invalid URL '{url_str}': {e}"))?;
            window.navigate(parsed_url)
                .map_err(|e| format!("failed to navigate: {e}"))?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Chat Cabinet");
}
