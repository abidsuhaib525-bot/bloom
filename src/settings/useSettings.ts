import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { getVersion } from "@tauri-apps/api/app";
import type { UpdateCheckResult } from "../updater";
import { useSettingsSync } from "../hooks/useSettingsSync";
import { reloadIfMirrorWasStale } from "../hooks/settingsMirror";
import { hexToHsl } from "../theme";
import type { WidgetConfig } from "./types";
import { SPOTLIGHT_PRESETS } from "../spotlightTheme";

const debouncedSaveTimers = new Map<string, number>();

function saveSetting(key: string, value: string) {
	localStorage.setItem(key, value);
	invoke("save_setting", { key, value }).catch(console.error);
}

function saveSettingDebounced(key: string, value: string, delayMs = 120) {
	localStorage.setItem(key, value);
	const existing = debouncedSaveTimers.get(key);
	if (existing !== undefined) {
		clearTimeout(existing);
	}
	const timer = window.setTimeout(() => {
		debouncedSaveTimers.delete(key);
		invoke("save_setting", { key, value }).catch(console.error);
	}, delayMs);
	debouncedSaveTimers.set(key, timer);
}

function readBool(val: string | null): boolean {
	return val === "true";
}

export function useSettings() {
	const [autostart, setAutostart] = useState(false);
	const [weatherEnabled, setWeatherEnabled] = useState(true);
	const [calendarEnabled, setCalendarEnabled] = useState(true);
	const [musicModeEnabled, setMusicModeEnabled] = useState(true);
	const [musicCompactNotch, setMusicCompactNotch] = useState(true);
	const [volumeOverlayEnabled, setVolumeOverlayEnabled] = useState(true);
	const [brightnessOverlayEnabled, setBrightnessOverlayEnabled] = useState(
		() => localStorage.getItem("drift-brightness-overlay-enabled") !== "false"
	);
	const [mediaGlowIntensity, setMediaGlowIntensity] = useState<number>(() => {
		const saved = localStorage.getItem("drift-media-glow-intensity");
		return saved !== null ? parseFloat(saved) : 1.0;
	});
	const [mediaLayout, setMediaLayout] = useState<"classic" | "compact">(
		() => (localStorage.getItem("drift-media-layout") as "classic" | "compact") || "classic"
	);
	const [showUpdateIndicator, setShowUpdateIndicator] = useState(
		() => localStorage.getItem("drift-show-update-indicator") !== "false"
	);
	const [timeFormat24h, setTimeFormat24h] = useState(
		() => localStorage.getItem("drift-time-format-24h") === "true"
	);
	const [launcherEnabled, setLauncherEnabled] = useState(
		() => localStorage.getItem("drift-launcher-enabled") !== "false"
	);
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
	const [spotlightGloss, setSpotlightGloss] = useState<number>(() => {
		const val = localStorage.getItem("drift-spotlight-gloss");
		return val !== null ? parseFloat(val) : 0.55;
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
	const [tempUnitFahrenheit, setTempUnitFahrenheit] = useState(false);
	const [cityName, setCityName] = useState("");
	const [citySearchResults, setCitySearchResults] = useState<
		Array<{ name: string; country: string; latitude: number; longitude: number }>
	>([]);
	const [showCityDropdown, setShowCityDropdown] = useState(false);
	const [statusWidgets, setStatusWidgets] = useState<WidgetConfig>({
		left: ["weather"],
		right: ["battery"]
	});
	const [dockEnabled, setDockEnabled] = useState(true);
	const [dockPreviewEnabled, setDockPreviewEnabled] = useState(true);
	const [dockIconOnly, setDockIconOnly] = useState(
		() => localStorage.getItem("drift-dock-icon-only") === "true"
	);
	const [dockSeparatorEnabled, setDockSeparatorEnabled] = useState(
		() => localStorage.getItem("drift-dock-separator-enabled") !== "false"
	);
	const [startIcon, setStartIcon] = useState(
		() => localStorage.getItem("drift-start-icon") || "default"
	);
	const [dockAdaptive, setDockAdaptive] = useState(
		() => localStorage.getItem("drift-dock-adaptive") === "true"
	);
	const [dockWinNumberEnabled, setDockWinNumberEnabled] = useState(
		() => localStorage.getItem("drift-dock-win-number-enabled") !== "false"
	);
	const [dockMode, setDockMode] = useState(() => {
		// "smart" is the fresh-install default — keep in step with App.tsx,
		// Dock.tsx, and the backend fallback in commands.rs.
		const raw = localStorage.getItem("drift-dock-mode") || "smart";
		return raw === "auto-hide" ? "smart" : raw;
	});
	const [notchMode, setNotchMode] = useState("fixed");
	const [notchEdgeDelay, setNotchEdgeDelay] = useState(() => {
		const val = localStorage.getItem("drift-notch-edge-delay");
		return val !== null ? parseInt(val) : 200;
	});
	const [lowBatteryThreshold, setLowBatteryThreshold] = useState(20);
	const [updateStatus, setUpdateStatus] = useState<
		"idle" | "checking" | "available" | "uptodate" | "error" | "downloading" | "installing"
	>("idle");
	const [updateVersion, setUpdateVersion] = useState("");
	const [appVersion, setAppVersion] = useState("");
	const [autoUpdate, setAutoUpdate] = useState(
		() => localStorage.getItem("drift-auto-update") === "true"
	);
	const [showSplashOnStartup, setShowSplashOnStartup] = useState(
		() => localStorage.getItem("drift-show-splash") === "true"
	);
	const [scale, setScale] = useState(() =>
		parseFloat(localStorage.getItem("drift-scale") || "1.0")
	);
	const [themeMode, setThemeMode] = useState(
		() => localStorage.getItem("drift-theme-mode") || "dark"
	);
	const [themeColor, setThemeColor] = useState(
		() => localStorage.getItem("drift-theme-color") || "#007aff"
	);
	const [themeOpacity, setThemeOpacity] = useState(() => {
		const val = localStorage.getItem("drift-theme-opacity");
		return val !== null ? parseFloat(val) : 0.8;
	});
	const [themeSaturation, setThemeSaturation] = useState(() => {
		const val = localStorage.getItem("drift-theme-saturation");
		return val !== null ? parseFloat(val) : 0.5;
	});
	const [themeBrightness, setThemeBrightness] = useState(() => {
		const val = localStorage.getItem("drift-theme-brightness");
		return val !== null ? parseFloat(val) : 0.15;
	});
	const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "success" | "error">(
		"idle"
	);
	const [importStatus, setImportStatus] = useState<"idle" | "importing" | "success" | "error">(
		"idle"
	);

	// ── Load all settings from backend + localStorage ──
	const loadAllSettings = useCallback(async () => {
		try {
			const settings: Record<string, string> = await invoke("load_settings");
			if (await reloadIfMirrorWasStale(settings)) return;
			const getVal = (key: string) => {
				const val = settings[key];
				if (val !== undefined && val !== null) return String(val);
				return localStorage.getItem(key);
			};

			const apply = <T>(
				val: string | null,
				setter: (v: T) => void,
				transform: (v: string) => T
			) => {
				if (val !== null) setter(transform(val));
			};

			apply(getVal("drift-weather-enabled"), setWeatherEnabled, readBool);
			apply(getVal("drift-calendar-enabled"), setCalendarEnabled, readBool);
			apply(getVal("drift-music-mode-enabled"), setMusicModeEnabled, readBool);
			apply(getVal("drift-music-compact-notch"), setMusicCompactNotch, readBool);
			apply(getVal("drift-volume-overlay-enabled"), setVolumeOverlayEnabled, readBool);
			apply(getVal("drift-brightness-overlay-enabled"), setBrightnessOverlayEnabled, readBool);
			apply(getVal("drift-media-glow-intensity"), setMediaGlowIntensity, parseFloat);
			apply(getVal("drift-time-format-24h"), setTimeFormat24h, readBool);
			apply(getVal("drift-launcher-enabled"), setLauncherEnabled, readBool);
			apply(getVal("drift-spotlight-glass-enabled"), setSpotlightGlassEnabled, readBool);
			apply(getVal("drift-spotlight-preset"), setSpotlightPreset, (v) => v || "frosted");
			apply(getVal("drift-spotlight-opacity"), setSpotlightOpacity, parseFloat);
			apply(getVal("drift-spotlight-blur"), setSpotlightBlur, parseInt);
			apply(getVal("drift-spotlight-gloss"), setSpotlightGloss, parseFloat);
			apply(getVal("drift-spotlight-max-results"), setSpotlightMaxResults, parseInt);
			apply(getVal("drift-spotlight-bg-image"), setSpotlightBgImage, (v) => v);
			apply(getVal("drift-spotlight-enable-files"), setSpotlightEnableFiles, readBool);
			apply(getVal("drift-spotlight-enable-commands"), setSpotlightEnableCommands, readBool);
			apply(getVal("drift-spotlight-enable-calc"), setSpotlightEnableCalc, readBool);
			apply(getVal("drift-spotlight-enable-web"), setSpotlightEnableWeb, readBool);
			apply(getVal("drift-show-update-indicator"), setShowUpdateIndicator, readBool);
			apply(getVal("drift-auto-update"), setAutoUpdate, readBool);
			apply(getVal("drift-dock-enabled"), setDockEnabled, readBool);
			apply(getVal("drift-dock-preview-enabled"), setDockPreviewEnabled, readBool);
			apply(getVal("drift-dock-icon-only"), setDockIconOnly, readBool);
			apply(getVal("drift-dock-separator-enabled"), setDockSeparatorEnabled, readBool);
			apply(getVal("drift-start-icon"), setStartIcon, (v) => v);
			apply(getVal("drift-dock-adaptive"), setDockAdaptive, readBool);
			apply(getVal("drift-dock-win-number-enabled"), setDockWinNumberEnabled, readBool);

			apply(getVal("drift-temp-unit"), setTempUnitFahrenheit, (v) => v === "fahrenheit");
			apply(getVal("drift-scale"), setScale, parseFloat);
			apply(getVal("drift-low-battery-threshold"), setLowBatteryThreshold, parseInt);

			apply(getVal("drift-notch-mode"), setNotchMode, (v) => (v === "auto-hide" ? "smart" : v));
			apply(getVal("drift-notch-edge-delay"), setNotchEdgeDelay, parseInt);
			apply(getVal("drift-dock-mode"), setDockMode, (v) => (v === "auto-hide" ? "smart" : v));

			const savedCity = getVal("drift-weather-city");
			if (savedCity) setCityName(savedCity);

			apply(getVal("drift-theme-mode"), setThemeMode, (v) => v);
			apply(getVal("drift-theme-color"), setThemeColor, (v) => v);
			apply(getVal("drift-theme-opacity"), setThemeOpacity, parseFloat);
			apply(getVal("drift-theme-saturation"), setThemeSaturation, parseFloat);
			apply(getVal("drift-theme-brightness"), setThemeBrightness, parseFloat);

			const widgetsVal = getVal("drift-status-widgets");
			if (widgetsVal) {
				try {
					const parsed = JSON.parse(widgetsVal);
					if (parsed && Array.isArray(parsed.left) && Array.isArray(parsed.right)) {
						setStatusWidgets(parsed);
					}
				} catch {}
			}
		} catch (e) {
			console.error("Failed to load settings:", e);
		}
	}, []);

	// ── Initialize on mount ──
	useEffect(() => {
		loadAllSettings();

		isEnabled()
			.then(setAutostart)
			.catch(() => {});

		getVersion()
			.then((ver) => setAppVersion(ver || "3.1.2"))
			.catch(() => setAppVersion("3.1.2"));

		checkForUpdates(false);
	}, []);

	// ── Sync settings from other windows ──
	useSettingsSync({
		"drift-dock-mode": setDockMode,
		"drift-notch-mode": setNotchMode,
		"drift-notch-edge-delay": setNotchEdgeDelay,
		"drift-dock-enabled": setDockEnabled,
		"drift-dock-icon-only": setDockIconOnly,
		"drift-dock-separator-enabled": setDockSeparatorEnabled,
		"drift-start-icon": setStartIcon,
		"drift-dock-preview-enabled": setDockPreviewEnabled,
		"drift-dock-adaptive": setDockAdaptive,
		"drift-dock-win-number-enabled": setDockWinNumberEnabled,
		"drift-weather-enabled": setWeatherEnabled,
		"drift-calendar-enabled": setCalendarEnabled,
		"drift-music-mode-enabled": setMusicModeEnabled,
		"drift-music-compact-notch": setMusicCompactNotch,
		"drift-media-glow-intensity": (v) => setMediaGlowIntensity(parseFloat(v)),
		"drift-media-layout": setMediaLayout,
		"drift-show-update-indicator": setShowUpdateIndicator,
		"drift-time-format-24h": setTimeFormat24h,
		"drift-launcher-enabled": setLauncherEnabled,
		"drift-low-battery-threshold": setLowBatteryThreshold,
		"drift-scale": setScale,
		"drift-temp-unit": (v) => setTempUnitFahrenheit(v === "fahrenheit"),
		"drift-auto-update": setAutoUpdate,
		"drift-volume-overlay-enabled": setVolumeOverlayEnabled,
		"drift-brightness-overlay-enabled": setBrightnessOverlayEnabled,
		"drift-theme-mode": setThemeMode,
		"drift-theme-color": setThemeColor,
		"drift-theme-opacity": setThemeOpacity,
		"drift-theme-saturation": setThemeSaturation,
		"drift-theme-brightness": setThemeBrightness,
		"drift-show-splash": setShowSplashOnStartup,
		"drift-weather-city": (v) => setCityName(v || ""),
		"drift-spotlight-preset": setSpotlightPreset,
		"drift-spotlight-opacity": (v) => setSpotlightOpacity(typeof v === "number" ? v : parseFloat(v)),
		"drift-spotlight-blur": (v) => setSpotlightBlur(typeof v === "number" ? v : parseInt(v)),
		"drift-spotlight-gloss": (v) => setSpotlightGloss(typeof v === "number" ? v : parseFloat(v)),
		"drift-spotlight-max-results": (v) => setSpotlightMaxResults(typeof v === "number" ? v : parseInt(v)),
		"drift-spotlight-bg-image": (v) => setSpotlightBgImage(String(v || "")),
		"drift-spotlight-enable-files": (v) => setSpotlightEnableFiles(Boolean(v)),
		"drift-spotlight-enable-commands": (v) => setSpotlightEnableCommands(Boolean(v)),
		"drift-spotlight-enable-calc": (v) => setSpotlightEnableCalc(Boolean(v)),
		"drift-spotlight-enable-web": (v) => setSpotlightEnableWeb(Boolean(v)),
	});

	// ── Listen for system accent changes (adaptive theme) ──
	useEffect(() => {
		const unlisten = listen<string>("system-accent-changed", (event) => {
			const mode = localStorage.getItem("drift-theme-mode") || "dark";
			if (mode === "adaptive") {
				try {
					const hsl = hexToHsl(event.payload);
					setThemeSaturation(hsl.s / 100);
					setThemeBrightness(hsl.l / 100);
				} catch (e) {
					console.error("Failed to parse system accent color change HSL:", e);
				}
			}
		});
		return () => {
			unlisten.then((fn) => fn());
		};
	}, []);

	// ── City search debounce ──
	useEffect(() => {
		if (cityName.trim().length < 2) {
			setCitySearchResults([]);
			setShowCityDropdown(false);
			return;
		}

		const timeout = setTimeout(async () => {
			try {
				const res = await fetch(
					`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`
				);
				const data = await res.json();
				if (data.results && data.results.length > 0) {
					setCitySearchResults(
						data.results.map((r: any) => ({
							name: r.name,
							country: r.country || "",
							latitude: r.latitude,
							longitude: r.longitude
						}))
					);
					setShowCityDropdown(true);
				} else {
					setCitySearchResults([]);
				}
			} catch {
				setCitySearchResults([]);
			}
		}, 300);

		return () => clearTimeout(timeout);
	}, [cityName]);

	// ── Update checker ──
	const checkForUpdates = async (manual = true) => {
		setUpdateStatus("checking");
		try {
			const result = await invoke<UpdateCheckResult>("check_for_updates", { force: manual });
			if (result.available) {
				setUpdateStatus("available");
				setUpdateVersion(result.version ?? "");
			} else {
				setUpdateStatus("uptodate");
			}
		} catch (e) {
			console.error("Updater error:", e);
			setUpdateStatus("error");
		}
	};

	const installUpdate = async () => {
		try {
			setUpdateStatus("downloading");
			await invoke("install_update");
			setUpdateStatus("idle");
		} catch (e) {
			console.error(e);
			setUpdateStatus("error");
		}
	};

	// Reflect install progress triggered from any window (including auto-update).
	useEffect(() => {
		const unlisten = listen<{ status: string; progress?: number }>(
			"auto-update-status",
			(event) => {
				switch (event.payload.status) {
					case "downloading":
						setUpdateStatus("downloading");
						break;
					case "installing":
						setUpdateStatus("installing");
						break;
					case "done":
						setUpdateStatus((prev) =>
							prev === "downloading" || prev === "installing" ? "idle" : prev
						);
						break;
				}
			}
		);
		return () => {
			unlisten.then((fn) => fn());
		};
	}, []);

	// ── Autostart ──
	const toggleAutostart = async () => {
		try {
			const currentlyEnabled = await isEnabled();
			if (currentlyEnabled) {
				await disable();
				setAutostart(false);
			} else {
				await enable();
				setAutostart(true);
			}
		} catch (err) {}
	};

	// ── Simple boolean toggles ──
	const toggleWeather = () => {
		const next = !weatherEnabled;
		setWeatherEnabled(next);
		saveSetting("drift-weather-enabled", String(next));
	};

	const toggleCalendar = () => {
		const next = !calendarEnabled;
		setCalendarEnabled(next);
		saveSetting("drift-calendar-enabled", String(next));
	};

	const toggleMusicMode = () => {
		const next = !musicModeEnabled;
		setMusicModeEnabled(next);
		saveSetting("drift-music-mode-enabled", String(next));
	};

	const toggleMusicCompactNotch = () => {
		const next = !musicCompactNotch;
		setMusicCompactNotch(next);
		saveSetting("drift-music-compact-notch", String(next));
	};

	const toggleMediaLayout = (layout: "classic" | "compact") => {
		setMediaLayout(layout);
		saveSetting("drift-media-layout", layout);
	};

	const toggleVolumeOverlay = () => {
		const next = !volumeOverlayEnabled;
		setVolumeOverlayEnabled(next);
		saveSetting("drift-volume-overlay-enabled", String(next));
	};

	const toggleBrightnessOverlay = () => {
		const next = !brightnessOverlayEnabled;
		setBrightnessOverlayEnabled(next);
		saveSetting("drift-brightness-overlay-enabled", String(next));
	};

	const handleMediaGlowIntensityChange = (val: number) => {
		setMediaGlowIntensity(val);
		saveSetting("drift-media-glow-intensity", val.toFixed(2));
	};

	const toggleUpdateIndicator = () => {
		const next = !showUpdateIndicator;
		setShowUpdateIndicator(next);
		saveSetting("drift-show-update-indicator", String(next));
	};

	const toggleTimeFormat24h = () => {
		const next = !timeFormat24h;
		setTimeFormat24h(next);
		saveSetting("drift-time-format-24h", String(next));
	};

	const toggleLauncherEnabled = () => {
		const next = !launcherEnabled;
		setLauncherEnabled(next);
		saveSetting("drift-launcher-enabled", String(next));
	};

	const handleSpotlightPresetChange = (presetId: string) => {
		setSpotlightPreset(presetId);
		saveSetting("drift-spotlight-preset", presetId);

		const preset = SPOTLIGHT_PRESETS.find((p) => p.id === presetId);
		if (preset && presetId !== "custom") {
			setSpotlightBlur(preset.blur);
			saveSetting("drift-spotlight-blur", String(preset.blur));
			setSpotlightOpacity(preset.opacity);
			saveSetting("drift-spotlight-opacity", String(preset.opacity));
			setSpotlightGloss(preset.gloss);
			saveSetting("drift-spotlight-gloss", String(preset.gloss));
		}
	};

	const toggleSpotlightGlassEnabled = () => {
		const next = !spotlightGlassEnabled;
		setSpotlightGlassEnabled(next);
		saveSetting("drift-spotlight-glass-enabled", String(next));
	};

	const handleSpotlightGlossChange = (val: number) => {
		setSpotlightGloss(val);
		saveSettingDebounced("drift-spotlight-gloss", String(val));
	};

	const handleSpotlightOpacityChange = (val: number) => {
		setSpotlightOpacity(val);
		saveSettingDebounced("drift-spotlight-opacity", String(val));
		const autoBlur = Math.round(20 + (1 - val) * 25);
		setSpotlightBlur(autoBlur);
		saveSettingDebounced("drift-spotlight-blur", String(autoBlur));
	};

	const handleSpotlightBlurChange = (val: number) => {
		setSpotlightBlur(val);
		saveSettingDebounced("drift-spotlight-blur", String(val));
	};

	const handleSpotlightMaxResultsChange = (val: number) => {
		setSpotlightMaxResults(val);
		saveSetting("drift-spotlight-max-results", String(val));
	};

	const handleSpotlightBgImageChange = (dataUrl: string) => {
		setSpotlightBgImage(dataUrl);
		saveSetting("drift-spotlight-bg-image", dataUrl);
	};

	const handlePickSpotlightBgImage = async () => {
		try {
			const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
			const filePath = await openDialog({
				title: "Choose Spotlight Background Image",
				filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
				multiple: false
			});
			if (filePath && typeof filePath === "string") {
				const dataUrl = await invoke<string>("read_image_data_url", { path: filePath });
				if (dataUrl) {
					handleSpotlightBgImageChange(dataUrl);
				}
			}
		} catch (e) {
			console.error("Failed to pick spotlight background image:", e);
		}
	};

	const handleClearSpotlightBgImage = () => {
		handleSpotlightBgImageChange("");
	};

	const toggleSpotlightFiles = () => {
		const next = !spotlightEnableFiles;
		setSpotlightEnableFiles(next);
		saveSetting("drift-spotlight-enable-files", String(next));
	};

	const toggleSpotlightCommands = () => {
		const next = !spotlightEnableCommands;
		setSpotlightEnableCommands(next);
		saveSetting("drift-spotlight-enable-commands", String(next));
	};

	const toggleSpotlightCalc = () => {
		const next = !spotlightEnableCalc;
		setSpotlightEnableCalc(next);
		saveSetting("drift-spotlight-enable-calc", String(next));
	};

	const toggleSpotlightWeb = () => {
		const next = !spotlightEnableWeb;
		setSpotlightEnableWeb(next);
		saveSetting("drift-spotlight-enable-web", String(next));
	};

	const toggleTempUnit = () => {
		const next = !tempUnitFahrenheit;
		setTempUnitFahrenheit(next);
		saveSetting("drift-temp-unit", next ? "fahrenheit" : "celsius");
	};

	const toggleDock = () => {
		const next = !dockEnabled;
		setDockEnabled(next);
		saveSetting("drift-dock-enabled", String(next));
	};

	const toggleDockPreview = () => {
		const next = !dockPreviewEnabled;
		setDockPreviewEnabled(next);
		saveSetting("drift-dock-preview-enabled", String(next));
	};

	const toggleDockIconOnly = () => {
		const next = !dockIconOnly;
		setDockIconOnly(next);
		saveSetting("drift-dock-icon-only", String(next));
	};

	const toggleDockSeparator = () => {
		const next = !dockSeparatorEnabled;
		setDockSeparatorEnabled(next);
		saveSetting("drift-dock-separator-enabled", String(next));
	};

	const handleStartIconChange = (icon: string) => {
		setStartIcon(icon);
		saveSetting("drift-start-icon", icon);
	};

	const toggleDockAdaptive = () => {
		const next = !dockAdaptive;
		setDockAdaptive(next);
		saveSetting("drift-dock-adaptive", String(next));
	};

	const toggleDockWinNumber = () => {
		const next = !dockWinNumberEnabled;
		setDockWinNumberEnabled(next);
		saveSetting("drift-dock-win-number-enabled", String(next));
	};

	const toggleAutoUpdate = () => {
		const next = !autoUpdate;
		setAutoUpdate(next);
		saveSetting("drift-auto-update", String(next));
	};

	// ── Value setters ──
	const setDockModeValue = (newMode: string) => {
		setDockMode(newMode);
		saveSetting("drift-dock-mode", newMode);
	};

	const setNotchModeValue = (newMode: string) => {
		setNotchMode(newMode);
		saveSetting("drift-notch-mode", newMode);
	};

	const handleNotchEdgeDelayChange = (val: number) => {
		setNotchEdgeDelay(val);
		saveSetting("drift-notch-edge-delay", val.toString());
	};

	const handleThresholdChange = (val: number) => {
		setLowBatteryThreshold(val);
		saveSetting("drift-low-battery-threshold", val.toString());
	};

	const handleScaleChange = (val: number) => {
		setScale(val);
		saveSetting("drift-scale", val.toString());
	};

	const handleWidgetsChange = (config: WidgetConfig) => {
		setStatusWidgets(config);
		saveSetting("drift-status-widgets", JSON.stringify(config));
	};

	// ── Theme handlers ──
	const handleThemeModeChange = async (mode: string) => {
		setThemeMode(mode);
		saveSetting("drift-theme-mode", mode);

		if (mode === "adaptive") {
			try {
				const accentHex = await invoke<string>("get_system_accent_color");
				const hsl = hexToHsl(accentHex);
				setThemeSaturation(hsl.s / 100);
				saveSetting("drift-theme-saturation", String(hsl.s / 100));
				setThemeBrightness(hsl.l / 100);
				saveSetting("drift-theme-brightness", String(hsl.l / 100));
			} catch (e) {
				console.error("Failed to parse adaptive accent HSL:", e);
			}
		}
	};

	const handleThemeColorChange = (color: string) => {
		setThemeColor(color);
		saveSetting("drift-theme-color", color);

		try {
			const hsl = hexToHsl(color);
			setThemeSaturation(hsl.s / 100);
			saveSetting("drift-theme-saturation", String(hsl.s / 100));
			setThemeBrightness(hsl.l / 100);
			saveSetting("drift-theme-brightness", String(hsl.l / 100));
		} catch (e) {
			console.error("Failed to parse custom color HSL:", e);
		}
	};

	const handleOpacityChange = (value: number) => {
		setThemeOpacity(value);
		saveSetting("drift-theme-opacity", String(value));
	};

	const handleSaturationChange = (value: number) => {
		setThemeSaturation(value);
		saveSetting("drift-theme-saturation", String(value));
	};

	const handleBrightnessChange = (value: number) => {
		setThemeBrightness(value);
		saveSetting("drift-theme-brightness", String(value));
	};

	// ── City search ──
	const selectCity = async (city: {
		name: string;
		country: string;
		latitude: number;
		longitude: number;
	}) => {
		setCityName(city.name);
		setShowCityDropdown(false);
		setCitySearchResults([]);
		localStorage.setItem("drift-weather-city", city.name);
		localStorage.setItem("drift-weather-lat", city.latitude.toString());
		localStorage.setItem("drift-weather-lon", city.longitude.toString());
		await invoke("save_setting", {
			key: "drift-weather-lat",
			value: city.latitude.toString()
		}).catch(() => {});
		await invoke("save_setting", {
			key: "drift-weather-lon",
			value: city.longitude.toString()
		}).catch(() => {});
		await invoke("save_setting", { key: "drift-weather-city", value: city.name }).catch(() => {});
		emit("weather-refresh", { lat: city.latitude, lon: city.longitude });
	};

	const handleCityClear = async () => {
		setCityName("");
		setShowCityDropdown(false);
		setCitySearchResults([]);
		localStorage.removeItem("drift-weather-city");
		localStorage.removeItem("drift-weather-lat");
		localStorage.removeItem("drift-weather-lon");
		await invoke("save_setting", { key: "drift-weather-lat", value: null }).catch(() => {});
		await invoke("save_setting", { key: "drift-weather-lon", value: null }).catch(() => {});
		await invoke("save_setting", { key: "drift-weather-city", value: null }).catch(() => {});
		emit("weather-refresh", true);
	};

	// ── Reset to defaults ──
	const resetToDefaults = async () => {
		try {
			const { ask } = await import("@tauri-apps/plugin-dialog");
			const confirmed = await ask(
				"All settings return to their defaults and Drift restarts. Pinned apps and custom icons are kept.",
				{
					title: "Reset Drift to Defaults",
					kind: "warning",
					okLabel: "Reset and Restart",
					cancelLabel: "Cancel"
				}
			);
			if (!confirmed) return;

			await invoke("reset_settings");

			// settings.json is cleared, but every window also caches drift keys
			// in localStorage; drop them so the restart can't resurrect values.
			// The first-run/version sentinels are lifecycle markers, not
			// preferences — keeping them avoids replaying the splash, which
			// would also re-trigger the first-run autostart enable.
			const keep = new Set(["drift-first-run", "drift-app-version"]);
			for (const key of Object.keys(localStorage)) {
				if (key.startsWith("drift-") && !keep.has(key)) localStorage.removeItem(key);
			}

			await invoke("restart_drift").catch(console.error);
		} catch (e) {
			console.error("Reset failed:", e);
		}
	};

	// ── Export / Import ──
	const handleExportSettings = async () => {
		setExportStatus("exporting");
		try {
			const { save: saveDialog } = await import("@tauri-apps/plugin-dialog");
			const settingsJson = await invoke<string>("export_settings");
			const filePath = await saveDialog({
				title: "Export Drift Settings",
				defaultPath: "drift-settings.json",
				filters: [{ name: "JSON", extensions: ["json"] }]
			});
			if (filePath) {
				await invoke("write_settings_to_path", { path: filePath, content: settingsJson });
				setExportStatus("success");
				setTimeout(() => setExportStatus("idle"), 2000);
			} else {
				setExportStatus("idle");
			}
		} catch (e) {
			console.error("Export failed:", e);
			setExportStatus("error");
			setTimeout(() => setExportStatus("idle"), 3000);
		}
	};

	const handleImportSettings = async () => {
		setImportStatus("importing");
		try {
			const { open: openDialog } = await import("@tauri-apps/plugin-dialog");
			const filePath = await openDialog({
				title: "Import Drift Settings",
				filters: [{ name: "JSON", extensions: ["json"] }],
				multiple: false
			});
			if (filePath) {
				const content = await invoke<string>("read_settings_from_path", {
					path: filePath as string
				});
				await invoke("import_settings", { settings: content });
				await loadAllSettings();
				setImportStatus("success");
				setTimeout(() => setImportStatus("idle"), 2000);
			} else {
				setImportStatus("idle");
			}
		} catch (e) {
			console.error("Import failed:", e);
			setImportStatus("error");
			setTimeout(() => setImportStatus("idle"), 3000);
		}
	};

	const toggleShowSplashOnStartup = useCallback(() => {
		setShowSplashOnStartup((prev) => {
			saveSetting("drift-show-splash", String(!prev));
			return !prev;
		});
	}, []);

	return {
		// System
		autostart,
		toggleAutostart,
		showSplashOnStartup,
		toggleShowSplashOnStartup,
		autoUpdate,
		toggleAutoUpdate,
		lowBatteryThreshold,
		handleThresholdChange,
		timeFormat24h,
		toggleTimeFormat24h,
		launcherEnabled,
		toggleLauncherEnabled,
		showUpdateIndicator,
		toggleUpdateIndicator,
		scale,
		handleScaleChange,

		// Theme
		themeMode,
		handleThemeModeChange,
		themeColor,
		handleThemeColorChange,
		themeOpacity,
		handleOpacityChange,
		themeSaturation,
		handleSaturationChange,
		themeBrightness,
		handleBrightnessChange,

		// Notch
		notchMode,
		setNotchModeValue,
		notchEdgeDelay,
		handleNotchEdgeDelayChange,
		calendarEnabled,
		toggleCalendar,
		musicModeEnabled,
		toggleMusicMode,
		musicCompactNotch,
		toggleMusicCompactNotch,
		mediaLayout,
		toggleMediaLayout,
		mediaGlowIntensity,
		handleMediaGlowIntensityChange,

		// Weather
		weatherEnabled,
		toggleWeather,
		tempUnitFahrenheit,
		toggleTempUnit,
		cityName,
		setCityName,
		citySearchResults,
		showCityDropdown,
		setShowCityDropdown,
		selectCity,
		handleCityClear,

		// Widgets
		statusWidgets,
		handleWidgetsChange,

		// Dock
		dockEnabled,
		toggleDock,
		dockMode,
		setDockModeValue,
		dockPreviewEnabled,
		toggleDockPreview,
		dockIconOnly,
		toggleDockIconOnly,
		dockSeparatorEnabled,
		toggleDockSeparator,
		startIcon,
		handleStartIconChange,
		dockAdaptive,
		toggleDockAdaptive,
		dockWinNumberEnabled,
		toggleDockWinNumber,

		// Overlays
		volumeOverlayEnabled,
		toggleVolumeOverlay,
		brightnessOverlayEnabled,
		toggleBrightnessOverlay,

		// Updates
		updateStatus,
		updateVersion,
		appVersion,
		checkForUpdates,
		installUpdate,

		// Import / Export
		exportStatus,
		importStatus,
		handleExportSettings,
		handleImportSettings,

		// Utilities
		restartDrift: () => invoke("restart_drift"),
		resetToDefaults,
		quitDrift: () => invoke("quit_drift"),

		// Spotlight
		spotlightGlassEnabled,
		toggleSpotlightGlassEnabled,
		spotlightPreset,
		handleSpotlightPresetChange,
		spotlightOpacity,
		handleSpotlightOpacityChange,
		spotlightBlur,
		handleSpotlightBlurChange,
		spotlightGloss,
		handleSpotlightGlossChange,
		spotlightMaxResults,
		handleSpotlightMaxResultsChange,
		spotlightBgImage,
		handleSpotlightBgImageChange,
		handlePickSpotlightBgImage,
		handleClearSpotlightBgImage,
		spotlightEnableFiles,
		toggleSpotlightFiles,
		spotlightEnableCommands,
		toggleSpotlightCommands,
		spotlightEnableCalc,
		toggleSpotlightCalc,
		spotlightEnableWeb,
		toggleSpotlightWeb
	};
}
