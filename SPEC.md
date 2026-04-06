# Raycast DaVinci Resolve Commander - Project Spec

## Overview

A Raycast extension that provides a searchable command palette for DaVinci Resolve. Users invoke the extension, browse or search through available DaVinci Resolve commands, and execute them directly — sending keyboard shortcuts or scripting API calls to the running DaVinci Resolve instance.

## Problem

DaVinci Resolve has 150+ keyboard shortcuts and hundreds of menu actions across multiple pages (Edit, Color, Fusion, Fairlight, Deliver). Remembering all of them is impractical. This extension gives users instant, fuzzy-searchable access to any command without leaving their workflow.

## User Flow

1. User activates Raycast (default: `Cmd+Space`)
2. Types the extension trigger (e.g., "Resolve" or a configured hotkey)
3. A **List view** appears showing all available DaVinci Resolve commands
4. User can:
   - **Arrow key** through the list
   - **Type to filter** commands via Raycast's built-in fuzzy search
   - See commands organized by **category** (Edit, Color, Playback, Timeline, etc.)
5. User selects a command and presses **Enter**
6. The extension:
   - Activates DaVinci Resolve (brings it to foreground)
   - Sends the corresponding keyboard shortcut via AppleScript
   - Returns focus context (optional: stay in Resolve or return to previous app)

## Technical Architecture

### Stack

- **Language:** TypeScript + React (JSX)
- **Framework:** `@raycast/api`
- **Command Dispatch:** `runAppleScript()` from `@raycast/utils`
- **Target App Communication:** AppleScript → System Events → DaVinci Resolve

### Project Structure

```
raycast-davinci-resolve/
├── package.json          # Raycast manifest + dependencies
├── tsconfig.json
├── eslint.config.js
├── assets/
│   └── extension-icon.png   # DaVinci Resolve-themed icon
├── src/
│   ├── index.tsx             # Main List command entry point
│   ├── commands.ts           # Command definitions (name, shortcut, category)
│   ├── send-shortcut.ts      # AppleScript keystroke sender utility
│   └── types.ts              # TypeScript interfaces
└── metadata/
    └── screenshot-1.png
```

### Command Data Model

```typescript
interface ResolveCommand {
  id: string;
  name: string;           // Human-readable name, e.g. "Blade Tool"
  category: Category;     // "Edit" | "Color" | "Playback" | "Timeline" | "Navigation" | "Fairlight" | "Fusion" | "General"
  shortcut: Shortcut;     // Key + modifiers to send
  description?: string;   // Optional tooltip/subtitle
  icon?: string;          // Optional per-command icon
}

interface Shortcut {
  key: string;            // e.g. "b", "space", "return"
  modifiers?: Modifier[]; // e.g. ["command"], ["command", "shift"]
}

type Modifier = "command" | "shift" | "option" | "control";
```

### Command Dispatch (AppleScript)

The core mechanism uses `osascript` via `child_process.execSync` to send keystrokes to DaVinci Resolve via macOS System Events.

**Critical implementation notes:**

1. **`closeMainWindow()` must be called before sending the shortcut.** Raycast's window captures keystrokes if it's still open, preventing them from reaching DaVinci Resolve.
2. **The System Events process name is `"Resolve"`**, not `"DaVinci Resolve"`. The `activate` approach (`tell application "DaVinci Resolve" to activate`) does not reliably bring Resolve to the foreground for keystroke delivery. Instead, use `set frontmost of process "Resolve" to true`.
3. **Keystrokes must be sent at the top-level System Events scope**, not inside a `tell process "Resolve"` block. Sending them to the frontmost app via System Events directly is what works.
4. **`runAppleScript` from `@raycast/utils` does not reliably deliver keystrokes** to other apps when called from a Raycast extension. Use `child_process.execSync` with `osascript` instead.
5. **Special keys** (F-keys, arrows, Space, Home, End, Delete, etc.) require `key code` instead of `keystroke`.

```typescript
import { execSync } from "child_process";

async function sendShortcut(shortcut: Shortcut): Promise<void> {
  // Build modifier clause
  const usingClause = buildModifierClause(shortcut.modifiers);

  // Use key code for special keys, keystroke for regular characters
  let keystrokeCommand: string;
  if (isSpecialKey(shortcut.key)) {
    const code = KEY_CODES[shortcut.key.toLowerCase()];
    keystrokeCommand = `key code ${code}${usingClause}`;
  } else {
    keystrokeCommand = `keystroke "${shortcut.key}"${usingClause}`;
  }

  const script = `
    tell application "System Events"
      set frontmost of process "Resolve" to true
    end tell
    delay 0.5
    tell application "System Events"
      ${keystrokeCommand}
    end tell
  `;

  const escaped = script.replace(/'/g, "'\\''");
  execSync(`osascript -e '${escaped}'`, { timeout: 10000 });
}
```

**In the action handler (index.tsx):**
```typescript
onAction={async () => {
  await closeMainWindow();  // MUST close Raycast window first
  await sendShortcut(cmd.shortcut);
  await showHUD(`Sent: ${cmd.name}`);
}}
```

### Command Categories & Initial Command Set

Commands will be organized into these categories, covering the most-used actions:

| Category     | Example Commands |
|-------------|-----------------|
| **General**     | Undo, Redo, Save Project, Project Settings, Keyboard Customization |
| **Playback**    | Play/Stop, Play Reverse, Play Around Current, Loop Playback |
| **Navigation**  | Go to Start, Go to End, Next Edit, Previous Edit, Next Clip, Previous Clip |
| **Timeline**    | Blade Tool, Selection Mode, Trim Mode, Snapping Toggle, Linked Selection |
| **Edit**        | Ripple Delete, Cut, Copy, Paste, Select All, Deselect All |
| **Color**       | Add Node, Reset Node, Enable/Disable Node, Toggle Viewer LUT |
| **Fairlight**   | Toggle Mixer, Solo Track, Mute Track |
| **Fusion**      | Add Tool, Merge Node |
| **Markers**     | Add Marker, Clear Marker, Next Marker, Previous Marker |
| **Deliver**     | Add to Render Queue, Start Render |

**Target: 80-100 commands at launch**, covering the most frequently used actions across all pages.

### List View UI

```tsx
<List searchBarPlaceholder="Search DaVinci Resolve commands...">
  {categories.map(category => (
    <List.Section title={category} key={category}>
      {commandsByCategory[category].map(cmd => (
        <List.Item
          key={cmd.id}
          title={cmd.name}
          subtitle={formatShortcut(cmd.shortcut)}
          icon={cmd.icon || categoryIcon(category)}
          accessories={[{ tag: category }]}
          actions={
            <ActionPanel>
              <Action
                title="Send to DaVinci Resolve"
                onAction={() => sendShortcut(cmd.shortcut)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  ))}
</List>
```

## Requirements

### Must Have (MVP)

- [ ] Searchable List view with all commands
- [ ] Category-based grouping (sections)
- [ ] Fuzzy search filtering via Raycast built-in
- [ ] Send keyboard shortcut to DaVinci Resolve on command selection
- [ ] Activate DaVinci Resolve before sending shortcut
- [ ] 80+ commands covering Edit, Color, Playback, Timeline, Navigation pages
- [ ] Display the keyboard shortcut as subtitle for each command
- [ ] macOS only (AppleScript dependency)

### Nice to Have (Post-MVP)

- [ ] Favorites / recently used commands pinned to top
- [ ] User-configurable custom commands via Raycast preferences
- [ ] DaVinci Resolve scripting API integration for non-shortcut actions (e.g., "Create New Timeline", "Switch to Color Page")
- [ ] Command context awareness (show relevant commands based on active Resolve page)
- [ ] Submittable to the Raycast Store

## Prerequisites

- macOS (AppleScript/System Events requirement)
- DaVinci Resolve must be running
- macOS Accessibility permissions granted to Raycast (System Preferences > Privacy & Security > Accessibility)
- Raycast installed

## Dependencies

- `@raycast/api` — Raycast extension framework
- `@raycast/utils` — Utility functions including `runAppleScript`

## Development

```bash
# Create extension scaffold
npx create-raycast-extension@latest

# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Build for distribution
npm run build
```

## References

- [Raycast Developer Docs](https://developers.raycast.com)
- [Raycast API — runAppleScript](https://developers.raycast.com/utilities/functions/runapplescript)
- [Raycast File Structure](https://developers.raycast.com/information/file-structure)
- [DaVinci Resolve Scripting API (Unofficial Docs)](https://deric.github.io/DaVinciResolve-API-Docs/)
- [DaVinci Resolve Scripting API v20.3](https://gist.github.com/X-Raym/2f2bf453fc481b9cca624d7ca0e19de8)
- [DaVinci Resolve Keyboard Shortcuts Guide](https://www.simonsaysai.com/blog/davinci-resolve-keyboard-shortcuts)
- [Complete DaVinci Resolve Shortcuts](https://motionarray.com/learn/davinci-resolve/davinci-resolve-keyboard-shortcuts/)
