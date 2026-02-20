import * as vscode from "vscode";
import * as path from "path";

function hashToColor(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  const hex = (hash & 0xffffff).toString(16).padStart(6, "0");
  return `#${hex}`;
}

function contrastForeground(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

function dimColor(hex: string, factor = 0.6): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function activate(context: vscode.ExtensionContext) {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return;
  }

  const folderName = path.basename(folders[0].uri.fsPath);
  const bg = hashToColor(folderName);
  const fg = contrastForeground(bg);
  const inactiveBg = dimColor(bg);
  const inactiveFg = contrastForeground(inactiveBg);

  const config = vscode.workspace.getConfiguration("workbench");
  const existing = config.get<Record<string, string>>("colorCustomizations") ?? {};

  config.update(
    "colorCustomizations",
    {
      ...existing,
      "titleBar.activeBackground": bg,
      "titleBar.activeForeground": fg,
      "titleBar.inactiveBackground": inactiveBg,
      "titleBar.inactiveForeground": inactiveFg,
    },
    vscode.ConfigurationTarget.Workspace
  );
}

export function deactivate() {}
