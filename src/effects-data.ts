import { Icon } from "@raycast/api";

export type EffectType = "fusion" | "title" | "generator";

export interface ResolveEffect {
  id: string;
  name: string;
  category: EffectCategory;
  type: EffectType;
  toolId: string; // Fusion tool ID or title/generator name
  description?: string;
}

export type EffectCategory = "Blur" | "Sharpen" | "Stylize" | "Color" | "Transform" | "Titles" | "Generators";

export const EFFECT_CATEGORY_ICONS: Record<EffectCategory, Icon> = {
  Blur: Icon.Circle,
  Sharpen: Icon.RaycastLogoNeg,
  Stylize: Icon.Wand,
  Color: Icon.EyeDropper,
  Transform: Icon.ArrowsExpand,
  Titles: Icon.Text,
  Generators: Icon.Image,
};

export const effects: ResolveEffect[] = [
  // ─── Blur ────────────────────────────────────────────
  { id: "fx-gaussian-blur", name: "Gaussian Blur", category: "Blur", type: "fusion", toolId: "Blur", description: "Smooth Gaussian blur" },
  { id: "fx-directional-blur", name: "Directional Blur", category: "Blur", type: "fusion", toolId: "DirectionalBlur", description: "Motion-style directional blur" },
  { id: "fx-defocus", name: "Defocus", category: "Blur", type: "fusion", toolId: "Defocus", description: "Lens defocus / bokeh effect" },
  { id: "fx-soft-glow", name: "Soft Glow", category: "Blur", type: "fusion", toolId: "SoftGlow", description: "Soft glow / bloom effect" },

  // ─── Sharpen ─────────────────────────────────────────
  { id: "fx-sharpen", name: "Sharpen", category: "Sharpen", type: "fusion", toolId: "Sharpen", description: "Sharpen detail" },
  { id: "fx-unsharp-mask", name: "Unsharp Mask", category: "Sharpen", type: "fusion", toolId: "UnsharpMask", description: "Unsharp mask sharpening" },

  // ─── Stylize ─────────────────────────────────────────
  { id: "fx-glow", name: "Glow", category: "Stylize", type: "fusion", toolId: "Glow", description: "Glow effect" },
  { id: "fx-highlight", name: "Highlight", category: "Stylize", type: "fusion", toolId: "Highlight", description: "Highlight bloom" },

  // ─── Color ───────────────────────────────────────────
  { id: "fx-color-corrector", name: "Color Corrector", category: "Color", type: "fusion", toolId: "ColorCorrector", description: "RGB color correction" },
  { id: "fx-brightness-contrast", name: "Brightness/Contrast", category: "Color", type: "fusion", toolId: "BrightnessContrast", description: "Adjust brightness and contrast" },
  { id: "fx-color-space", name: "Color Space", category: "Color", type: "fusion", toolId: "ColorSpace", description: "Color space conversion" },

  // ─── Transform ───────────────────────────────────────
  { id: "fx-transform", name: "Transform", category: "Transform", type: "fusion", toolId: "Transform", description: "Position, rotation, scale" },
  { id: "fx-resize", name: "Resize", category: "Transform", type: "fusion", toolId: "Resize", description: "Resize / reformat" },
  { id: "fx-crop", name: "Crop", category: "Transform", type: "fusion", toolId: "Crop", description: "Crop image" },
  { id: "fx-letterbox", name: "Letterbox", category: "Transform", type: "fusion", toolId: "Letterbox", description: "Add letterbox bars" },

  // ─── Titles ──────────────────────────────────────────
  { id: "fx-text-plus", name: "Text+", category: "Titles", type: "title", toolId: "Text+", description: "Fusion text title" },
  { id: "fx-scroll-title", name: "Scroll Title", category: "Titles", type: "title", toolId: "Scroll Title", description: "Scrolling text" },
  { id: "fx-lower-third", name: "Lower Third", category: "Titles", type: "title", toolId: "Lower Third", description: "Lower third title" },
];
