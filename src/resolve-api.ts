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

// ─── Fusion effects (require selected clip) ─────────────────

export function addFusionEffect(toolId: string, toolSettings?: Record<string, string>): void {
  const settingsCode = toolSettings
    ? Object.entries(toolSettings)
        .map(([k, v]) => `tool['${k}'] = ${v}`)
        .join("\n")
    : "";

  const result = runWithClip(`
# Check for existing Fusion comp or create one
comp_count = item.GetFusionCompCount()
if comp_count > 0:
    comp = item.GetFusionCompByIndex(1)
else:
    comp = item.AddFusionComp()

if not comp:
    print('ERROR:Could not create Fusion composition')
    sys.exit(1)

# Add the tool
tool = comp.AddTool('${toolId}', -32768, -32768)
if not tool:
    print('ERROR:Could not add ${toolId}')
    sys.exit(1)

${settingsCode}

# Wire it: find MediaIn and MediaOut, insert tool between them
media_in = comp.FindTool('MediaIn1')
media_out = comp.FindTool('MediaOut1')

if media_in and media_out:
    # Find what's currently connected to MediaOut
    # Disconnect and rewire: ... -> tool -> MediaOut
    tool.Input.ConnectTo(media_in.Output)
    media_out.Input.ConnectTo(tool.Output)

print('OK')
`);
  if (result !== "OK") {
    throw new Error(`Failed to add effect ${toolId}`);
  }
}

// ─── Title/generator insertion (requires timeline only) ─────

export function insertTitleOnTop(titleName: string): void {
  const result = runWithTimeline(`
video_tracks = tl.GetTrackCount('video')
audio_tracks = tl.GetTrackCount('audio')

# Save original lock state
video_was_locked = {i: tl.GetIsTrackLocked('video', i) for i in range(1, video_tracks + 1)}
audio_was_locked = {i: tl.GetIsTrackLocked('audio', i) for i in range(1, audio_tracks + 1)}

# Lock all tracks except top video track
for i in range(1, video_tracks + 1):
    tl.SetTrackLock('video', i, True)
for i in range(1, audio_tracks + 1):
    tl.SetTrackLock('audio', i, True)
tl.SetTrackLock('video', video_tracks, False)

time.sleep(0.3)

# Insert title
result = tl.InsertFusionTitleIntoTimeline('${titleName}')

# Restore lock state
for i in range(1, video_tracks + 1):
    tl.SetTrackLock('video', i, video_was_locked[i])
for i in range(1, audio_tracks + 1):
    tl.SetTrackLock('audio', i, audio_was_locked[i])

if not result:
    print('ERROR:Failed to insert ${titleName}')
    sys.exit(1)

info = result.GetTrackTypeAndIndex()
print(f'OK:Placed on {info[0]} track {info[1]}')
`);
  if (!result.startsWith("OK")) {
    throw new Error(`Failed to insert ${titleName}`);
  }
}

export function insertGeneratorOnTop(generatorName: string): void {
  const result = runWithTimeline(`
video_tracks = tl.GetTrackCount('video')
audio_tracks = tl.GetTrackCount('audio')

video_was_locked = {i: tl.GetIsTrackLocked('video', i) for i in range(1, video_tracks + 1)}
audio_was_locked = {i: tl.GetIsTrackLocked('audio', i) for i in range(1, audio_tracks + 1)}

for i in range(1, video_tracks + 1):
    tl.SetTrackLock('video', i, True)
for i in range(1, audio_tracks + 1):
    tl.SetTrackLock('audio', i, True)
tl.SetTrackLock('video', video_tracks, False)

time.sleep(0.3)

result = tl.InsertFusionGeneratorIntoTimeline('${generatorName}')

for i in range(1, video_tracks + 1):
    tl.SetTrackLock('video', i, video_was_locked[i])
for i in range(1, audio_tracks + 1):
    tl.SetTrackLock('audio', i, audio_was_locked[i])

if not result:
    print('ERROR:Failed to insert ${generatorName}')
    sys.exit(1)

print('OK')
`);
  if (result !== "OK") {
    throw new Error(`Failed to insert ${generatorName}`);
  }
}
