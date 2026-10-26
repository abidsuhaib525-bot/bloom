# Drift Settings Reference

All settings are stored in `settings.json` in the app config directory (`%APPDATA%/drift/`). The file is a flat JSON object with `drift-` prefixed keys. Drift watches this file for external changes and applies them in real-time.

## Quick Start

Edit `settings.json` with any text editor while Drift is running. Changes are applied immediately — no restart required.

```json
{
	"drift-dock-enabled": "true",
	"drift-dock-mode": "smart",
	"drift-theme-mode": "dark",
	"drift-scale": "1.0"
}
```

## Settings Keys

### Dock

| Key                             | Type                             | Default     | Description                                                                                                                                                                      |
| ------------------------------- | -------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drift-dock-enabled`            | `"true"` / `"false"`             | `"true"`    | Show or hide the Drift Dock (taskbar replacement).                                                                                                                               |
| `drift-dock-mode`               | `"fixed"` / `"smart"` / `"peek"` | `"smart"`   | Dock visibility behavior. **fixed** = always visible as AppBar. **smart** = auto-hide when overlapped by fullscreen apps. **peek** = hidden until cursor approaches bottom edge. |
| `drift-dock-preview-enabled`    | `"true"` / `"false"`             | `"true"`    | Show window thumbnail previews when hovering dock icons.                                                                                                                         |
| `drift-dock-icon-only`          | `"true"` / `"false"`             | `"false"`   | Minimal icon-only style (no background/padding around icons).                                                                                                                    |
| `drift-dock-separator-enabled`  | `"true"` / `"false"`             | `"true"`    | Show a divider between pinned and unpinned dock apps when unpinned apps are present. Unpinned apps remain on the right when disabled.                                               |
| `drift-start-icon`              | icon key / `custom:<data URI>`   | `"default"` | Start button icon: `default`, `drift-colorful`, `drift-golden`, `drift-biscuit`, `windows`, or `custom:` followed by an uploaded image's data URI.                               |
| `drift-dock-adaptive`           | `"true"` / `"false"`             | `"false"`   | Fixed dock only. Stretch the dock to full width like a traditional taskbar while a window is maximized, and contract back when it's restored.                                    |
| `drift-dock-win-number-enabled` | `"true"` / `"false"`             | `"true"`    | When the taskbar is replaced, Win+1 through Win+9 activate the matching pinned dock app (focus/minimize if running, launch otherwise) instead of the native taskbar slots.       |

### Notch

| Key                      | Type                             | Default   | Description                                                                                                                    |
| ------------------------ | -------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `drift-notch-mode`       | `"fixed"` / `"smart"` / `"peek"` | `"fixed"` | Notch (top bar) visibility behavior. Same modes as dock. **peek** shows the notch briefly on media events and notifications.   |
| `drift-notch-edge-delay` | milliseconds `"0"`–`"2000"`      | `"200"`   | In smart/peek mode, how long the cursor must rest against the top screen edge before the notch peeks. `"0"` reveals instantly. |

### Weather

| Key                              | Type                         | Default     | Description                                                                        |
| -------------------------------- | ---------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `drift-weather-enabled`          | `"true"` / `"false"`         | `"true"`    | Show weather widget in the notch status bar.                                       |
| `drift-weather-city`             | string                       | `""`        | Manually set city name for weather. Empty string = auto-detect via IP geolocation. |
| `drift-weather-lat`              | number string                | (auto)      | Latitude coordinate for weather. Set automatically when a city is selected.        |
| `drift-weather-lon`              | number string                | (auto)      | Longitude coordinate for weather. Set automatically when a city is selected.       |
| `drift-weather-cached-temp`      | number string                | (none)      | Cached temperature value shown before next API fetch.                              |
| `drift-weather-cached-condition` | string                       | (none)      | Cached weather condition text (e.g. "Partly Cloudy").                              |
| `drift-temp-unit`                | `"celsius"` / `"fahrenheit"` | `"celsius"` | Temperature display unit.                                                          |

### Modules

| Key                         | Type                 | Default  | Description                                                           |
| --------------------------- | -------------------- | -------- | --------------------------------------------------------------------- |
| `drift-calendar-enabled`    | `"true"` / `"false"` | `"true"` | Enable calendar mode in the notch.                                    |
| `drift-music-mode-enabled`  | `"true"` / `"false"` | `"true"` | Enable interactive music media widget.                                |
| `drift-music-compact-notch` | `"true"` / `"false"` | `"true"` | Show compact music display (visualizer + artwork) in collapsed notch. |

### Music Appearance

| Key                                | Type                      | Default     | Description                                                                                     |
| ---------------------------------- | ------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `drift-media-layout`               | `"classic"` / `"compact"` | `"classic"` | Expanded player style. **classic** = large album art. **compact** = small thumbnail + controls. |
| `drift-media-glow-intensity`       | float string              | `"1.0"`     | Album art glow intensity / brightness scale (`0.0` to `1.0`, `0.0` = off).                      |
| `drift-media-visualizer-enabled`   | `"true"` / `"false"`      | `"true"`    | Audio visualizer bars in music mode. Also accepts `drift-visualizer-enabled` (legacy alias).    |
| `drift-media-album-art-enabled`    | `"true"` / `"false"`      | `"true"`    | Show album artwork in the notch music display.                                                  |

### Overlays

| Key                                | Type                 | Default  | Description                                                              |
| ---------------------------------- | -------------------- | -------- | ------------------------------------------------------------------------ |
| `drift-volume-overlay-enabled`     | `"true"` / `"false"` | `"true"` | Show Drift volume HUD when volume changes (replaces native Windows OSD). |
| `drift-brightness-overlay-enabled` | `"true"` / `"false"` | `"true"` | Show Drift brightness HUD when brightness changes.                       |

### Appearance

| Key                      | Type                                             | Default     | Description                                                                                                                                                 |
| ------------------------ | ------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drift-theme-mode`       | `"dark"` / `"light"` / `"custom"` / `"adaptive"` | `"dark"`    | Theme mode. **dark** = dark translucent. **light** = light translucent. **custom** = user-picked color. **adaptive** = follows Windows system accent color. |
| `drift-theme-color`      | hex string                                       | `"#007aff"` | Custom theme color (used in `custom` and `adaptive` modes).                                                                                                 |
| `drift-theme-opacity`    | float string                                     | `"0.80"`    | Background opacity (0.1 to 1.0).                                                                                                                            |
| `drift-theme-saturation` | float string                                     | `"0.50"`    | Color saturation for custom/adaptive themes (0.0 to 1.0).                                                                                                   |
| `drift-theme-brightness` | float string                                     | `"0.15"`    | Background brightness for custom/adaptive themes (0.0 to 1.0).                                                                                              |

### Status Widgets

| Key                    | Type        | Default                                    | Description                                                                                                 |
| ---------------------- | ----------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `drift-status-widgets` | JSON string | `{"left":["weather"],"right":["battery"]}` | Widget layout in collapsed notch. Available: `"weather"`, `"battery"`, `"cpu"`, `"ram"`, `"disk"`, `"net"`. |

Example:

```json
{
	"drift-status-widgets": "{\"left\":[\"cpu\",\"ram\"],\"right\":[\"battery\",\"net\"]}"
}
```

### System

| Key                            | Type                 | Default   | Description                                                                                          |
| ------------------------------ | -------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `drift-scale`                  | float string         | `"1.0"`   | UI scale factor (0.8 to 1.3). Changing this re-registers AppBars to resize the reserved screen area. |
| `drift-low-battery-threshold`  | integer string       | `"20"`    | Battery percentage that triggers the low-battery alert pulse (5 to 50, step 5).                      |
| `drift-auto-update`            | `"true"` / `"false"` | `"false"` | Check for and download updates automatically on startup.                                             |
| `drift-show-update-indicator`  | `"true"` / `"false"` | `"true"`  | Show a green dot on the notch when an update is available.                                           |
| `drift-announcement-dismissed` | announcement id      | `""`      | ID of the last dismissed in-app announcement (published via `website/public/announcements.json`).    |
| `drift-time-format-24h`        | `"true"` / `"false"` | `"false"` | Use 24-hour clock format in the notch. When `"false"`, displays 12-hour format with AM/PM.           |
| `drift-launcher-enabled`       | `"true"` / `"false"` | `"true"`  | Enable the Alt+Space global Spotlight launcher. When `"false"`, the hotkey is ignored.             |

### Internal (Do Not Edit Manually)

| Key                 | Type     | Description                                                                           |
| ------------------- | -------- | ------------------------------------------------------------------------------------- |
| `drift-first-run`   | sentinel | Set to `"done"` after first launch. Triggers splash screen if absent.                 |
| `drift-app-version` | string   | Last known app version. If it differs from current, splash screen is shown on update. |

## Event System

Drift uses two Tauri events for settings synchronization:

### `settings-changed`

- **Emitted by:** `save_setting` command (frontend or backend)
- **Payload:** `{ "key": "drift-...", "value": ... }`
- **Purpose:** Broadcasts changes made through the Drift UI to all windows
- **Key format:** Drift-prefixed keys as-is (e.g. `"drift-dock-mode"`)

### `settings-external-changed`

- **Emitted by:** File watcher (detects external edits to `settings.json`)
- **Payload:** `{ "key": "drift-...", "value": ... }` or `{ "key": "drift-...", "value": null }` for removed keys
- **Purpose:** Broadcasts changes made by external editors (VS Code, notepad, scripts)
- **Key format:** Drift-prefixed keys as-is
- **Behavior:** Also syncs values to `localStorage` for instant frontend reads

### Flow

```
External editor saves settings.json
    ↓
File watcher detects change (ReadDirectoryChangesW)
    ↓
Diffs against SETTINGS_CACHE
    ↓
Emits settings-external-changed for each changed/removed key
    ↓
useSettingsSync hook updates React state + localStorage
    ↓
useSettingsSync hook updates React state
    ↓
UI re-renders with new values
```

## Example: Changing Dock Mode via Script

```powershell
# PowerShell: switch dock to smart mode
$json = Get-Content "$env:APPDATA\drift\settings.json" | ConvertFrom-Json
$json.'drift-dock-mode' = 'smart'
$json | ConvertTo-Json | Set-Content "$env:APPDATA\drift\settings.json"
```

```python
# Python: disable dock
import json, os
path = os.path.join(os.environ['APPDATA'], 'drift', 'settings.json')
with open(path) as f: settings = json.load(f)
settings['drift-dock-enabled'] = 'false'
with open(path, 'w') as f: json.dump(settings, f)
```

## Notes

- All boolean values are strings (`"true"` / `"false"`) for consistency with `localStorage`.
- The `useSettingsSync` hook auto-converts `"true"` / `"false"` strings to booleans.
- `auto-hide` mode values in `drift-dock-mode` and `drift-notch-mode` are legacy aliases for `smart` — they are mapped automatically.
- Changing `drift-scale` triggers AppBar re-registration to adjust reserved screen space.
- Settings → General → Reset to Defaults removes every `drift-` key from `settings.json` and `localStorage` (except the `drift-first-run` / `drift-app-version` lifecycle sentinels), then restarts Drift. Pinned apps (`pinned_apps.json`) and uploaded icons (`custom_icons/`) are preserved.
- Theme changes (`drift-theme-*`) are applied by reading all theme values from `localStorage` and calling `applyTheme()` — the theme system depends on all five theme keys being in sync.
