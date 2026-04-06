/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
  /** Preferences accessible in the `set-zoom` command */
  export type SetZoom = ExtensionPreferences & {}
  /** Preferences accessible in the `set-pan` command */
  export type SetPan = ExtensionPreferences & {}
  /** Preferences accessible in the `set-rotation` command */
  export type SetRotation = ExtensionPreferences & {}
  /** Preferences accessible in the `set-opacity` command */
  export type SetOpacity = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
  /** Arguments passed to the `set-zoom` command */
  export type SetZoom = {
  /** e.g. 1.08 */
  "value": string
}
  /** Arguments passed to the `set-pan` command */
  export type SetPan = {
  /** Pan X */
  "x": string,
  /** Pan Y */
  "y": string
}
  /** Arguments passed to the `set-rotation` command */
  export type SetRotation = {
  /** e.g. 45 */
  "angle": string
}
  /** Arguments passed to the `set-opacity` command */
  export type SetOpacity = {
  /** e.g. 80 */
  "value": string
}
}

