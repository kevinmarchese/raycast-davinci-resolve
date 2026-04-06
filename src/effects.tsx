import { Grid, ActionPanel, Action, showHUD, Icon, closeMainWindow } from "@raycast/api";
import { useState } from "react";
import { effects, EffectCategory, EFFECT_CATEGORY_ICONS } from "./effects-data";
import { addFusionEffect, insertTitleOnTop } from "./resolve-api";

const CATEGORY_ORDER: EffectCategory[] = [
  "Blur",
  "Sharpen",
  "Stylize",
  "Color",
  "Transform",
  "Titles",
  "Generators",
];

export default function Command() {
  const [category, setCategory] = useState<string>("all");

  const filtered = category === "all"
    ? effects
    : effects.filter((fx) => fx.category === category);

  const grouped: Partial<Record<EffectCategory, typeof effects>> = {};
  for (const fx of filtered) {
    if (!grouped[fx.category]) {
      grouped[fx.category] = [];
    }
    grouped[fx.category]!.push(fx);
  }

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Medium}
      searchBarPlaceholder="Search effects..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Category"
          storeValue={true}
          onChange={(newValue) => setCategory(newValue)}
        >
          <Grid.Dropdown.Item title="All" value="all" icon={Icon.AppWindowGrid3x3} />
          <Grid.Dropdown.Section title="Categories">
            {CATEGORY_ORDER
              .filter((cat) => effects.some((fx) => fx.category === cat))
              .map((cat) => (
                <Grid.Dropdown.Item
                  key={cat}
                  title={cat}
                  value={cat}
                  icon={EFFECT_CATEGORY_ICONS[cat]}
                />
              ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
        <Grid.Section title={cat} subtitle={`${grouped[cat]!.length}`} key={cat}>
          {grouped[cat]!.map((fx) => (
            <Grid.Item
              key={fx.id}
              content={EFFECT_CATEGORY_ICONS[fx.category]}
              title={fx.name}
              subtitle={fx.description}
              keywords={[fx.category, fx.name, fx.type]}
              actions={
                <ActionPanel>
                  <Action
                    title={fx.type === "title" ? "Place on Timeline" : "Apply to Selected Clip"}
                    icon={fx.type === "title" ? Icon.Plus : Icon.Wand}
                    onAction={async () => {
                      await closeMainWindow();
                      try {
                        if (fx.type === "fusion") {
                          addFusionEffect(fx.toolId);
                          await showHUD(`Applied: ${fx.name}`);
                        } else if (fx.type === "title") {
                          insertTitleOnTop(fx.toolId);
                          await showHUD(`Placed: ${fx.name}`);
                        }
                      } catch (error) {
                        await showHUD(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
                      }
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
