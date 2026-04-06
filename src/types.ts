export type Modifier = "command" | "shift" | "option" | "control";

export type Category =
  | "General"
  | "Playback"
  | "Navigation"
  | "Timeline"
  | "Edit"
  | "Color"
  | "Markers"
  | "Fairlight"
  | "Fusion"
  | "Deliver";

export interface Shortcut {
  key: string;
  modifiers?: Modifier[];
}

export interface ResolveCommand {
  id: string;
  name: string;
  category: Category;
  shortcut: Shortcut;
  description?: string;
  icon?: string;
}
