import { LaunchProps, showHUD } from "@raycast/api";
import { setProperties } from "./resolve-api";

interface Arguments {
  value: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const value = parseFloat(props.arguments.value);
  if (isNaN(value) || value <= 0 || value > 100) {
    await showHUD("Invalid zoom value (must be 0-100)");
    return;
  }

  try {
    setProperties({ ZoomX: value, ZoomY: value });
    await showHUD(`Zoom set to ${value}`);
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
