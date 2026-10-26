import type { CSSProperties } from "react";

export interface SpotlightPresetConfig {
	id: string;
	label: string;
	desc: string;
	blur: number;
	opacity: number;
	gloss: number;
	badge: string;
}

export const SPOTLIGHT_PRESETS: SpotlightPresetConfig[] = [
	{
		id: "frosted",
		label: "macOS Frosted Glass",
		desc: "Authentic Apple obsidian glass with soft natural blur",
		blur: 35,
		opacity: 0.82,
		gloss: 0.0,
		badge: "macOS"
	},
	{
		id: "acrylic",
		label: "Fluent Acrylic",
		desc: "Windows 11 Fluent dark acrylic with soft diffused backdrop",
		blur: 45,
		opacity: 0.90,
		gloss: 0.0,
		badge: "Fluent"
	},
	{
		id: "clear",
		label: "Crystal Liquid Glass",
		desc: "Ultra-sheer floating glass with luminous refraction",
		blur: 24,
		opacity: 0.50,
		gloss: 0.0,
		badge: "Crystal"
	},
	{
		id: "vibrant",
		label: "Modern Dark Glass",
		desc: "Raycast modern obsidian dark glass",
		blur: 32,
		opacity: 0.86,
		gloss: 0.0,
		badge: "Dark"
	},
	{
		id: "solid",
		label: "Solid OLED Minimal",
		desc: "Pure OLED deep obsidian black, crisp & distraction-free",
		blur: 0,
		opacity: 0.98,
		gloss: 0.0,
		badge: "OLED"
	}
];

export interface ComputedSpotlightStyles {
	panelStyle: CSSProperties;
	inputStyle: CSSProperties;
	sheenStyle: CSSProperties;
	accentGlow: boolean;
	presetId: string;
}

export function getSpotlightStyles(
	presetId: string = "frosted",
	opacity: number = 0.82,
	blur: number = 32,
	_gloss: number = 0,
	bgImage: string = "",
	maxResults: number = 8,
	glassEnabled: boolean = true
): ComputedSpotlightStyles {
	const isCustomImage = Boolean(bgImage && bgImage.trim().length > 0);

	let background = "";
	let effectiveBlur = 0;

	if (!glassEnabled) {
		// Glass effect is turned OFF -> pure matte obsidian black
		background = "rgba(18, 19, 24, 0.98)";
		effectiveBlur = 0;
	} else if (isCustomImage) {
		const overlayAlpha = Math.max(0.70, 1 - opacity * 0.3);
		background = `linear-gradient(rgba(18, 19, 24, ${overlayAlpha}), rgba(18, 19, 24, ${overlayAlpha})), url("${bgImage}")`;
		effectiveBlur = blur || Math.round(20 + (1 - opacity) * 25);
	} else {
		// Smooth dynamic blur scaling with opacity
		effectiveBlur = blur || Math.round(20 + (1 - opacity) * 25);
		switch (presetId) {
			case "acrylic":
				background = `rgba(18, 20, 26, ${opacity})`;
				break;
			case "clear":
				background = `rgba(22, 26, 38, ${Math.min(opacity, 0.65)})`;
				break;
			case "vibrant":
				background = `rgba(14, 16, 24, ${opacity})`;
				break;
			case "solid":
				background = "rgba(14, 15, 18, 0.98)";
				effectiveBlur = 0;
				break;
			case "frosted":
			default:
				background = `rgba(24, 26, 32, ${opacity})`;
				break;
		}
	}

	return {
		panelStyle: {
			background,
			backgroundSize: isCustomImage ? "cover" : undefined,
			backgroundPosition: isCustomImage ? "center" : undefined,
			backgroundRepeat: isCustomImage ? "no-repeat" : undefined,
			border: "1px solid rgba(255, 255, 255, 0.09)",
			outline: "none",
			boxShadow: "0 24px 64px rgba(0, 0, 0, 0.55), 0 4px 16px rgba(0, 0, 0, 0.35)",
			backdropFilter: effectiveBlur > 0 ? `blur(${effectiveBlur}px) saturate(190%)` : undefined,
			WebkitBackdropFilter: effectiveBlur > 0 ? `blur(${effectiveBlur}px) saturate(190%)` : undefined,
			maxHeight: `${Math.min(maxResults * 50 + 74, 480)}px`,
			position: "relative"
		},
		inputStyle: {
			background: "transparent",
			border: "none"
		},
		sheenStyle: {
			display: "none"
		},
		accentGlow: false,
		presetId
	};
}
