import fs from "node:fs/promises";
import path from "node:path";
import youtubedl from "youtube-dl-exec";
import { sanitizeFileName, storagePath } from "@/lib/storage";

type VideoInfo = {
  title?: string;
  fulltitle?: string;
  ext?: string;
  duration?: number;
  webpage_url?: string;
};

const allowedHosts = [
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "instagram.com",
  "instagr.am"
];

export function isSupportedSocialVideoUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return allowedHosts.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export async function importSocialVideo(url: string) {
  if (!isSupportedSocialVideoUrl(url)) {
    throw new Error("Envie um link valido do YouTube, TikTok ou Instagram.");
  }

  const maxImportMb = Number(process.env.MAX_IMPORT_MB || process.env.MAX_UPLOAD_MB || 2048);
  const info = (await youtubedl(url, {
    dumpSingleJson: true,
    noPlaylist: true,
    noWarnings: true,
    preferFreeFormats: false
  })) as VideoInfo;

  const baseTitle = sanitizeFileName(info.title || info.fulltitle || "video-social");
  const outputTemplate = storagePath("uploads", `${Date.now()}-${baseTitle}.%(ext)s`);

  await youtubedl(url, {
    noPlaylist: true,
    noWarnings: true,
    format: "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best",
    mergeOutputFormat: "mp4",
    remuxVideo: "mp4",
    maxFilesize: `${maxImportMb}M`,
    output: outputTemplate,
    restrictFilenames: true
  });

  const directory = path.dirname(outputTemplate);
  const prefix = path.basename(outputTemplate).replace(".%(ext)s", "");
  const files = await fs.readdir(directory);
  const downloaded = files.find((file) => file.startsWith(prefix));

  if (!downloaded) {
    throw new Error("Nao foi possivel localizar o video baixado.");
  }

  const originalFilePath = path.join(directory, downloaded);

  return {
    originalFileName: downloaded,
    originalFilePath,
    title: info.title || info.fulltitle || downloaded,
    sourceUrl: info.webpage_url || url,
    duration: Number(info.duration || 0)
  };
}
