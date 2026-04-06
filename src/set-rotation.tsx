import { LaunchProps, showHUD } from "@raycast/api";
import { setProperty } from "./resolve-api";

interface Arguments {
  angle: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const angle = parseFloat(props.arguments.angle);
  if (isNaN(angle) || angle < -360 || angle > 360) {
    await showHUD("Invalid angle (must be -360 to 360)");
    return;
  }

  try {
    setProperty("RotationAngle", angle);
    await showHUD(`Rotation set to ${angle}\u00B0`);
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
