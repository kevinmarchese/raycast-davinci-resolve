import { LaunchProps, showHUD } from "@raycast/api";
import { setProperties } from "./resolve-api";

interface Arguments {
  x: string;
  y: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const x = parseFloat(props.arguments.x);
  const y = parseFloat(props.arguments.y);

  if (isNaN(x) && isNaN(y)) {
    await showHUD("Enter at least one value for Pan X or Y");
    return;
  }

  try {
    const props_to_set: Record<string, number> = {};
    if (!isNaN(x)) props_to_set["Pan"] = x;
    if (!isNaN(y)) props_to_set["Tilt"] = y;
    setProperties(props_to_set);

    const parts: string[] = [];
    if (!isNaN(x)) parts.push(`X: ${x}`);
    if (!isNaN(y)) parts.push(`Y: ${y}`);
    await showHUD(`Pan set to ${parts.join(", ")}`);
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
