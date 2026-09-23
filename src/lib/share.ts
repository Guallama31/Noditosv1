import type { MindNode } from "../types";
import { sanitizeNode } from "./tree";

const SHARE_PREFIX = "#map=";
const SHARE_APP = "NoditosShare";

function encodeUnicode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeUnicode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function createShareUrl(root: MindNode, title: string, baseUrl = window.location.href): string {
  const url = new URL(baseUrl);
  url.hash = `${SHARE_PREFIX.slice(1)}${encodeUnicode(JSON.stringify({ app: SHARE_APP, version: 1, title, root }))}`;
  return url.toString();
}

export function parseShareHash(hash = window.location.hash): { root: MindNode; title: string } | null {
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  try {
    const decoded = decodeUnicode(hash.slice(SHARE_PREFIX.length));
    const obj = JSON.parse(decoded) as Record<string, unknown>;
    if (obj.app !== SHARE_APP || !obj.root) return null;
    return {
      root: sanitizeNode(obj.root),
      title: typeof obj.title === "string" && obj.title.trim() ? obj.title : "Mapa compartido",
    };
  } catch {
    return null;
  }
}

export function clearShareHash() {
  if (typeof window === "undefined" || !window.location.hash.startsWith(SHARE_PREFIX)) return;
  history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
}
