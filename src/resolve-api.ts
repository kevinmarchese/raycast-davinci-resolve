import { execSync } from "child_process";

const RESOLVE_SCRIPT_MODULES =
  "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules/";

const PREAMBLE_TIMELINE = `
import sys, time
sys.path.append('${RESOLVE_SCRIPT_MODULES}')
import DaVinciResolveScript as bmd

resolve = bmd.scriptapp('Resolve')
if not resolve:
    print('ERROR:Could not connect to DaVinci Resolve')
    sys.exit(1)

pm = resolve.GetProjectManager()
proj = pm.GetCurrentProject()
if not proj:
    print('ERROR:No project open')
    sys.exit(1)

tl = proj.GetCurrentTimeline()
if not tl:
    print('ERROR:No timeline open')
    sys.exit(1)
`;

const PREAMBLE_CLIP = `${PREAMBLE_TIMELINE}
item = tl.GetCurrentVideoItem()
if not item:
    print('ERROR:No clip selected')
    sys.exit(1)
`;

function execPython(script: string): string {
  const escaped = script.replace(/'/g, "'\\''");
  const result = execSync(`python3 -c '${escaped}'`, {
    timeout: 15000,
    encoding: "utf-8",
  }).trim();

  if (result.startsWith("ERROR:")) {
    throw new Error(result.substring(6));
  }

  return result;
}

function runWithClip(script: string): string {
  return execPython(`${PREAMBLE_CLIP}\n${script}`);
}

function runWithTimeline(script: string): string {
  return execPython(`${PREAMBLE_TIMELINE}\n${script}`);
}

// ─── Timeline state detection ───────────────────────────────

export interface ClipInfo {
  name: string;
  duration: number;
  clipColor: string;
  enabled: boolean;
  trackType: string;
  trackIndex: number;
  zoomX: number;
  zoomY: number;
  pan: number;
  tilt: number;
  rotation: number;
  opacity: number;
  compositeMode: number;
}

export interface TimelineState {
  connected: boolean;
  page: string;
  projectName: string;
  timelineName: string;
  clip: ClipInfo | null;
}

export function getTimelineState(): TimelineState {
  try {
    const result = execPython(`
import sys, json
sys.path.append('${RESOLVE_SCRIPT_MODULES}')
import DaVinciResolveScript as bmd

resolve = bmd.scriptapp('Resolve')
if not resolve:
    print(json.dumps({"connected": False}))
    sys.exit(0)

page = resolve.GetCurrentPage() or ""
pm = resolve.GetProjectManager()
proj = pm.GetCurrentProject()
proj_name = proj.GetName() if proj else ""
tl = proj.GetCurrentTimeline() if proj else None
tl_name = tl.GetName() if tl else ""

clip_info = None
if tl:
    item = tl.GetCurrentVideoItem()
    if item:
        props = item.GetProperty()
        track = item.GetTrackTypeAndIndex()
        clip_info = {
            "name": item.GetName(),
            "duration": item.GetDuration(),
            "clipColor": item.GetClipColor() or "",
            "enabled": item.GetClipEnabled(),
            "trackType": track[0],
            "trackIndex": track[1],
            "zoomX": props.get("ZoomX", 1.0),
            "zoomY": props.get("ZoomY", 1.0),
            "pan": props.get("Pan", 0.0),
            "tilt": props.get("Tilt", 0.0),
            "rotation": props.get("RotationAngle", 0.0),
            "opacity": props.get("Opacity", 100.0),
            "compositeMode": props.get("CompositeMode", 0),
        }

state = {
    "connected": True,
    "page": page,
    "projectName": proj_name,
    "timelineName": tl_name,
    "clip": clip_info,
}
print(json.dumps(state))
`);
    return JSON.parse(result);
  } catch {
    return {
      connected: false,
      page: "",
      projectName: "",
      timelineName: "",
      clip: null,
    };
  }
}

// ─── Clip operations (require selected clip) ────────────────

export function setClipColor(color: string): void {
  const result = runWithClip(`
result = item.SetClipColor('${color}')
if not result:
    print('ERROR:Failed to set clip color')
    sys.exit(1)
print('OK')
`);
  if (result !== "OK") {
    throw new Error("Failed to set clip color");
  }
}

export function clearClipColor(): void {
  runWithClip(`
item.ClearClipColor()
print('OK')
`);
}

export function setClipEnabled(enabled: boolean): void {
  const pyVal = enabled ? "True" : "False";
  const result = runWithClip(`
result = item.SetClipEnabled(${pyVal})
if not result:
    print('ERROR:Failed to set clip enabled')
    sys.exit(1)
print('OK')
`);
  if (result !== "OK") {
    throw new Error("Failed to set clip enabled");
  }
}

// ─── Property getters/setters (require selected clip) ───────

export function getProperty(key: string): string {
  return runWithClip(`print(item.GetProperty('${key}'))`);
}

export function setProperty(key: string, value: number | boolean): void {
  const pyValue = typeof value === "boolean" ? (value ? "True" : "False") : String(value);
  const result = runWithClip(`
result = item.SetProperty('${key}', ${pyValue})
if not result:
    print('ERROR:Failed to set ${key}')
    sys.exit(1)
print('OK')
`);
  if (result !== "OK") {
    throw new Error(`Failed to set ${key}`);
  }
}

export function setProperties(props: Record<string, number | boolean>): void {
  const assignments = Object.entries(props)
    .map(([key, value]) => {
      const pyValue = typeof value === "boolean" ? (value ? "True" : "False") : String(value);
      return `
if not item.SetProperty('${key}', ${pyValue}):
    print('ERROR:Failed to set ${key}')
    sys.exit(1)`;
    })
    .join("\n");

  const result = runWithClip(`${assignments}\nprint('OK')`);
  if (result !== "OK") {
    throw new Error("Failed to set properties");
  }
}

export function getCurrentClipName(): string {
  return runWithClip("print(item.GetName())");
}

