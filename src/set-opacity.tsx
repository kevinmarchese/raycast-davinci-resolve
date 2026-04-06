import { LaunchProps, showHUD } from "@raycast/api";
import { setProperty } from "./resolve-api";

interface Arguments {
  value: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const value = parseFloat(props.arguments.value);
  if (isNaN(value) || value < 0 || value > 100) {
    await showHUD("Invalid opacity (must be 0-100)");
    return;
  }

  try {
    setProperty("Opacity", value);
    await showHUD(`Opacity set to ${value}%`);
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
