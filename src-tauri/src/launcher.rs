use std::collections::HashSet;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};
use windows::Win32::System::Com::{CoInitializeEx, CoUninitialize, COINIT_MULTITHREADED};
use crate::types::AppInfo;

pub static LAUNCHER_VISIBLE: AtomicBool = AtomicBool::new(false);
pub static LAST_ACTION_MS: AtomicU64 = AtomicU64::new(0);
pub static LAST_SHOWN_MS: AtomicU64 = AtomicU64::new(0);
pub static LAST_HIDE_MS: AtomicU64 = AtomicU64::new(0);

pub fn current_time_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LauncherFileItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub ext: Option<String>,
}

/// Toggles the launcher window: shows and focuses if hidden, hides if visible.
#[tauri::command]
pub fn toggle_launcher(app: AppHandle) {
    let now = current_time_ms();
    let last_action = LAST_ACTION_MS.load(Ordering::SeqCst);
    if now.saturating_sub(last_action) < 220 {
        return;
    }
    LAST_ACTION_MS.store(now, Ordering::SeqCst);

    let Some(win) = app.get_webview_window("launcher") else {
        return;
    };

    let is_visible = if let Ok(hwnd) = win.hwnd() {
        let os_vis = unsafe { windows::Win32::UI::WindowsAndMessaging::IsWindowVisible(hwnd).as_bool() };
        os_vis || LAUNCHER_VISIBLE.load(Ordering::SeqCst)
    } else {
        win.is_visible().unwrap_or(false) || LAUNCHER_VISIBLE.load(Ordering::SeqCst)
    };

    if is_visible {
        // CLOSE
        LAUNCHER_VISIBLE.store(false, Ordering::SeqCst);
        LAST_HIDE_MS.store(now, Ordering::Relaxed);
        if let Ok(hwnd) = win.hwnd() {
            unsafe {
                use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_HIDE};
                let _ = ShowWindow(hwnd, SW_HIDE);
            }
        }
        let _ = win.hide();
        let _ = app.emit_to("launcher", "launcher-hidden", ());
        crate::services::trim_process_working_set();
    } else {
        // OPEN
        LAUNCHER_VISIBLE.store(true, Ordering::SeqCst);
        LAST_SHOWN_MS.store(now, Ordering::Relaxed);
        let _ = win.set_always_on_top(true);
        let _ = win.show();
        let _ = win.set_focus();

        if let Ok(hwnd) = win.hwnd() {
            unsafe {
                use windows::Win32::UI::WindowsAndMessaging::{SetForegroundWindow, ShowWindow, SW_SHOW};
                let _ = ShowWindow(hwnd, SW_SHOW);
                let _ = SetForegroundWindow(hwnd);
            }
        }
        let _ = app.emit_to("launcher", "launcher-shown", ());
    }
}

/// Explicitly hides the launcher window.
#[tauri::command]
pub fn hide_launcher(app: AppHandle) {
    let now = current_time_ms();
    LAST_ACTION_MS.store(now, Ordering::SeqCst);
    LAST_HIDE_MS.store(now, Ordering::Relaxed);
    LAUNCHER_VISIBLE.store(false, Ordering::SeqCst);
    if let Some(win) = app.get_webview_window("launcher") {
        if let Ok(hwnd) = win.hwnd() {
            unsafe {
                use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_HIDE};
                let _ = ShowWindow(hwnd, SW_HIDE);
            }
        }
        let _ = win.hide();
        let _ = app.emit_to("launcher", "launcher-hidden", ());
        crate::services::trim_process_working_set();
    }
}

/// Returns the cached list of installed applications.
/// Reads directly from memory cache (INSTALLED_APPS_CACHE); if empty, triggers background scan once.
#[tauri::command]
pub fn get_launcher_apps() -> Vec<AppInfo> {
    let cache = crate::state::INSTALLED_APPS_CACHE.get_or_init(|| std::sync::Mutex::new(Vec::new()));
    let is_empty = if let Ok(lock) = cache.lock() {
        lock.is_empty()
    } else {
        true
    };

    if is_empty && !crate::state::IS_SCANNING.load(Ordering::Relaxed) {
        crate::services::trigger_app_scan();
    }

    if let Ok(cache_lock) = cache.lock() {
        cache_lock.clone()
    } else {
        Vec::new()
    }
}

/// Launches the selected application or opens the file/folder and dismisses the launcher.
#[tauri::command]
pub async fn launch_app_and_hide(app: AppHandle, path: String) {
    LAST_HIDE_MS.store(current_time_ms(), Ordering::Relaxed);
    if let Some(win) = app.get_webview_window("launcher") {
        let _ = win.hide();
        let _ = app.emit_to("launcher", "launcher-hidden", ());
        LAUNCHER_VISIBLE.store(false, Ordering::Relaxed);
        crate::services::trim_process_working_set();
    }
    tauri::async_runtime::spawn_blocking(move || {
        unsafe {
            use windows::Win32::System::Com::{CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED};
            let com_ok = CoInitializeEx(None, COINIT_APARTMENTTHREADED).is_ok();
            crate::commands::launch_path(&path);
            if com_ok {
                CoUninitialize();
            }
        }
    });
}

/// Reveals the specified file or folder in Windows File Explorer and dismisses the launcher.
#[tauri::command]
pub async fn reveal_in_explorer(app: AppHandle, path: String) {
    LAST_HIDE_MS.store(current_time_ms(), Ordering::Relaxed);
    if let Some(win) = app.get_webview_window("launcher") {
        let _ = win.hide();
        let _ = app.emit_to("launcher", "launcher-hidden", ());
        LAUNCHER_VISIBLE.store(false, Ordering::Relaxed);
        crate::services::trim_process_working_set();
    }
    tauri::async_runtime::spawn_blocking(move || {
        use std::process::Command;
        let clean_path = path.replace('/', "\\");
        let _ = Command::new("explorer.exe")
            .arg(format!("/select,\"{}\"", clean_path))
            .spawn();
    });
}

/// Executes common system/power actions from Spotlight.
#[tauri::command]
pub async fn execute_system_command(app: AppHandle, command: String) -> Result<(), String> {
    LAST_ACTION_MS.store(current_time_ms(), Ordering::SeqCst);
    LAST_HIDE_MS.store(current_time_ms(), Ordering::Relaxed);
    LAUNCHER_VISIBLE.store(false, Ordering::SeqCst);
    if let Some(win) = app.get_webview_window("launcher") {
        if let Ok(hwnd) = win.hwnd() {
            unsafe {
                use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_HIDE};
                let _ = ShowWindow(hwnd, SW_HIDE);
            }
        }
        let _ = win.hide();
        let _ = app.emit_to("launcher", "launcher-hidden", ());
        crate::services::trim_process_working_set();
    }

    tauri::async_runtime::spawn_blocking(move || {
        if command.starts_with("ms-settings:") || command.starts_with("shell:") {
            crate::commands::launch_path(&command);
            return Ok(());
        }

        match command.as_str() {
            "lock" => {
                use std::process::Command;
                let _ = Command::new("rundll32.exe")
                    .args(["user32.dll,LockWorkStation"])
                    .spawn();
            }
            "sleep" => {
                use std::process::Command;
                let _ = Command::new("rundll32.exe")
                    .args(["powrprof.dll,SetSuspendState", "0,1,0"])
                    .spawn();
            }
            "restart" => {
                use std::process::Command;
                let _ = Command::new("shutdown.exe")
                    .args(["/r", "/t", "0"])
                    .spawn();
            }
            "shutdown" => {
                use std::process::Command;
                let _ = Command::new("shutdown.exe")
                    .args(["/s", "/t", "0"])
                    .spawn();
            }
            "sign-out" => {
                use std::process::Command;
                let _ = Command::new("shutdown.exe")
                    .args(["/l"])
                    .spawn();
            }
            "hibernate" => {
                use std::process::Command;
                let _ = Command::new("shutdown.exe")
                    .args(["/h"])
                    .spawn();
            }
            "empty-recycle-bin" => {
                use std::process::Command;
                let _ = Command::new("powershell.exe")
                    .args(["-NoProfile", "-Command", "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"])
                    .spawn();
            }
            "recycle-bin" => {
                crate::commands::launch_path("shell:RecycleBinFolder");
            }
            "screenshot" => {
                crate::commands::launch_path("ms-screenclip:");
            }
            "task-manager" => {
                let _ = crate::commands::open_system_action(crate::commands::SystemAction::TaskManager);
            }
            "control-panel" => {
                let _ = std::process::Command::new("control.exe").spawn();
            }
            "device-manager" => {
                crate::commands::launch_path("devmgmt.msc");
            }
            "disk-manager" => {
                crate::commands::launch_path("diskmgmt.msc");
            }
            "services" => {
                crate::commands::launch_path("services.msc");
            }
            "registry" | "regedit" => {
                let _ = std::process::Command::new("regedit.exe").spawn();
            }
            "resource-monitor" => {
                let _ = std::process::Command::new("resmon.exe").spawn();
            }
            "event-viewer" => {
                crate::commands::launch_path("eventvwr.msc");
            }
            "remote-desktop" => {
                let _ = std::process::Command::new("mstsc.exe").spawn();
            }
            "drift-settings" => {
                crate::commands::open_settings_window(app);
            }
            "windows-settings" => {
                crate::commands::launch_path("ms-settings:");
            }
            "terminal" => {
                if std::process::Command::new("wt.exe").spawn().is_err() {
                    let _ = std::process::Command::new("powershell.exe").spawn();
                }
            }
            _ => {
                crate::commands::launch_path(&command);
            }
        }
        Ok(())
    })
    .await
    .unwrap_or(Ok(()))
}

fn should_skip_dir(name: &str) -> bool {
    let lower = name.to_lowercase();
    name.starts_with('.')
        || name.starts_with('$')
        || lower == "node_modules"
        || lower == "target"
        || lower == "dist"
        || lower == "build"
        || lower == "appdata"
        || lower == ".git"
        || lower == "__pycache__"
        || lower == "env"
        || lower == "venv"
        || lower == "$recycle.bin"
        || lower == "system volume information"
}

fn should_skip_file(name: &str) -> bool {
    let lower = name.to_lowercase();
    name.starts_with('.')
        || lower.ends_with(".tmp")
        || lower.ends_with(".temp")
        || lower.ends_with(".crdownload")
        || lower.ends_with(".part")
        || lower.ends_with(".bak")
        || lower == "desktop.ini"
        || lower == "thumbs.db"
}

fn scan_dir_bounded(
    dir: &Path,
    query_lower: &str,
    current_depth: usize,
    max_depth: usize,
    visited_count: &mut usize,
    max_visited: usize,
    seen_paths: &mut HashSet<String>,
    results: &mut Vec<LauncherFileItem>,
    max_results: usize,
) {
    if current_depth > max_depth || *visited_count >= max_visited || results.len() >= max_results {
        return;
    }

    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        *visited_count += 1;
        if *visited_count >= max_visited || results.len() >= max_results {
            break;
        }

        let file_type = match entry.file_type() {
            Ok(ft) => ft,
            Err(_) => continue,
        };

        let file_name = entry.file_name().to_string_lossy().to_string();
        let path = entry.path();
        let path_str = path.to_string_lossy().to_string();
        let path_key = path_str.to_lowercase();

        if file_type.is_dir() {
            if should_skip_dir(&file_name) {
                continue;
            }
            if file_name.to_lowercase().contains(query_lower) && seen_paths.insert(path_key) {
                results.push(LauncherFileItem {
                    name: file_name.clone(),
                    path: path_str.clone(),
                    is_dir: true,
                    ext: None,
                });
            }
            scan_dir_bounded(
                &path,
                query_lower,
                current_depth + 1,
                max_depth,
                visited_count,
                max_visited,
                seen_paths,
                results,
                max_results,
            );
        } else if file_type.is_file() {
            if should_skip_file(&file_name) {
                continue;
            }
            if file_name.to_lowercase().contains(query_lower) && seen_paths.insert(path_key) {
                let ext = path
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_lowercase());
                results.push(LauncherFileItem {
                    name: file_name,
                    path: path_str,
                    is_dir: false,
                    ext,
                });
            }
        }
    }
}

fn scan_recent_files(
    query_lower: &str,
    seen_paths: &mut HashSet<String>,
    results: &mut Vec<LauncherFileItem>,
    max_results: usize,
) {
    let appdata = match std::env::var("APPDATA") {
        Ok(v) => v,
        Err(_) => return,
    };
    let recent_dir = Path::new(&appdata).join("Microsoft").join("Windows").join("Recent");
    let entries = match std::fs::read_dir(recent_dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        if results.len() >= max_results {
            break;
        }
        let file_name = entry.file_name().to_string_lossy().to_string();
        if !file_name.to_lowercase().ends_with(".lnk") {
            continue;
        }

        let display_name = file_name[..file_name.len() - 4].to_string();
        if !display_name.to_lowercase().contains(query_lower) {
            continue;
        }

        let lnk_path = entry.path().to_string_lossy().to_string();
        if let Some((target, _)) = crate::utils::resolve_shortcut(&lnk_path) {
            let p = Path::new(&target);
            if p.exists() {
                let is_dir = p.is_dir();
                let ext = p.extension().and_then(|s| s.to_str()).map(|s| s.to_lowercase());
                let path_key = target.to_lowercase();
                if seen_paths.insert(path_key) {
                    results.push(LauncherFileItem {
                        name: display_name,
                        path: target,
                        is_dir,
                        ext,
                    });
                }
            }
        }
    }
}

/// Searches user files on demand across recent files and user directories (Desktop, Documents, Downloads, etc.)
/// Runs in a background thread pool, with bounded depth and item limits to guarantee zero CPU/RAM bloat.
#[tauri::command]
pub async fn search_user_files(query: String) -> Vec<LauncherFileItem> {
    let q = query.trim().to_string();
    if q.len() < 2 {
        return Vec::new();
    }

    tauri::async_runtime::spawn_blocking(move || {
        let com_initialized = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED).is_ok() };
        let q_lower = q.to_lowercase();
        let mut results = Vec::new();
        let mut seen_paths = HashSet::new();

        // 1. Check Recent files first (high relevance)
        scan_recent_files(&q_lower, &mut seen_paths, &mut results, 8);

        // 2. Scan core user directories
        let user_profile = std::env::var("USERPROFILE").unwrap_or_default();
        if !user_profile.is_empty() {
            let base_path = Path::new(&user_profile);
            let search_folders = [
                base_path.join("Desktop"),
                base_path.join("Documents"),
                base_path.join("Downloads"),
                base_path.join("Pictures"),
                base_path.join("Videos"),
                base_path.join("Music"),
            ];

            let mut visited = 0;
            let max_visited = 400;
            let max_results = 20;

            for folder in search_folders {
                if visited >= max_visited || results.len() >= max_results {
                    break;
                }
                if folder.is_dir() {
                    scan_dir_bounded(
                        &folder,
                        &q_lower,
                        1,
                        2,
                        &mut visited,
                        max_visited,
                        &mut seen_paths,
                        &mut results,
                        max_results,
                    );
                }
            }
        }

        if com_initialized {
            unsafe {
                CoUninitialize();
            }
        }

        // Prioritize exact or prefix matches
        results.sort_by(|a, b| {
            let a_starts = a.name.to_lowercase().starts_with(&q_lower);
            let b_starts = b.name.to_lowercase().starts_with(&q_lower);
            b_starts.cmp(&a_starts).then_with(|| a.name.cmp(&b.name))
        });

        if results.len() > 15 {
            results.truncate(15);
        }

        results
    })
    .await
    .unwrap_or_default()
}

/// Reads an image file from disk and returns a base64 Data URL for webview rendering.
#[tauri::command]
pub fn read_image_data_url(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("Failed to read image file: {e}"))?;
    if bytes.len() > 15 * 1024 * 1024 {
        return Err("Image file exceeds 15MB limit".to_string());
    }
    let path_lower = path.to_lowercase();
    let mime = if path_lower.ends_with(".png") {
        "image/png"
    } else if path_lower.ends_with(".jpg") || path_lower.ends_with(".jpeg") {
        "image/jpeg"
    } else if path_lower.ends_with(".webp") {
        "image/webp"
    } else if path_lower.ends_with(".gif") {
        "image/gif"
    } else {
        "image/png"
    };
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

