import { execSync } from "child_process";
import { Shortcut } from "./types";

// Map of special keys to their AppleScript key codes
const KEY_CODES: Record<string, number> = {
  // Function keys
  f1: 122,
  f2: 120,
  f3: 99,
  f4: 118,
  f5: 96,
  f6: 97,
  f7: 98,
  f8: 100,
  f9: 101,
  f10: 109,
  f11: 103,
  f12: 111,
  // Navigation
  home: 115,
  end: 119,
  pageup: 116,
  pagedown: 121,
  // Arrow keys
  up: 126,
  down: 125,
  left: 123,
  right: 124,
  // Special keys
  space: 49,
  return: 36,
  enter: 36,
  tab: 48,
  escape: 53,
  delete: 51,
  forwarddelete: 117,
};

function isSpecialKey(key: string): boolean {
  return key.toLowerCase() in KEY_CODES;
}

function buildModifierClause(modifiers?: string[]): string {
  if (!modifiers || modifiers.length === 0) return "";
  const parts = modifiers.map((m) => {
    switch (m) {
      case "command":
        return "command down";
      case "shift":
        return "shift down";
      case "option":
        return "option down";
      case "control":
        return "control down";
      default:
        return "";
    }
  });
  return ` using {${parts.join(", ")}}`;
}

export async function sendShortcut(shortcut: Shortcut): Promise<void> {
  const usingClause = buildModifierClause(shortcut.modifiers);

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
