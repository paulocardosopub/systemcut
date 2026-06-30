import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_DIR = process.env.STORAGE_DIR || "./storage";

export function storageRoot() {
  return path.resolve(process.cwd(), STORAGE_DIR);
}

export function storagePath(...parts: string[]) {
  return path.join(storageRoot(), ...parts);
}

export async function ensureStorageDirs() {
  await Promise.all([
    fs.mkdir(storagePath("uploads"), { recursive: true }),
    fs.mkdir(storagePath("audio"), { recursive: true }),
    fs.mkdir(storagePath("thumbnails"), { recursive: true }),
    fs.mkdir(storagePath("exports"), { recursive: true }),
    fs.mkdir(storagePath("tmp"), { recursive: true })
  ]);
}

export function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140);
}

export function storageUrl(filePath?: string | null) {
  if (!filePath) return null;

  const relative = path.relative(storageRoot(), filePath);
  if (relative.startsWith("..")) return null;

  const encoded = relative
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/storage/${encoded}`;
}

export function resolveStorageSegments(segments: string[]) {
  const target = path.resolve(storageRoot(), ...segments);
  const root = storageRoot();

  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error("Caminho de arquivo invalido.");
  }

  return target;
}

export function fileExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

export const allowedVideoExtensions = new Set([".mp4", ".mov", ".mkv", ".webm"]);
