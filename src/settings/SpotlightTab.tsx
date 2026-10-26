import { useState } from "react";
import {
	Search,
	Sliders,
	Eye,
	Image as ImageIcon,
	Folder,
	Terminal,
	Calculator,
	Globe,
	Trash2,
	AppWindow,
	Sparkles
} from "lucide-react";
import { SettingRow } from "./SettingRow";
import { getSpotlightStyles } from "../spotlightTheme";

interface SpotlightTabProps {
	launcherEnabled: boolean;
	toggleLauncherEnabled: () => void;
	spotlightGlassEnabled: boolean;
	toggleSpotlightGlassEnabled: () => void;
	spotlightPreset: string;
	handleSpotlightPresetChange: (presetId: string) => void;
	spotlightOpacity: number;
	handleSpotlightOpacityChange: (val: number) => void;
	spotlightBlur: number;
	handleSpotlightBlurChange: (val: number) => void;
	spotlightGloss: number;
	handleSpotlightGlossChange: (val: number) => void;
	spotlightMaxResults: number;
	handleSpotlightMaxResultsChange: (val: number) => void;
	spotlightBgImage: string;
	handlePickSpotlightBgImage: () => void;
	handleClearSpotlightBgImage: () => void;
	spotlightEnableFiles: boolean;
	toggleSpotlightFiles: () => void;
	spotlightEnableCommands: boolean;
	toggleSpotlightCommands: () => void;
	spotlightEnableCalc: boolean;
	toggleSpotlightCalc: () => void;
	spotlightEnableWeb: boolean;
	toggleSpotlightWeb: () => void;
}

export function SpotlightTab({
	launcherEnabled,
	toggleLauncherEnabled,
	spotlightGlassEnabled,
	toggleSpotlightGlassEnabled,
	spotlightPreset,
	spotlightOpacity,
	handleSpotlightOpacityChange,
	spotlightBlur,
	spotlightMaxResults,
	handleSpotlightMaxResultsChange,
	spotlightBgImage,
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
}: SpotlightTabProps) {
	// Dragging/adjusting the single slider opens the focused preview modal
	const [isDraggingSlider, setIsDraggingSlider] = useState(false);

	// Compute live preview styling directly from current settings
	const { panelStyle, inputStyle } = getSpotlightStyles(
		spotlightPreset,
		spotlightOpacity,
		spotlightBlur,
		0,
		spotlightBgImage,
		2,
		spotlightGlassEnabled
	);

	const glassTransparencyPercent = Math.round((1 - spotlightOpacity) * 100);

	return (
		<>
			{/* Regular clean settings panel */}
			<div className="setting-group-label">Spotlight Launcher</div>
			<div className="setting-group">
				<SettingRow
					icon={Search}
					label="Enable Spotlight"
					desc="Toggle search anytime using Alt + Space"
				>
					<label className="toggle-switch">
						<input
							type="checkbox"
							checked={launcherEnabled}
							onChange={toggleLauncherEnabled}
						/>
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={Sliders}
					label="Results Limit"
					desc="Maximum items shown in search results"
					divider={false}
				>
					<select
						className="settings-select"
						value={spotlightMaxResults}
						onChange={(e) => handleSpotlightMaxResultsChange(parseInt(e.target.value))}
					>
						<option value={5}>5 Results (Compact)</option>
						<option value={8}>8 Results (Default)</option>
						<option value={10}>10 Results (Comfortable)</option>
						<option value={15}>15 Results (Expanded)</option>
						<option value={20}>20 Results (Maximum)</option>
					</select>
				</SettingRow>
			</div>

			<div className="setting-group-label">Glass & Visual Style</div>
			<div className="setting-group">
				{/* 1. Explicit Glass Effect Toggle Switch */}
				<SettingRow
					icon={Sparkles}
					label="Glass Effect"
					desc={
						spotlightGlassEnabled
							? "Translucent frosted glass with blurred desktop backdrop"
							: "Solid matte dark obsidian look (no transparency)"
					}
					divider={spotlightGlassEnabled}
				>
					<label className="toggle-switch">
						<input
							type="checkbox"
							checked={spotlightGlassEnabled}
							onChange={toggleSpotlightGlassEnabled}
						/>
						<span className="slider"></span>
					</label>
				</SettingRow>

				{/* 2. Single Unified Glass Slider (Only shown & active when Glass Effect is ON) */}
				{spotlightGlassEnabled && (
					<SettingRow
						icon={Eye}
						label="Glass Transparency"
						desc={`Control transparency level (${glassTransparencyPercent}% glass)`}
					>
						<input
							type="range"
							min="0.20"
							max="0.95"
							step="0.02"
							value={spotlightOpacity}
							onChange={(e) => {
								handleSpotlightOpacityChange(parseFloat(e.target.value));
								setIsDraggingSlider(true);
							}}
							onPointerDown={() => setIsDraggingSlider(true)}
							onMouseDown={() => setIsDraggingSlider(true)}
							className="settings-slider"
							title="Drag slider to adjust with live preview"
						/>
					</SettingRow>
				)}

				{/* 3. Optional Custom Background Image */}
				{spotlightGlassEnabled && (
					<SettingRow
						icon={ImageIcon}
						label="Custom Background Image"
						desc={
							spotlightBgImage
								? "Custom backdrop applied with frosted glass"
								: "Use custom wallpaper or art as background"
						}
						divider={false}
					>
						<div className="spotlight-bg-controls">
							{spotlightBgImage && (
								<div
									className="spotlight-bg-preview"
									style={{ backgroundImage: `url(${spotlightBgImage})` }}
									title="Current background preview"
								/>
							)}
							<button
								type="button"
								className="settings-action-btn"
								onClick={handlePickSpotlightBgImage}
							>
								{spotlightBgImage ? "Change Image" : "Choose Image…"}
							</button>
							{spotlightBgImage && (
								<button
									type="button"
									className="settings-action-btn danger"
									onClick={handleClearSpotlightBgImage}
									title="Remove custom image and return to glass preset"
								>
									<Trash2 size={13} />
								</button>
							)}
						</div>
					</SettingRow>
				)}
			</div>

			<div className="setting-group-label">Search Sources</div>
			<div className="setting-group">
				<SettingRow
					icon={Folder}
					label="Files & Folders"
					desc="Search files in Desktop, Documents & Downloads"
				>
					<label className="toggle-switch">
						<input
							type="checkbox"
							checked={spotlightEnableFiles}
							onChange={toggleSpotlightFiles}
						/>
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={Terminal}
					label="System Commands"
					desc="Control Lock, Sleep, Restart & Recycle Bin"
				>
					<label className="toggle-switch">
						<input
							type="checkbox"
							checked={spotlightEnableCommands}
							onChange={toggleSpotlightCommands}
						/>
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={Calculator}
					label="Calculator"
					desc="Evaluate math expressions instantly"
				>
					<label className="toggle-switch">
						<input
							type="checkbox"
							checked={spotlightEnableCalc}
							onChange={toggleSpotlightCalc}
						/>
						<span className="slider"></span>
					</label>
				</SettingRow>

				<SettingRow
					icon={Globe}
					label="Web & URLs"
					desc="Open web links or search Google directly"
					divider={false}
				>
					<label className="toggle-switch">
						<input
							type="checkbox"
							checked={spotlightEnableWeb}
							onChange={toggleSpotlightWeb}
						/>
						<span className="slider"></span>
					</label>
				</SettingRow>
			</div>

			{/* ═══════════════════════════════════════════════════════════════
			    FOCUSED LIVE PREVIEW OVERLAY
			    Appears ONLY when dragging/interacting with the single slider!
			    Directly shows:
			      - TOP: Live Spotlight preview (clean, pure black shadow, 0 light bleed)
			      - BOTTOM: ONLY the single slider!
			═══════════════════════════════════════════════════════════════ */}
			{isDraggingSlider && (
				<div
					className="spotlight-android-backdrop"
					onClick={() => setIsDraggingSlider(false)}
				>
					<div
						className="spotlight-android-modal"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Top: Clean live Spotlight preview */}
						<div className="spotlight-android-stage">
							<div
								className="spotlight-preview-mockup"
								style={panelStyle}
							>
								{/* Search Bar Capsule */}
								<div className="spotlight-preview-input-row" style={inputStyle}>
									<Search className="spotlight-preview-search-icon" />
									<span className="spotlight-preview-input-text">
										Search apps, files, or calculate...
									</span>
									<span className="spotlight-preview-kbd">Alt + Space</span>
								</div>

								{/* Sample Search Results */}
								<div className="spotlight-preview-items">
									<div className="spotlight-preview-item active">
										<div className="spotlight-preview-item-icon">
											<AppWindow size={11} />
										</div>
										<div className="spotlight-preview-item-info">
											<span className="spotlight-preview-item-title">Google Chrome</span>
											<span className="spotlight-preview-item-badge">App</span>
										</div>
									</div>

									<div className="spotlight-preview-item">
										<div className="spotlight-preview-item-icon">
											<Calculator size={11} />
										</div>
										<div className="spotlight-preview-item-info">
											<span className="spotlight-preview-item-title">24 × 7 = 168</span>
											<span className="spotlight-preview-item-badge">Calc</span>
										</div>
									</div>
								</div>

								{/* Minimal Footer */}
								<div className="spotlight-preview-footer">
									<span>Spotlight Preview</span>
									<div className="spotlight-preview-footer-hints">
										<span>↑↓ navigate</span>
										<span>↵ open</span>
									</div>
								</div>
							</div>
						</div>

						{/* Bottom: ONLY the single slider */}
						<div className="spotlight-android-deck">
							<div className="spotlight-android-slider-box">
								<div className="spotlight-android-slider-label">
									<span>Glass Transparency</span>
									<span className="spotlight-android-slider-val">
										{glassTransparencyPercent}%
									</span>
								</div>
								<input
									type="range"
									min="0.20"
									max="0.95"
									step="0.02"
									value={spotlightOpacity}
									onChange={(e) => handleSpotlightOpacityChange(parseFloat(e.target.value))}
									className="spotlight-android-slider"
									autoFocus
								/>
							</div>

							<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
								<button
									type="button"
									className="spotlight-android-done-btn"
									onClick={() => setIsDraggingSlider(false)}
								>
									Done
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
