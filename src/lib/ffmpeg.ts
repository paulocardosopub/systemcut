import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { storagePath } from "@/lib/storage";

type ProbeResult = {
  format?: {
    duration?: string;
  };
  streams?: Array<{
    codec_type?: string;
    width?: number;
    height?: number;
    duration?: string;
  }>;
};

export type VideoMetadata = {
  duration: number;
  width: number;
  height: number;
};

function firstExisting(candidates: Array<string | null | undefined>) {
  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function localFfmpegPath() {
  return path.join(process.cwd(), "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
}

function localFfprobePath() {
  const exe = process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
  const platform = process.platform === "win32" ? "win32" : process.platform;
  const arch = process.arch === "arm64" ? "arm64" : "x64";

  return path.join(process.cwd(), "node_modules", "ffprobe-static", "bin", platform, arch, exe);
}

function configuredBinary(name: "FFMPEG_PATH" | "FFPROBE_PATH", fallback?: string | null, local?: string) {
  const configured = process.env[name];
  if (configured && configured !== "ffmpeg" && configured !== "ffprobe") {
    return configured;
  }

  return firstExisting([fallback, local]) || fallback || local || (name === "FFMPEG_PATH" ? "ffmpeg" : "ffprobe");
}

export function ffmpegPath() {
  return configuredBinary("FFMPEG_PATH", ffmpegStatic, localFfmpegPath());
}

export function ffprobePath() {
  return configuredBinary("FFPROBE_PATH", ffprobeStatic.path, localFfprobePath());
}

function runBinary(binary: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(binary, args, {
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || `Processo de video terminou com codigo ${code}.`));
      }
    });
  });
}

export async function probeVideo(filePath: string): Promise<VideoMetadata> {
  const { stdout } = await runBinary(ffprobePath(), [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath
  ]);

  const data = JSON.parse(stdout) as ProbeResult;
  const videoStream = data.streams?.find((stream) => stream.codec_type === "video");
  const duration = Number(data.format?.duration || videoStream?.duration || 0);

  return {
    duration: Number.isFinite(duration) ? duration : 0,
    width: videoStream?.width || 0,
    height: videoStream?.height || 0
  };
}

export async function generateThumbnail(inputPath: string, outputPath: string, duration: number) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const seek = Math.max(0.2, Math.min(30, duration > 0 ? duration * 0.12 : 1));
  await runBinary(ffmpegPath(), [
    "-y",
    "-ss",
    String(seek),
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-vf",
    "scale=720:-1",
    outputPath
  ]);
}

export async function extractAudio(inputPath: string, outputPath: string) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  await runBinary(ffmpegPath(), [
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-b:a",
    "96k",
    outputPath
  ]);
}

export type ExportOptions = {
  format: string;
  quality: string;
};

function videoFilterForFormat(format: string) {
  if (format === "Shorts/Reels/TikTok") {
    return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920";
  }

  if (format === "Quadrado") {
    return "scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080";
  }

  if (format === "YouTube horizontal") {
    return "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2";
  }

  return null;
}

function crfForQuality(quality: string) {
  if (quality === "Rascunho rapido") return "30";
  if (quality === "Qualidade maxima") return "18";
  return "23";
}

export async function exportSelectedCuts(
  inputPath: string,
  cuts: Array<{ startTime: number; endTime: number }>,
  outputPath: string,
  options: ExportOptions
) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.mkdir(storagePath("tmp"), { recursive: true });

  const validCuts = cuts
    .filter((cut) => cut.endTime > cut.startTime)
    .sort((a, b) => a.startTime - b.startTime);

  const tmpDir = storagePath("tmp", `export-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    const clipPaths: string[] = [];
    const vf = videoFilterForFormat(options.format);

    for (const [index, cut] of validCuts.entries()) {
      const clipPath = path.join(tmpDir, `clip-${index}.mp4`);
      const args = [
        "-y",
        "-ss",
        String(Math.max(0, cut.startTime)),
        "-to",
        String(Math.max(cut.startTime + 0.5, cut.endTime)),
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        crfForQuality(options.quality),
        "-c:a",
        "aac",
        "-movflags",
        "+faststart"
      ];

      if (vf) {
        args.splice(args.length - 2, 0, "-vf", vf);
      }

      args.push(clipPath);
      await runBinary(ffmpegPath(), args);
      clipPaths.push(clipPath);
    }

    if (clipPaths.length === 0) {
      await runBinary(ffmpegPath(), [
        "-y",
        "-i",
        inputPath,
        "-t",
        "30",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        crfForQuality(options.quality),
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        outputPath
      ]);
      return;
    }

    if (clipPaths.length === 1) {
      await fs.copyFile(clipPaths[0], outputPath);
      return;
    }

    const listPath = path.join(tmpDir, "concat.txt");
    const concatList = clipPaths
      .map((clipPath) => `file '${clipPath.replace(/'/g, "'\\''")}'`)
      .join("\n");

    await fs.writeFile(listPath, concatList, "utf8");
    await runBinary(ffmpegPath(), [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      outputPath
    ]);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
