import { StrictMode, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
	Search,
	AppWindow,
	Calculator,
	Globe,
	Folder,
	File,
	FileText,
	FileCode,
	FileImage,
	FileAudio,
	FileVideo,
	FileArchive,
	Lock,
	Moon,
	RotateCw,
	Power,
	Camera,
	Trash2,
	Activity,
	Terminal,
	Settings,
	X,
	Sliders,
	Monitor,
	Volume2,
	Wifi,
	Bluetooth,
	HardDrive,
	Cpu,
	LogOut,
	Shield,
	RefreshCw,
	Wrench,
	Layers
} from "lucide-react";
import { initTheme } from "./theme";
import { useSettingsSync } from "./hooks/useSettingsSync";
import { getSpotlightStyles } from "./spotlightTheme";
import "./Launcher.css";

interface AppInfo {
	name: string;
	path: string;
	icon?: string | null;
	executable?: string | null;
}

interface LauncherFileItem {
	name: string;
	path: string;
	is_dir: boolean;
	ext?: string | null;
}

export type SystemCategory = "tool" | "setting" | "action";

export interface SystemCommand {
	id: string;
	name: string;
	description: string;
	category: SystemCategory;
	keywords: string[];
	icon:
		| "lock"
		| "moon"
		| "rotate-cw"
		| "power"
		| "camera"
		| "trash"
		| "activity"
		| "terminal"
		| "settings"
		| "sliders"
		| "monitor"
		| "volume"
		| "wifi"
		| "bluetooth"
		| "hard-drive"
		| "cpu"
		| "log-out"
		| "shield"
		| "refresh"
		| "wrench"
		| "layers";
}

const SYSTEM_COMMANDS: SystemCommand[] = [
	// Windows Tools (V-Notch Catalog)
	{
		id: "task-manager",
		name: "Task Manager",
		description: "View running processes and system performance (Ctrl+Shift+Esc)",
		category: "tool",
		keywords: ["task manager", "taskmgr", "processes", "performance", "cpu", "ram", "kill process"],
		icon: "activity"
	},
	{
		id: "registry",
		name: "Registry Editor",
		description: "View and edit Windows registry keys and configurations (regedit)",
		category: "tool",
		keywords: ["registry", "regedit", "registry editor", "keys", "system config"],
		icon: "wrench"
	},
	{
		id: "resource-monitor",
		name: "Resource Monitor",
		description: "Real-time monitoring of CPU, Memory, Disk, and Network (resmon)",
		category: "tool",
		keywords: ["resource monitor", "resmon", "performance", "hardware", "cpu", "network"],
		icon: "cpu"
	},
	{
		id: "control-panel",
		name: "Control Panel",
		description: "Classic Windows Control Panel and administrative tools",
		category: "tool",
		keywords: ["control panel", "control", "legacy settings", "admin tools"],
		icon: "sliders"
	},
	{
		id: "device-manager",
		name: "Device Manager",
		description: "Manage connected hardware, drivers, and peripheral devices (devmgmt)",
		category: "tool",
		keywords: ["device manager", "devmgmt", "drivers", "hardware", "usb", "graphics card"],
		icon: "layers"
	},
	{
		id: "disk-manager",
		name: "Disk Management",
		description: "Create, format, and resize disk partitions and drives (diskmgmt)",
		category: "tool",
		keywords: ["disk management", "diskmgmt", "partition", "drives", "ssd", "hard drive"],
		icon: "hard-drive"
	},
	{
		id: "services",
		name: "Services",
		description: "Inspect and manage Windows background system services",
		category: "tool",
		keywords: ["services", "services.msc", "background processes", "daemons"],
		icon: "refresh"
	},
	{
		id: "event-viewer",
		name: "Event Viewer",
		description: "View Windows diagnostic event logs and system errors (eventvwr)",
		category: "tool",
		keywords: ["event viewer", "eventvwr", "event logs", "crash reports", "diagnostics"],
		icon: "activity"
	},
	{
		id: "remote-desktop",
		name: "Remote Desktop Connection",
		description: "Connect to and control a remote Windows computer (mstsc)",
		category: "tool",
		keywords: ["remote desktop", "mstsc", "rdp", "remote pc", "remote connection"],
		icon: "monitor"
	},
	{
		id: "terminal",
		name: "Command Prompt / Terminal",
		description: "Open command-line interface or Windows PowerShell",
		category: "tool",
		keywords: ["terminal", "cmd", "command prompt", "powershell", "shell", "bash"],
		icon: "terminal"
	},

	// Windows Settings Deep Links (V-Notch Catalog)
	{
		id: "windows-settings",
		name: "Windows Settings",
		description: "Open main Windows Settings application",
		category: "setting",
		keywords: ["settings", "windows settings", "system settings", "preferences", "config"],
		icon: "settings"
	},
	{
		id: "ms-settings:display",
		name: "Display Settings",
		description: "Configure display resolution, scale, multi-monitors, and HDR",
		category: "setting",
		keywords: ["display", "screen", "resolution", "monitors", "brightness", "hdr", "scaling"],
		icon: "monitor"
	},
	{
		id: "ms-settings:sound",
		name: "Sound Settings",
		description: "Choose output device, system volume, and microphone levels",
		category: "setting",
		keywords: ["sound", "audio", "volume", "speakers", "microphone", "headphones"],
		icon: "volume"
	},
	{
		id: "ms-settings:bluetooth",
		name: "Bluetooth & Devices",
		description: "Pair Bluetooth headphones, mouse, keyboard, and peripherals",
		category: "setting",
		keywords: ["bluetooth", "pair", "devices", "wireless", "headphones", "mouse"],
		icon: "bluetooth"
	},
	{
		id: "ms-settings:network-wifi",
		name: "Wi-Fi Settings",
		description: "Manage wireless Wi-Fi networks and connection properties",
		category: "setting",
		keywords: ["wifi", "wi-fi", "wireless", "internet", "wlan", "hotspot"],
		icon: "wifi"
	},
	{
		id: "ms-settings:network-status",
		name: "Network & Internet",
		description: "View Ethernet, IP configuration, and connection status",
		category: "setting",
		keywords: ["network", "internet", "ethernet", "ip address", "lan", "connection"],
		icon: "wifi"
	},
	{
		id: "ms-settings:network-vpn",
		name: "VPN Settings",
		description: "Set up and connect to Virtual Private Networks",
		category: "setting",
		keywords: ["vpn", "proxy", "virtual private network", "tunnel"],
		icon: "shield"
	},
	{
		id: "ms-settings:appsfeatures",
		name: "Installed Apps",
		description: "View and uninstall installed applications and features",
		category: "setting",
		keywords: ["installed apps", "apps", "uninstall", "programs", "installed software"],
		icon: "layers"
	},
	{
		id: "ms-settings:defaultapps",
		name: "Default Apps",
		description: "Choose default browser, mail client, and media players",
		category: "setting",
		keywords: ["default apps", "default browser", "file associations", "default player"],
		icon: "settings"
	},
	{
		id: "ms-settings:startupapps",
		name: "Startup Apps",
		description: "Manage applications that start automatically with Windows",
		category: "setting",
		keywords: ["startup apps", "startup", "boot apps", "autostart", "start on boot"],
		icon: "activity"
	},
	{
		id: "ms-settings:storagesense",
		name: "Storage & Cleanup",
		description: "View drive space usage, temporary files, and cleanup recommendations",
		category: "setting",
		keywords: ["storage", "disk space", "cleanup", "temp files", "cache", "free up space"],
		icon: "hard-drive"
	},
	{
		id: "ms-settings:powersleep",
		name: "Power & Battery",
		description: "Sleep timer, screen timeout, and energy saver modes",
		category: "setting",
		keywords: ["power", "sleep", "battery", "energy saver", "screen timeout"],
		icon: "moon"
	},
	{
		id: "ms-settings:notifications",
		name: "Notifications & Focus",
		description: "Manage notification banners, alerts, and Do Not Disturb",
		category: "setting",
		keywords: ["notifications", "focus", "do not disturb", "alerts", "banners"],
		icon: "sliders"
	},
	{
		id: "ms-settings:personalization",
		name: "Personalization",
		description: "Desktop wallpapers, accent colors, and dark mode themes",
		category: "setting",
		keywords: ["personalization", "wallpaper", "theme", "colors", "dark mode", "accent"],
		icon: "sliders"
	},
	{
		id: "ms-settings:taskbar",
		name: "Taskbar Settings",
		description: "Taskbar alignment, auto-hide, and system tray corner overflow",
		category: "setting",
		keywords: ["taskbar", "taskbar icons", "tray", "system tray", "auto-hide"],
		icon: "layers"
	},
	{
		id: "ms-settings:dateandtime",
		name: "Date & Time",
		description: "Configure time zone, automatic clock synchronization, and regional calendar",
		category: "setting",
		keywords: ["date", "time", "clock", "timezone", "time zone", "sync clock"],
		icon: "activity"
	},
	{
		id: "ms-settings:regionlanguage",
		name: "Language & Region",
		description: "Set Windows display language, typing layouts, and region formats",
		category: "setting",
		keywords: ["language", "region", "keyboard layout", "input language", "speech"],
		icon: "globe" as any
	},
	{
		id: "ms-settings:yourinfo",
		name: "Accounts & Profile",
		description: "Manage your Microsoft account, profile avatar, and sign-in credentials",
		category: "setting",
		keywords: ["accounts", "profile", "microsoft account", "user", "login info"],
		icon: "settings"
	},
	{
		id: "ms-settings:privacy",
		name: "Privacy & Security",
		description: "App permissions for camera, microphone, location, and Windows Security",
		category: "setting",
		keywords: ["privacy", "security", "permissions", "camera access", "microphone", "location"],
		icon: "shield"
	},
	{
		id: "ms-settings:windowsupdate",
		name: "Windows Update",
		description: "Check for the latest Windows patches, security updates, and optional drivers",
		category: "setting",
		keywords: ["windows update", "updates", "check for updates", "patch", "upgrade"],
		icon: "refresh"
	},
	{
		id: "ms-settings:recovery",
		name: "Recovery Options",
		description: "Reset this PC, advanced startup boot options, or restore previous build",
		category: "setting",
		keywords: ["recovery", "reset pc", "troubleshoot", "reinstall", "advanced startup"],
		icon: "rotate-cw"
	},
	{
		id: "ms-settings:about",
		name: "About This PC",
		description: "View processor, RAM, Windows edition, and device name details",
		category: "setting",
		keywords: ["about", "about pc", "device specs", "system specs", "windows version", "ram", "cpu"],
		icon: "monitor"
	},

	// System Actions (V-Notch Catalog)
	{
		id: "lock",
		name: "Lock Screen",
		description: "Immediately lock your computer (Win+L)",
		category: "action",
		keywords: ["lock", "lockscreen", "screen lock", "lock pc"],
		icon: "lock"
	},
	{
		id: "sleep",
		name: "Sleep",
		description: "Put computer into low-power sleep state",
		category: "action",
		keywords: ["sleep", "suspend", "standby"],
		icon: "moon"
	},
	{
		id: "restart",
		name: "Restart Computer",
		description: "Safely reboot Windows",
		category: "action",
		keywords: ["restart", "reboot", "restart pc", "reset"],
		icon: "rotate-cw"
	},
	{
		id: "shutdown",
		name: "Shut Down",
		description: "Safely turn off computer",
		category: "action",
		keywords: ["shutdown", "shut down", "power off", "turn off"],
		icon: "power"
	},
	{
		id: "sign-out",
		name: "Sign Out",
		description: "Sign out of your active Windows user account",
		category: "action",
		keywords: ["sign out", "signout", "logout", "log out", "logoff"],
		icon: "log-out"
	},
	{
		id: "hibernate",
		name: "Hibernate",
		description: "Save active session to disk and power down",
		category: "action",
		keywords: ["hibernate", "deep sleep"],
		icon: "moon"
	},
	{
		id: "screenshot",
		name: "Take Screenshot",
		description: "Open Windows Snipping Tool capture (Win+Shift+S)",
		category: "action",
		keywords: ["screenshot", "snip", "snipping tool", "screen capture", "screen clip"],
		icon: "camera"
	},
	{
		id: "empty-recycle-bin",
		name: "Empty Recycle Bin",
		description: "Permanently delete files in Recycle Bin",
		category: "action",
		keywords: ["empty recycle bin", "empty trash", "clean trash", "clear bin"],
		icon: "trash"
	},
	{
		id: "recycle-bin",
		name: "Open Recycle Bin",
		description: "View and restore deleted files",
		category: "action",
		keywords: ["recycle bin", "trash", "rubbish bin"],
		icon: "trash"
	},
	{
		id: "drift-settings",
		name: "Drift Settings",
		description: "Configure Notch, Dock, and Spotlight preferences",
		category: "action",
		keywords: ["drift settings", "notch settings", "dock settings", "preferences"],
		icon: "settings"
	}
];

type LauncherResultItem =
	| { type: "system"; cmd: SystemCommand }
	| { type: "app"; app: AppInfo }
	| { type: "file"; file: LauncherFileItem }
	| { type: "calc"; expression: string; result: string }
	| { type: "url"; url: string; label: string }
	| { type: "web"; query: string; url: string };

// In-memory icon cache for rendered visible results (cached in JS memory)
const iconMemoryCache = new Map<string, string>();

/**
 * Returns a styled Lucide icon based on file extension and directory status
 */
function renderFileIcon(ext?: string | null, isDir?: boolean) {
	if (isDir) {
		return <Folder size={16} className="launcher-file-icon-dir" />;
	}
	const e = ext?.toLowerCase();
	switch (e) {
		case "txt":
		case "md":
		case "pdf":
		case "doc":
		case "docx":
		case "rtf":
		case "odt":
		case "xls":
		case "xlsx":
		case "ppt":
		case "pptx":
		case "csv":
			return <FileText size={16} className="launcher-file-icon-doc" />;
		case "ts":
		case "tsx":
		case "js":
		case "jsx":
		case "rs":
		case "py":
		case "c":
		case "cpp":
		case "h":
		case "json":
		case "html":
		case "css":
		case "scss":
		case "xml":
		case "yaml":
		case "yml":
		case "sql":
			return <FileCode size={16} className="launcher-file-icon-code" />;
		case "png":
		case "jpg":
		case "jpeg":
		case "gif":
		case "webp":
		case "svg":
		case "ico":
		case "bmp":
			return <FileImage size={16} className="launcher-file-icon-img" />;
		case "mp3":
		case "wav":
		case "flac":
		case "aac":
		case "ogg":
		case "m4a":
			return <FileAudio size={16} className="launcher-file-icon-audio" />;
		case "mp4":
		case "mkv":
		case "mov":
		case "avi":
		case "webm":
			return <FileVideo size={16} className="launcher-file-icon-video" />;
		case "zip":
		case "rar":
		case "7z":
		case "tar":
		case "gz":
			return <FileArchive size={16} className="launcher-file-icon-archive" />;
		default:
			return <File size={16} className="launcher-file-icon-generic" />;
	}
}

function renderSystemIcon(icon: SystemCommand["icon"]) {
	switch (icon) {
		case "lock":
			return <Lock size={16} />;
		case "moon":
			return <Moon size={16} />;
		case "rotate-cw":
			return <RotateCw size={16} />;
		case "power":
			return <Power size={16} />;
		case "camera":
			return <Camera size={16} />;
		case "trash":
			return <Trash2 size={16} />;
		case "activity":
			return <Activity size={16} />;
		case "terminal":
			return <Terminal size={16} />;
		case "settings":
			return <Settings size={16} />;
		case "sliders":
			return <Sliders size={16} />;
		case "monitor":
			return <Monitor size={16} />;
		case "volume":
			return <Volume2 size={16} />;
		case "wifi":
			return <Wifi size={16} />;
		case "bluetooth":
			return <Bluetooth size={16} />;
		case "hard-drive":
			return <HardDrive size={16} />;
		case "cpu":
			return <Cpu size={16} />;
		case "log-out":
			return <LogOut size={16} />;
		case "shield":
			return <Shield size={16} />;
		case "refresh":
			return <RefreshCw size={16} />;
		case "wrench":
			return <Wrench size={16} />;
		case "layers":
			return <Layers size={16} />;
		default:
			return <Settings size={16} />;
	}
}

/**
 * Ultra-safe and instant math evaluator (runs in 0.001ms, 0 disk/network cost)
 */
function evaluateMathExpression(raw: string): string | null {
	const sanitized = raw.replace(/\s+/g, "");
	if (!/[0-9]/.test(sanitized) || !/[\+\-\*\/\%\^]/.test(sanitized)) {
		return null;
	}
	if (!/^[0-9\+\-\*\/\.\(\)\%\^]+$/.test(sanitized)) {
		return null;
	}

	try {
		const expr = sanitized.replace(/\^/g, "**");
		const fn = new Function(`"use strict"; return (${expr});`);
		const val = fn();
		if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
			const formatted = Math.round(val * 100000000) / 100000000;
			return String(formatted);
		}
	} catch {
		return null;
	}
	return null;
}

/**
 * Checks if query looks like a domain name (e.g. google.com, github.com)
 */
function isDomainOrUrl(raw: string): string | null {
	const trimmed = raw.trim();
	if (trimmed.includes(" ") || trimmed.length < 4) return null;

	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return trimmed;
	}

	if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
		return `https://${trimmed}`;
	}

	return null;
}

function LauncherApp() {
	const [apps, setApps] = useState<AppInfo[]>([]);
	const [files, setFiles] = useState<LauncherFileItem[]>([]);
	const [query, setQuery] = useState("");
	const [expanded, setExpanded] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [icons, setIcons] = useState<Record<string, string>>({});
	const [isClosing, setIsClosing] = useState(false);
	const [animationSeq, setAnimationSeq] = useState(1);
	const inputRef = useRef<HTMLInputElement>(null);
	const resultsRef = useRef<HTMLDivElement>(null);
	const requestedIconsRef = useRef<Set<string>>(new Set());
	const shownAtRef = useRef<number>(0);
	const queryRef = useRef("");
	queryRef.current = query;

	// Spotlight dynamic settings
	const [spotlightGlassEnabled, setSpotlightGlassEnabled] = useState<boolean>(
		() => localStorage.getItem("drift-spotlight-glass-enabled") !== "false"
	);
	const [spotlightPreset, setSpotlightPreset] = useState<string>(
		() => localStorage.getItem("drift-spotlight-preset") || "frosted"
	);
	const [spotlightOpacity, setSpotlightOpacity] = useState<number>(() => {
		const val = localStorage.getItem("drift-spotlight-opacity");
		return val !== null ? parseFloat(val) : 0.82;
	});
	const [spotlightBlur, setSpotlightBlur] = useState<number>(() => {
		const val = localStorage.getItem("drift-spotlight-blur");
		return val !== null ? parseInt(val) : 28;
	});
	const [spotlightMaxResults, setSpotlightMaxResults] = useState<number>(() => {
		const val = localStorage.getItem("drift-spotlight-max-results");
		return val !== null ? parseInt(val) : 8;
	});
	const [spotlightBgImage, setSpotlightBgImage] = useState<string>(
		() => localStorage.getItem("drift-spotlight-bg-image") || ""
	);
	const [spotlightEnableFiles, setSpotlightEnableFiles] = useState<boolean>(
		() => localStorage.getItem("drift-spotlight-enable-files") !== "false"
	);
	const [spotlightEnableCommands, setSpotlightEnableCommands] = useState<boolean>(
		() => localStorage.getItem("drift-spotlight-enable-commands") !== "false"
	);
	const [spotlightEnableCalc, setSpotlightEnableCalc] = useState<boolean>(
		() => localStorage.getItem("drift-spotlight-enable-calc") !== "false"
	);
	const [spotlightEnableWeb, setSpotlightEnableWeb] = useState<boolean>(
		() => localStorage.getItem("drift-spotlight-enable-web") !== "false"
	);

	useSettingsSync({
		"drift-spotlight-glass-enabled": (v) => setSpotlightGlassEnabled(Boolean(v)),
		"drift-spotlight-preset": (v) => setSpotlightPreset(String(v || "frosted")),
		"drift-spotlight-opacity": (v) => setSpotlightOpacity(typeof v === "number" ? v : parseFloat(v)),
		"drift-spotlight-blur": (v) => setSpotlightBlur(typeof v === "number" ? v : parseInt(v)),
		"drift-spotlight-max-results": (v) => setSpotlightMaxResults(typeof v === "number" ? v : parseInt(v)),
		"drift-spotlight-bg-image": (v) => setSpotlightBgImage(String(v || "")),
		"drift-spotlight-enable-files": (v) => setSpotlightEnableFiles(Boolean(v)),
		"drift-spotlight-enable-commands": (v) => setSpotlightEnableCommands(Boolean(v)),
		"drift-spotlight-enable-calc": (v) => setSpotlightEnableCalc(Boolean(v)),
		"drift-spotlight-enable-web": (v) => setSpotlightEnableWeb(Boolean(v)),
	});

	// Smooth dismissal animation (V-Notch Apple cubic spline exit)
	const dismissLauncher = useCallback(() => {
		if (isClosing) return;
		setIsClosing(true);
		setTimeout(() => {
			invoke("hide_launcher").catch(() => {});
			setIsClosing(false);
			setQuery("");
			setFiles([]);
			setExpanded(false);
		}, 140);
	}, [isClosing]);

	// Synchronously re-read all settings from localStorage (ensures instant update even if webview was suspended)
	const reloadSpotlightSettings = useCallback(() => {
		const ge = localStorage.getItem("drift-spotlight-glass-enabled");
		if (ge !== null) setSpotlightGlassEnabled(ge !== "false");
		const pr = localStorage.getItem("drift-spotlight-preset");
		if (pr) setSpotlightPreset(pr);
		const op = localStorage.getItem("drift-spotlight-opacity");
		if (op !== null) setSpotlightOpacity(parseFloat(op));
		const bl = localStorage.getItem("drift-spotlight-blur");
		if (bl !== null) setSpotlightBlur(parseInt(bl));
		const mx = localStorage.getItem("drift-spotlight-max-results");
		if (mx !== null) setSpotlightMaxResults(parseInt(mx));
		const bg = localStorage.getItem("drift-spotlight-bg-image");
		setSpotlightBgImage(bg || "");
		const ef = localStorage.getItem("drift-spotlight-enable-files");
		if (ef !== null) setSpotlightEnableFiles(ef !== "false");
		const ec = localStorage.getItem("drift-spotlight-enable-commands");
		if (ec !== null) setSpotlightEnableCommands(ec !== "false");
		const ea = localStorage.getItem("drift-spotlight-enable-calc");
		if (ea !== null) setSpotlightEnableCalc(ea !== "false");
		const ew = localStorage.getItem("drift-spotlight-enable-web");
		if (ew !== null) setSpotlightEnableWeb(ew !== "false");
	}, []);

	// Load installed apps from backend in-memory cache
	const refreshApps = useCallback(() => {
		invoke<AppInfo[]>("get_launcher_apps")
			.then((list) => {
				setApps(list || []);
			})
			.catch(console.error);
	}, []);

	// Initialize theme & listen for launcher-shown and launcher-hidden events
	useEffect(() => {
		const cleanupTheme = initTheme();
		reloadSpotlightSettings();

		const unlistenShownPromise = listen("launcher-shown", () => {
			shownAtRef.current = Date.now();
			reloadSpotlightSettings();
			setAnimationSeq((seq) => seq + 1);
			setIsClosing(false);
			setQuery("");
			setExpanded(false);
			setFiles([]);
			setSelectedIndex(0);
			refreshApps();
			setTimeout(() => {
				inputRef.current?.focus();
				inputRef.current?.select();
			}, 30);
		});

		const unlistenHiddenPromise = listen("launcher-hidden", () => {
			setIsClosing(false);
			setQuery("");
			setExpanded(false);
			setFiles([]);
		});

		// Hide on blur / focus loss & free search memory
		const handleBlur = () => {
			if (Date.now() - shownAtRef.current < 350) {
				return;
			}
			dismissLauncher();
		};

		// Disable right-click context menu (no inspect element)
		const handleContextMenu = (e: MouseEvent) => {
			e.preventDefault();
		};

		// Alt+Space and Escape key handling at window level (V-Notch behavior)
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				if (queryRef.current.trim().length > 0) {
					setQuery("");
					setSelectedIndex(0);
				} else {
					dismissLauncher();
				}
			} else if (e.altKey && (e.code === "Space" || e.key === " ")) {
				e.preventDefault();
				dismissLauncher();
			}
		};

		window.addEventListener("contextmenu", handleContextMenu);
		window.addEventListener("keydown", handleGlobalKeyDown);
		window.addEventListener("blur", handleBlur);
		window.addEventListener("focus", reloadSpotlightSettings);
		window.addEventListener("storage", reloadSpotlightSettings);

		return () => {
			cleanupTheme();
			unlistenShownPromise.then((fn) => fn());
			unlistenHiddenPromise.then((fn) => fn());
			window.removeEventListener("contextmenu", handleContextMenu);
			window.removeEventListener("keydown", handleGlobalKeyDown);
			window.removeEventListener("blur", handleBlur);
			window.removeEventListener("focus", reloadSpotlightSettings);
			window.removeEventListener("storage", reloadSpotlightSettings);
		};
	}, [dismissLauncher, refreshApps, reloadSpotlightSettings]);

	// Fast on-demand file search (debounced by 120ms to keep CPU near-zero)
	useEffect(() => {
		if (!spotlightEnableFiles) {
			setFiles([]);
			return;
		}
		const q = query.trim();
		if (q.length < 2) {
			setFiles([]);
			return;
		}

		let active = true;
		const timer = setTimeout(() => {
			invoke<LauncherFileItem[]>("search_user_files", { query: q })
				.then((res) => {
					if (active) {
						setFiles(res || []);
					}
				})
				.catch(() => {});
		}, 120);

		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [query, spotlightEnableFiles]);

	// Combined launcher results: Calculator -> Direct URL -> System Commands -> Apps -> Files -> Web
	const results = useMemo<LauncherResultItem[]>(() => {
		const q = query.trim();
		const items: LauncherResultItem[] = [];

		if (!q) {
			return apps.slice(0, 30).map((app) => ({ type: "app", app }));
		}

		// 1. Math evaluation check
		const calcResult = spotlightEnableCalc ? evaluateMathExpression(q) : null;
		if (calcResult !== null) {
			items.push({ type: "calc", expression: q, result: calcResult });
		}

		// 2. Direct URL or domain check
		const urlTarget = isDomainOrUrl(q);
		if (urlTarget) {
			items.push({ type: "url", url: urlTarget, label: `Open ${urlTarget}` });
		}

		// 3. System & Power Commands matching query
		const qLower = q.toLowerCase();
		if (spotlightEnableCommands) {
			const matchedCmds = SYSTEM_COMMANDS.filter((cmd) => {
				if (cmd.name.toLowerCase().includes(qLower)) return true;
				return cmd.keywords.some((k) => k.includes(qLower));
			});
			for (const cmd of matchedCmds) {
				items.push({ type: "system", cmd });
			}
		}

		// 4. Filter apps from memory cache
		const appMatches: { app: AppInfo; score: number }[] = [];
		for (const app of apps) {
			const nameLower = app.name.toLowerCase();
			if (nameLower.startsWith(qLower)) {
				appMatches.push({ app, score: 2 });
			} else if (nameLower.includes(qLower)) {
				appMatches.push({ app, score: 1 });
			}
		}

		appMatches.sort((a, b) => b.score - a.score || a.app.name.localeCompare(b.app.name));
		for (const m of appMatches.slice(0, 20)) {
			items.push({ type: "app", app: m.app });
		}

		// 5. File search matches
		if (spotlightEnableFiles) {
			for (const file of files) {
				items.push({ type: "file", file });
			}
		}

		// 6. Fallback search on Google if query is typed
		if (spotlightEnableWeb && q.length > 1 && !calcResult && !urlTarget) {
			items.push({
				type: "web",
				query: q,
				url: `https://www.google.com/search?q=${encodeURIComponent(q)}`
			});
		}

		return items;
	}, [apps, files, query, spotlightEnableCalc, spotlightEnableCommands, spotlightEnableFiles, spotlightEnableWeb]);

	// Slice results based on user's maxResults setting
	const displayResults = useMemo(() => {
		return results.slice(0, spotlightMaxResults);
	}, [results, spotlightMaxResults]);

	// Dynamic styling based on glassEnabled, preset, opacity, blur, results count and custom background image
	const { panelStyle, inputStyle } = useMemo(() => {
		return getSpotlightStyles(
			spotlightPreset,
			spotlightOpacity,
			spotlightBlur,
			0,
			spotlightBgImage,
			spotlightMaxResults,
			spotlightGlassEnabled
		);
	}, [spotlightPreset, spotlightOpacity, spotlightBlur, spotlightBgImage, spotlightMaxResults, spotlightGlassEnabled]);

	// Reset selected index when query changes
	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	// Ensure selected item is scrolled into view
	useEffect(() => {
		if (resultsRef.current) {
			const container = resultsRef.current;
			const selectedEl = container.children[selectedIndex] as HTMLElement | undefined;
			if (selectedEl) {
				const top = selectedEl.offsetTop;
				const bottom = top + selectedEl.offsetHeight;
				if (top < container.scrollTop) {
					container.scrollTop = top;
				} else if (bottom > container.scrollTop + container.clientHeight) {
					container.scrollTop = bottom - container.clientHeight;
				}
			}
		}
	}, [selectedIndex]);

	// Lazy load icons only for currently visible app results (no infinite render loop)
	useEffect(() => {
		const visibleAppPaths = displayResults
			.filter((r): r is { type: "app"; app: AppInfo } => r.type === "app")
			.slice(0, 15)
			.map((a) => a.app.path);

		let mounted = true;

		for (const path of visibleAppPaths) {
			if (iconMemoryCache.has(path)) {
				const cached = iconMemoryCache.get(path)!;
				setIcons((prev) => (prev[path] === cached ? prev : { ...prev, [path]: cached }));
				continue;
			}

			if (requestedIconsRef.current.has(path)) {
				continue;
			}
			requestedIconsRef.current.add(path);

			invoke<string | null>("get_app_icon", { path, name: null, hwnd: null })
				.then((icon) => {
					if (mounted && icon) {
						if (iconMemoryCache.size > 50) {
							const first = iconMemoryCache.keys().next().value;
							if (first) iconMemoryCache.delete(first);
						}
						iconMemoryCache.set(path, icon);
						setIcons((prev) => ({ ...prev, [path]: icon }));
					}
				})
				.catch(() => {});
		}

		return () => {
			mounted = false;
		};
	}, [displayResults]);

	const handleExecute = useCallback((item: LauncherResultItem, reveal = false) => {
		setIsClosing(true);
		setTimeout(() => {
			if (item.type === "system") {
				invoke("execute_system_command", { command: item.cmd.id }).catch(console.error);
			} else if (item.type === "app") {
				invoke("launch_app_and_hide", { path: item.app.path }).catch(console.error);
			} else if (item.type === "file") {
				if (reveal) {
					invoke("reveal_in_explorer", { path: item.file.path }).catch(console.error);
				} else {
					invoke("launch_app_and_hide", { path: item.file.path }).catch(console.error);
				}
			} else if (item.type === "calc") {
				navigator.clipboard.writeText(item.result).catch(() => {});
				invoke("hide_launcher").catch(() => {});
			} else if (item.type === "url" || item.type === "web") {
				invoke("hide_launcher").catch(() => {});
				openUrl(item.url).catch(console.error);
			}
			setIsClosing(false);
		}, 120);
	}, []);

	const hasQuery = query.trim().length > 0;
	const showResults = hasQuery || expanded;

	// Keyboard navigation: ArrowDown, ArrowUp, Enter, Ctrl+Enter, Escape, Alt+Space
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.altKey && (e.code === "Space" || e.key === " ")) {
			e.preventDefault();
			dismissLauncher();
			return;
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (!showResults) {
				setExpanded(true);
				return;
			}
			setSelectedIndex((prev) => (displayResults.length > 0 ? (prev + 1) % displayResults.length : 0));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((prev) =>
				displayResults.length > 0 ? (prev - 1 + displayResults.length) % displayResults.length : 0
			);
		} else if (e.key === "Enter") {
			e.preventDefault();
			const target = displayResults[selectedIndex];
			if (target) {
				handleExecute(target, e.ctrlKey);
			}
		} else if (e.key === "Escape") {
			e.preventDefault();
			if (query.trim().length > 0) {
				setQuery("");
				setSelectedIndex(0);
				return;
			}
			if (showResults && !hasQuery) {
				setExpanded(false);
				return;
			}
			dismissLauncher();
		}
	};

	return (
		<div className="launcher-window" onContextMenu={(e) => e.preventDefault()}>
			<AnimatePresence mode="wait">
				<motion.div
					key={animationSeq}
					initial={{ opacity: 0, scale: 0.94, y: -14 }}
					animate={
						isClosing
							? { opacity: 0, scale: 0.96, y: -8 }
							: { opacity: 1, scale: 1, y: 0 }
					}
					exit={{ opacity: 0, scale: 0.96, y: -8 }}
					transition={{
						duration: isClosing ? 0.14 : 0.24,
						ease: [0.16, 1, 0.3, 1]
					}}
					className={`launcher-panel preset-${spotlightPreset} ${showResults ? "has-results" : "collapsed"}`}
					style={{
						...panelStyle,
						maxHeight: showResults ? panelStyle.maxHeight : "64px"
					}}
				>
					<div className="launcher-input-wrapper" style={inputStyle}>
						<input
							ref={inputRef}
							type="text"
							className="launcher-input"
							placeholder="Search apps, files, or commands..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={handleKeyDown}
							autoFocus
							spellCheck={false}
							autoComplete="off"
						/>
						<div className="launcher-right-controls">
							{hasQuery && (
								<button
									type="button"
									className="launcher-clear-btn"
									onClick={() => {
										setQuery("");
										setSelectedIndex(0);
										inputRef.current?.focus();
									}}
									title="Clear search"
								>
									<X size={12} strokeWidth={2.5} />
								</button>
							)}
							<div
								className="launcher-key-badge"
								onClick={() => {
									if (hasQuery) {
										setQuery("");
										setSelectedIndex(0);
									} else {
										dismissLauncher();
									}
								}}
								title={hasQuery ? "Clear search (Esc)" : "Close Spotlight (Esc)"}
							>
								ESC
							</div>
							<Search
								className="launcher-search-icon-right"
								size={19}
								strokeWidth={2.4}
								onClick={() => {
									if (displayResults.length > 0 && displayResults[selectedIndex]) {
										handleExecute(displayResults[selectedIndex]);
									}
								}}
							/>
						</div>
					</div>

				{showResults && (
					<>
						<div className="launcher-results" ref={resultsRef}>
							{displayResults.length === 0 ? (
								<div className="launcher-empty">
									{hasQuery ? `No results found for "${query.trim()}"` : "No applications found"}
								</div>
							) : (
								displayResults.map((item, index) => {
									const isSelected = index === selectedIndex;

									if (item.type === "system") {
										const badgeLabel =
											item.cmd.category === "tool"
												? "Windows Tool"
												: item.cmd.category === "setting"
													? "Settings"
													: "Action";
										const badgeClass =
											item.cmd.category === "tool"
												? "launcher-badge-tool"
												: item.cmd.category === "setting"
													? "launcher-badge-setting"
													: "launcher-badge-action";
										const iconClass =
											item.cmd.category === "tool"
												? "launcher-system-tool"
												: item.cmd.category === "setting"
													? "launcher-system-setting"
													: "launcher-system-action";

										return (
											<div
												key={`sys-${item.cmd.id}`}
												className={`launcher-item ${isSelected ? "selected" : ""}`}
												onClick={() => handleExecute(item)}
												onMouseEnter={() => setSelectedIndex(index)}
											>
												<div className={`launcher-item-generic-icon ${iconClass}`}>
													{renderSystemIcon(item.cmd.icon)}
												</div>
												<div className="launcher-item-info">
													<span className="launcher-item-name">
														{item.cmd.name}
														<span className={`launcher-badge ${badgeClass}`}>{badgeLabel}</span>
													</span>
													<span className="launcher-item-path">{item.cmd.description}</span>
												</div>
											</div>
										);
									}

									if (item.type === "calc") {
										return (
											<div
												key="calc-result"
												className={`launcher-item ${isSelected ? "selected" : ""}`}
												onClick={() => handleExecute(item)}
												onMouseEnter={() => setSelectedIndex(index)}
											>
												<div className="launcher-item-generic-icon launcher-icon-calc">
													<Calculator size={16} />
												</div>
												<div className="launcher-item-info">
													<span className="launcher-item-name">
														{item.result}
														<span className="launcher-badge launcher-badge-calc">Calculation</span>
													</span>
													<span className="launcher-item-path">
														Press Enter to copy result ({item.expression})
													</span>
												</div>
											</div>
										);
									}

									if (item.type === "url") {
										return (
											<div
												key={`url-${item.url}`}
												className={`launcher-item ${isSelected ? "selected" : ""}`}
												onClick={() => handleExecute(item)}
												onMouseEnter={() => setSelectedIndex(index)}
											>
												<div className="launcher-item-generic-icon launcher-icon-url">
													<Globe size={16} />
												</div>
												<div className="launcher-item-info">
													<span className="launcher-item-name">
														{item.label}
														<span className="launcher-badge launcher-badge-link">Link</span>
													</span>
													<span className="launcher-item-path">{item.url}</span>
												</div>
											</div>
										);
									}

									if (item.type === "file") {
										const badgeText = item.file.is_dir
											? "Folder"
											: item.file.ext
												? item.file.ext.toUpperCase()
												: "File";
										return (
											<div
												key={`file-${item.file.path}`}
												className={`launcher-item ${isSelected ? "selected" : ""}`}
												onClick={() => handleExecute(item)}
												onMouseEnter={() => setSelectedIndex(index)}
											>
												<div className="launcher-item-generic-icon">
													{renderFileIcon(item.file.ext, item.file.is_dir)}
												</div>
												<div className="launcher-item-info">
													<span className="launcher-item-name">
														{item.file.name}
														<span className="launcher-badge launcher-badge-file">{badgeText}</span>
													</span>
													<span className="launcher-item-path">{item.file.path}</span>
												</div>
											</div>
										);
									}

									if (item.type === "app") {
										const iconSrc = icons[item.app.path];
										return (
											<div
												key={item.app.path}
												className={`launcher-item ${isSelected ? "selected" : ""}`}
												onClick={() => handleExecute(item)}
												onMouseEnter={() => setSelectedIndex(index)}
											>
												{iconSrc ? (
													<img src={iconSrc} alt="" className="launcher-item-icon" />
												) : (
													<div className="launcher-item-generic-icon launcher-icon-app">
														<AppWindow size={16} />
													</div>
												)}
												<div className="launcher-item-info">
													<span className="launcher-item-name">
														{item.app.name}
														<span className="launcher-badge launcher-badge-app">Application</span>
													</span>
													<span className="launcher-item-path">{item.app.path}</span>
												</div>
											</div>
										);
									}

									// Web item
									return (
										<div
											key={`web-${item.query}`}
											className={`launcher-item ${isSelected ? "selected" : ""}`}
											onClick={() => handleExecute(item)}
											onMouseEnter={() => setSelectedIndex(index)}
										>
											<div className="launcher-item-generic-icon launcher-icon-web">
												<Globe size={16} />
											</div>
											<div className="launcher-item-info">
												<span className="launcher-item-name">
													Search &quot;{item.query}&quot; on Web
													<span className="launcher-badge launcher-badge-web">Google</span>
												</span>
												<span className="launcher-item-path">Press Enter to open in browser</span>
											</div>
										</div>
									);
								})
							)}
						</div>

						<div className="launcher-footer">
							<span>Spotlight</span>
							<div className="launcher-shortcuts">
								<span className="launcher-shortcut-hint">
									<kbd className="launcher-kbd">↑↓</kbd> navigate
								</span>
								<span className="launcher-shortcut-hint">
									<kbd className="launcher-kbd">↵</kbd> open
								</span>
								<span className="launcher-shortcut-hint">
									<kbd className="launcher-kbd">ctrl+↵</kbd> reveal
								</span>
								<span className="launcher-shortcut-hint">
									<kbd className="launcher-kbd">esc</kbd> close
								</span>
							</div>
						</div>
					</>
				)}
				</motion.div>
			</AnimatePresence>
		</div>
	);
}

const root = document.getElementById("root");
if (root) {
	createRoot(root).render(
		<StrictMode>
			<LauncherApp />
		</StrictMode>
	);
}
