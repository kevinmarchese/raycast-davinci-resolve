import { Grid, List, ActionPanel, Action, showHUD, Icon, closeMainWindow, Color, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { commands } from "./commands";
import { sendShortcut } from "./send-shortcut";
import {
  getTimelineState,
  setClipColor,
  clearClipColor,
  setClipEnabled,
  setProperty,
  setProperties,
  TimelineState,
  ClipInfo,
} from "./resolve-api";
import { Category, Modifier, Shortcut } from "./types";

// ─── Constants ──────────────────────────────────────────────

const CATEGORY_ORDER: Category[] = [
  "General",
  "Navigation",
  "Playback",
  "Timeline",
  "Edit",
  "Color",
  "Markers",
  "Fairlight",
  "Fusion",
  "Deliver",
];

const MODIFIER_SYMBOLS: Record<Modifier, string> = {
  command: "\u2318",
  shift: "\u21E7",
  option: "\u2325",
  control: "\u2303",
};

const SPECIAL_KEY_LABELS: Record<string, string> = {
  space: "Space", return: "Return", enter: "Enter", tab: "Tab",
  escape: "Esc", delete: "Delete", forwarddelete: "Fwd Del",
  up: "\u2191", down: "\u2193", left: "\u2190", right: "\u2192",
  home: "Home", end: "End", pageup: "Page Up", pagedown: "Page Down",
  f1: "F1", f2: "F2", f3: "F3", f4: "F4", f5: "F5", f6: "F6",
  f7: "F7", f8: "F8", f9: "F9", f10: "F10", f11: "F11", f12: "F12",
};

const CATEGORY_ICONS: Record<Category, Icon> = {
  General: Icon.Gear, Navigation: Icon.ArrowRight, Playback: Icon.Play,
  Timeline: Icon.BarChart, Edit: Icon.Pencil, Color: Icon.EyeDropper,
  Markers: Icon.Pin, Fairlight: Icon.Music, Fusion: Icon.Layers,
  Deliver: Icon.Upload,
};

const CLIP_COLORS = [
  "Orange", "Apricot", "Yellow", "Lime", "Olive", "Green", "Teal",
  "Navy", "Blue", "Purple", "Violet", "Pink", "Tan", "Beige",
  "Brown", "Chocolate",
];

const COMPOSITE_MODES: Record<number, string> = {
  0: "Normal", 1: "Add", 2: "Subtract", 3: "Difference", 4: "Multiply",
  5: "Screen", 6: "Overlay", 7: "Hard Light", 8: "Soft Light",
  9: "Darken", 10: "Lighten", 11: "Color Dodge", 12: "Color Burn",
  13: "Exclusion", 14: "Hue", 15: "Saturate", 16: "Colorize",
  17: "Luma Mask", 18: "Divide", 19: "Linear Dodge", 20: "Linear Burn",
  21: "Linear Light", 22: "Vivid Light", 23: "Pin Light", 24: "Hard Mix",
  25: "Lighter Color", 26: "Darker Color", 27: "Foreground",
  28: "Alpha", 29: "Inverted Alpha", 30: "Lum", 31: "Inverted Lum",
};

// ─── Helpers ────────────────────────────────────────────────

function formatShortcut(shortcut: Shortcut): string {
  const modifiers = (shortcut.modifiers || []).map((m) => MODIFIER_SYMBOLS[m]).join("");
  const keyLabel = SPECIAL_KEY_LABELS[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase();
  return modifiers ? `${modifiers}${keyLabel}` : keyLabel;
}

// ─── Value Input Views (search bar as input + presets) ───────

function PresetInputView({ title, currentValue, unit, presets, onApply }: {
  title: string;
  currentValue: string;
  unit?: string;
  presets: { label: string; value: string }[];
  onApply: (value: string) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const suffix = unit || "";

  const applyAction = (val: string) => (
    <ActionPanel>
      <Action title={`Set ${title} to ${val}${suffix}`} icon={Icon.CheckCircle} onAction={() => onApply(val)} />
    </ActionPanel>
  );

  return (
    <List
      searchBarPlaceholder={`Set ${title} \u2014 current: ${currentValue}${suffix}`}
      onSearchTextChange={setInput}
      filtering={false}
    >
      {input && (
        <List.Section title="Custom Value">
          <List.Item
            title={`${input}${suffix}`}
            subtitle={`Set ${title} to ${input}`}
            icon={Icon.ArrowRightCircle}
            actions={applyAction(input)}
          />
        </List.Section>
      )}
      <List.Section title={input ? "Presets" : `Current: ${currentValue}${suffix}  \u2014  pick a preset or type a value`}>
        {presets.map((p) => (
          <List.Item
            key={p.value}
            title={`${p.value}${suffix}`}
            subtitle={p.label}
            icon={p.value === currentValue ? Icon.CheckCircle : Icon.Circle}
            accessories={p.value === currentValue ? [{ tag: "Current" }] : []}
            actions={applyAction(p.value)}
          />
        ))}
      </List.Section>
    </List>
  );
}

const ZOOM_PRESETS = [
  { label: "Half", value: "0.5" },
  { label: "75%", value: "0.75" },
  { label: "Default", value: "1.0" },
  { label: "Slight push", value: "1.08" },
  { label: "125%", value: "1.25" },
  { label: "150%", value: "1.5" },
  { label: "Double", value: "2.0" },
  { label: "Triple", value: "3.0" },
];

const ROTATION_PRESETS = [
  { label: "Reset", value: "0" },
  { label: "Slight tilt right", value: "2" },
  { label: "Slight tilt left", value: "-2" },
  { label: "Quarter right", value: "90" },
  { label: "Quarter left", value: "-90" },
  { label: "Upside down", value: "180" },
  { label: "5\u00B0 right", value: "5" },
  { label: "5\u00B0 left", value: "-5" },
  { label: "45\u00B0 right", value: "45" },
  { label: "45\u00B0 left", value: "-45" },
];

const OPACITY_PRESETS = [
  { label: "Full", value: "100" },
  { label: "Mostly visible", value: "90" },
  { label: "75%", value: "75" },
  { label: "Half", value: "50" },
  { label: "25%", value: "25" },
  { label: "Barely visible", value: "10" },
  { label: "Hidden", value: "0" },
];

const POSITION_PRESETS = [
  { label: "Center", value: "0, 0" },
  { label: "Nudge left", value: "-10, 0" },
  { label: "Nudge right", value: "10, 0" },
  { label: "Nudge up", value: "0, 10" },
  { label: "Nudge down", value: "0, -10" },
  { label: "Left", value: "-100, 0" },
  { label: "Right", value: "100, 0" },
  { label: "Up", value: "0, 100" },
  { label: "Down", value: "0, -100" },
];

function ZoomInput({ currentValue }: { currentValue: number }) {
  return (
    <PresetInputView
      title="Zoom"
      currentValue={String(currentValue)}
      presets={ZOOM_PRESETS}
      onApply={async (input) => {
        const val = parseFloat(input);
        if (isNaN(val) || val <= 0 || val > 100) { await showHUD("Invalid zoom (0-100)"); return; }
        await closeMainWindow();
        try { setProperties({ ZoomX: val, ZoomY: val }); await showHUD(`Zoom set to ${val}`); } catch (e) { await showHUD(`Error: ${e}`); }
      }}
    />
  );
}

function PositionInput({ currentPan, currentTilt }: { currentPan: number; currentTilt: number }) {
  return (
    <PresetInputView
      title="Position"
      currentValue={`${currentPan}, ${currentTilt}`}
      presets={POSITION_PRESETS}
      onApply={async (input) => {
        const parts = input.split(",").map((s) => s.trim());
        const x = parseFloat(parts[0]);
        const y = parts.length > 1 ? parseFloat(parts[1]) : NaN;
        if (isNaN(x) && isNaN(y)) { await showHUD("Enter X or X,Y values"); return; }
        await closeMainWindow();
        try {
          const p: Record<string, number> = {};
          if (!isNaN(x)) p["Pan"] = x;
          if (!isNaN(y)) p["Tilt"] = y;
          setProperties(p);
          await showHUD(`Position: ${!isNaN(x) ? `X=${x}` : ""} ${!isNaN(y) ? `Y=${y}` : ""}`);
        } catch (e) { await showHUD(`Error: ${e}`); }
      }}
    />
  );
}

function RotationInput({ currentValue }: { currentValue: number }) {
  return (
    <PresetInputView
      title="Rotation"
      currentValue={String(currentValue)}
      unit="\u00B0"
      presets={ROTATION_PRESETS}
      onApply={async (input) => {
        const val = parseFloat(input);
        if (isNaN(val) || val < -360 || val > 360) { await showHUD("Invalid angle (-360 to 360)"); return; }
        await closeMainWindow();
        try { setProperty("RotationAngle", val); await showHUD(`Rotation set to ${val}\u00B0`); } catch (e) { await showHUD(`Error: ${e}`); }
      }}
    />
  );
}

function OpacityInput({ currentValue }: { currentValue: number }) {
  return (
    <PresetInputView
      title="Opacity"
      currentValue={String(currentValue)}
      unit="%"
      presets={OPACITY_PRESETS}
      onApply={async (input) => {
        const val = parseFloat(input);
        if (isNaN(val) || val < 0 || val > 100) { await showHUD("Invalid opacity (0-100)"); return; }
        await closeMainWindow();
        try { setProperty("Opacity", val); await showHUD(`Opacity set to ${val}%`); } catch (e) { await showHUD(`Error: ${e}`); }
      }}
    />
  );
}

// ─── Clip Operations Section ────────────────────────────────

function ClipOperationsGrid({ clip, onRefresh }: { clip: ClipInfo; onRefresh: () => void }) {
  return (
    <>
      <Grid.Section title={`Selected: ${clip.name}`} subtitle={`V${clip.trackIndex} \u2022 ${clip.duration} frames`}>
        <Grid.Item
          content={Icon.MagnifyingGlass}
          title="Zoom"
          subtitle={`${clip.zoomX}`}
          keywords={["zoom", "scale", "size"]}
          actions={
            <ActionPanel>
              <Action.Push title="Set Zoom" icon={Icon.MagnifyingGlass} target={<ZoomInput currentValue={clip.zoomX} />} />
              <Action title="Reset to 1.0" onAction={async () => {
                await closeMainWindow();
                try { setProperties({ ZoomX: 1.0, ZoomY: 1.0 }); await showHUD("Zoom reset to 1.0"); } catch (e) { await showHUD(`Error: ${e}`); }
              }} />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={Icon.ArrowsExpand}
          title="Position"
          subtitle={`${clip.pan}, ${clip.tilt}`}
          keywords={["pan", "tilt", "position", "move"]}
          actions={
            <ActionPanel>
              <Action.Push title="Set Position" icon={Icon.ArrowsExpand} target={<PositionInput currentPan={clip.pan} currentTilt={clip.tilt} />} />
              <Action title="Reset to 0, 0" onAction={async () => {
                await closeMainWindow();
                try { setProperties({ Pan: 0, Tilt: 0 }); await showHUD("Position reset"); } catch (e) { await showHUD(`Error: ${e}`); }
              }} />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={Icon.RotateAntiClockwise}
          title="Rotation"
          subtitle={`${clip.rotation}\u00B0`}
          keywords={["rotate", "angle", "rotation"]}
          actions={
            <ActionPanel>
              <Action.Push title="Set Rotation" icon={Icon.RotateAntiClockwise} target={<RotationInput currentValue={clip.rotation} />} />
              <Action title="Reset to 0\u00B0" onAction={async () => {
                await closeMainWindow();
                try { setProperty("RotationAngle", 0); await showHUD("Rotation reset"); } catch (e) { await showHUD(`Error: ${e}`); }
              }} />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={Icon.CircleProgress}
          title="Opacity"
          subtitle={`${clip.opacity}%`}
          keywords={["opacity", "alpha", "transparency"]}
          actions={
            <ActionPanel>
              <Action.Push title="Set Opacity" icon={Icon.CircleProgress} target={<OpacityInput currentValue={clip.opacity} />} />
              <Action title="Reset to 100%" onAction={async () => {
                await closeMainWindow();
                try { setProperty("Opacity", 100); await showHUD("Opacity reset to 100%"); } catch (e) { await showHUD(`Error: ${e}`); }
              }} />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={Icon.Layers}
          title="Composite"
          subtitle={COMPOSITE_MODES[clip.compositeMode] || "Normal"}
          keywords={["composite", "blend", "mode"]}
          actions={
            <ActionPanel>
              <Action title="Set to Normal" onAction={async () => {
                await closeMainWindow();
                try { setProperty("CompositeMode", 0); await showHUD("Composite: Normal"); } catch (e) { await showHUD(`Error: ${e}`); }
              }} />
            </ActionPanel>
          }
        />
      </Grid.Section>

      {/* Clip Actions */}
      <Grid.Section title="Clip Actions">
        <Grid.Item
          content={clip.enabled ? Icon.Eye : Icon.EyeDisabled}
          title={clip.enabled ? "Disable Clip" : "Enable Clip"}
          keywords={["enable", "disable", "toggle", "visibility"]}
          actions={
            <ActionPanel>
              <Action
                title={clip.enabled ? "Disable Clip" : "Enable Clip"}
                onAction={async () => {
                  await closeMainWindow();
                  try {
                    setClipEnabled(!clip.enabled);
                    await showHUD(clip.enabled ? "Clip disabled" : "Clip enabled");
                    onRefresh();
                  } catch (e) { await showHUD(`Error: ${e}`); }
                }}
              />
            </ActionPanel>
          }
        />
        <Grid.Item
          content={{ color: Color.SecondaryText }}
          title="Clear Clip Color"
          keywords={["clear", "remove", "color"]}
          actions={
            <ActionPanel>
              <Action
                title="Clear Clip Color"
                onAction={async () => {
                  await closeMainWindow();
                  try { clearClipColor(); await showHUD("Clip color cleared"); onRefresh(); } catch (e) { await showHUD(`Error: ${e}`); }
                }}
              />
            </ActionPanel>
          }
        />
      </Grid.Section>

      {/* Clip Colors */}
      <Grid.Section title="Set Clip Color" subtitle={clip.clipColor || "None"}>
        {CLIP_COLORS.map((color) => (
          <Grid.Item
            key={color}
            content={Icon.CircleFilled}
            title={color}
            keywords={["color", color.toLowerCase()]}
            actions={
              <ActionPanel>
                <Action
                  title={`Set Color: ${color}`}
                  onAction={async () => {
                    await closeMainWindow();
                    try { setClipColor(color); await showHUD(`Clip color: ${color}`); onRefresh(); } catch (e) { await showHUD(`Error: ${e}`); }
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </>
  );
}

// ─── Keyboard Shortcuts Section ─────────────────────────────

function KeyboardShortcutsGrid({ filterCategory }: { filterCategory: string }) {
  const filtered = filterCategory === "all"
    ? commands
    : commands.filter((cmd) => cmd.category === filterCategory);

  const grouped: Partial<Record<Category, typeof commands>> = {};
  for (const cmd of filtered) {
    if (!grouped[cmd.category]) grouped[cmd.category] = [];
    grouped[cmd.category]!.push(cmd);
  }

  return (
    <>
      {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
        <Grid.Section title={cat} subtitle={`${grouped[cat]!.length}`} key={cat}>
          {grouped[cat]!.map((cmd) => (
            <Grid.Item
              key={cmd.id}
              content={CATEGORY_ICONS[cmd.category]}
              title={cmd.name}
              subtitle={formatShortcut(cmd.shortcut)}
              keywords={[cmd.category, cmd.name]}
              actions={
                <ActionPanel>
                  <Action
                    title="Send to DaVinci Resolve"
                    icon={Icon.Play}
                    onAction={async () => {
                      await closeMainWindow();
                      await sendShortcut(cmd.shortcut);
                      await showHUD(`Sent: ${cmd.name}`);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </>
  );
}

// ─── Main Command ───────────────────────────────────────────

export default function Command() {
  const [state, setState] = useState<TimelineState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<string>("auto");

  function refresh() {
    setIsLoading(true);
    try {
      const s = getTimelineState();
      setState(s);
    } catch {
      setState({ connected: false, page: "", projectName: "", timelineName: "", clip: null });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const hasClip = state?.connected && state.clip !== null;

  // In "auto" mode: if clip selected, show clip ops. If "shortcuts", always show shortcuts.
  const showClipOps = mode === "auto" ? hasClip : mode === "clip";

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      searchBarPlaceholder={
        showClipOps
          ? `Clip: ${state?.clip?.name || ""}  \u2014  Search operations...`
          : "Search DaVinci Resolve commands..."
      }
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="View Mode"
          onChange={(newValue) => setMode(newValue)}
        >
          <Grid.Dropdown.Item
            title={hasClip ? `Auto (Clip: ${state?.clip?.name})` : "Auto (No Clip)"}
            value="auto"
            icon={Icon.Wand}
          />
          <Grid.Dropdown.Item title="Clip Operations" value="clip" icon={Icon.Pencil} />
          <Grid.Dropdown.Section title="Shortcuts by Category">
            <Grid.Dropdown.Item title="All Shortcuts" value="shortcuts-all" icon={Icon.AppWindowGrid3x3} />
            {CATEGORY_ORDER.map((cat) => (
              <Grid.Dropdown.Item key={cat} title={cat} value={`shortcuts-${cat}`} icon={CATEGORY_ICONS[cat]} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {showClipOps && state?.clip ? (
        <ClipOperationsGrid clip={state.clip} onRefresh={refresh} />
      ) : (
        <KeyboardShortcutsGrid
          filterCategory={mode.startsWith("shortcuts-") ? mode.replace("shortcuts-", "") : "all"}
        />
      )}
    </Grid>
  );
}
