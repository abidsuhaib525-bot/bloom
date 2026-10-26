import { Volume2, Sun } from "lucide-react";
import { SettingRow } from "./SettingRow";

interface OverlaysTabProps {
	volumeOverlayEnabled: boolean;
	toggleVolumeOverlay: () => void;
	brightnessOverlayEnabled: boolean;
	toggleBrightnessOverlay: () => void;
}

export function OverlaysTab({
	volumeOverlayEnabled,
	toggleVolumeOverlay,
	brightnessOverlayEnabled,
	toggleBrightnessOverlay
}: OverlaysTabProps) {
	return (
		<>
			<div className="setting-group-label">Overlays</div>
			<div className="setting-group">
				<SettingRow icon={Volume2} label="Volume HUD" desc="Drift volume overlay">
					<label className="toggle-switch">
						<input type="checkbox" checked={volumeOverlayEnabled} onChange={toggleVolumeOverlay} />
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={Sun}
					label="Brightness HUD"
					desc="Drift brightness overlay"
					divider={false}
				>
					<label className="toggle-switch">
						<input
							type="checkbox"
							checked={brightnessOverlayEnabled}
							onChange={toggleBrightnessOverlay}
						/>
						<span className="slider"></span>
					</label>
				</SettingRow>
			</div>
		</>
	);
}
