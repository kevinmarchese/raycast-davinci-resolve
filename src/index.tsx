import { Grid, ActionPanel, Action, showHUD, Icon, closeMainWindow } from "@raycast/api";
import { useState } from "react";
import { commands } from "./commands";
import { sendShortcut } from "./send-shortcut";
import { Category, Modifier, Shortcut } from "./types";

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
  space: "Space",
  return: "Return",
  enter: "Enter",
  tab: "Tab",
  escape: "Esc",
  delete: "Delete",
  forwarddelete: "Fwd Del",
  up: "\u2191",
  down: "\u2193",
  left: "\u2190",
  right: "\u2192",
  home: "Home",
  end: "End",
  pageup: "Page Up",
  pagedown: "Page Down",
  f1: "F1",
  f2: "F2",
  f3: "F3",
  f4: "F4",
  f5: "F5",
  f6: "F6",
  f7: "F7",
  f8: "F8",
  f9: "F9",
  f10: "F10",
  f11: "F11",
  f12: "F12",
};

const CATEGORY_ICONS: Record<Category, Icon> = {
  General: Icon.Gear,
  Navigation: Icon.ArrowRight,
  Playback: Icon.Play,
  Timeline: Icon.BarChart,
  Edit: Icon.Pencil,
  Color: Icon.EyeDropper,
  Markers: Icon.Pin,
  Fairlight: Icon.Music,
  Fusion: Icon.Layers,
  Deliver: Icon.Upload,
};

function formatShortcut(shortcut: Shortcut): string {
  const modifiers = (shortcut.modifiers || []).map((m) => MODIFIER_SYMBOLS[m]).join("");
  const keyLabel =
    SPECIAL_KEY_LABELS[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase();
  return modifiers ? `${modifiers}${keyLabel}` : keyLabel;
}

export default function Command() {
  const [category, setCategory] = useState<string>("all");

  const filtered = category === "all"
    ? commands
    : commands.filter((cmd) => cmd.category === category);

  const grouped: Partial<Record<Category, typeof commands>> = {};
  for (const cmd of filtered) {
    if (!grouped[cmd.category]) {
      grouped[cmd.category] = [];
    }
    grouped[cmd.category]!.push(cmd);
  }

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Medium}
      searchBarPlaceholder="Search DaVinci Resolve commands..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Category"
          storeValue={true}
          onChange={(newValue) => setCategory(newValue)}
        >
          <Grid.Dropdown.Item title="All" value="all" icon={Icon.AppWindowGrid3x3} />
          <Grid.Dropdown.Section title="Categories">
            {CATEGORY_ORDER.map((cat) => (
              <Grid.Dropdown.Item
                key={cat}
                title={cat}
                value={cat}
                icon={CATEGORY_ICONS[cat]}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
        <Grid.Section title={cat} subtitle={`${grouped[cat]!.length}`} key={cat}>
          {grouped[cat]!.map((cmd) => (
            <Grid.Item
              key={cmd.id}
              content={CATEGORY_ICONS[cmd.category]}
              title={cmd.name}
              subtitle={formatShortcut(cmd.shortcut)}
              keywords={[cmd.category, cmd.name, formatShortcut(cmd.shortcut)]}
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
    </Grid>
  );
}
