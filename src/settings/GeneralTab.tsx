import { Power, Download, Clock, BatteryWarning, RefreshCw, RotateCcw, LogOut, Play, Search } from "lucide-react";
import { SettingRow } from "./SettingRow";

interface GeneralTabProps {
	autostart: boolean;
	toggleAutostart: () => void;
	timeFormat24h: boolean;
	toggleTimeFormat24h: () => void;
	launcherEnabled: boolean;
	toggleLauncherEnabled: () => void;
	showSplashOnStartup: boolean;
	toggleShowSplashOnStartup: () => void;
	showUpdateIndicator: boolean;
	toggleUpdateIndicator: () => void;
	lowBatteryThreshold: number;
	handleThresholdChange: (val: number) => void;
	restartDrift: () => void;
	resetToDefaults: () => void;
	quitDrift: () => void;
}

export function GeneralTab({
	autostart,
	toggleAutostart,
	timeFormat24h,
	toggleTimeFormat24h,
	launcherEnabled,
	toggleLauncherEnabled,
	showSplashOnStartup,
	toggleShowSplashOnStartup,
	showUpdateIndicator,
	toggleUpdateIndicator,
	lowBatteryThreshold,
	handleThresholdChange,
	restartDrift,
	resetToDefaults,
	quitDrift
}: GeneralTabProps) {
	return (
		<>
			<div className="setting-group-label">System</div>
			<div className="setting-group">
				<SettingRow icon={Power} label="Launch at Login" desc="Open Drift automatically">
					<label className="toggle-switch">
						<input type="checkbox" checked={autostart} onChange={toggleAutostart} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow icon={Search} label="Spotlight Launcher" desc="Toggle app search with Alt + Space">
					<label className="toggle-switch">
						<input type="checkbox" checked={launcherEnabled} onChange={toggleLauncherEnabled} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow icon={Play} label="Splash Animation" desc="Show Drift logo on startup">
					<label className="toggle-switch">
						<input type="checkbox" checked={showSplashOnStartup} onChange={toggleShowSplashOnStartup} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={Download}
					label="Update Indicator"
					desc="Show green dot when update available"
				>
					<label className="toggle-switch">
						<input type="checkbox" checked={showUpdateIndicator} onChange={toggleUpdateIndicator} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow icon={Clock} label="24-Hour Time" desc="Use 24-hour clock format">
					<label className="toggle-switch">
						<input type="checkbox" checked={timeFormat24h} onChange={toggleTimeFormat24h} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={BatteryWarning}
					label="Low Battery Alert"
					desc={`Trigger at ${lowBatteryThreshold}%`}
					divider={false}
				>
					<input
						type="range"
						min="5"
						max="50"
						step="5"
						value={lowBatteryThreshold}
						onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
						className="settings-slider"
					/>
				</SettingRow>
			</div>

			<div className="setting-group-label">App</div>
			<div className="setting-group">
				<SettingRow
					icon={RotateCcw}
					label="Reset to Defaults"
					desc="Restore all settings and restart Drift"
					action
					danger
					onClick={resetToDefaults}
				/>
				<SettingRow
					icon={RefreshCw}
					label="Restart Drift"
					desc="Reinitialize all components"
					action
					onClick={restartDrift}
				/>
				<SettingRow
					icon={LogOut}
					label="Quit Drift"
					desc="Exit application completely"
					action
					danger
					onClick={quitDrift}
					divider={false}
				/>
			</div>
		</>
	);
}
