import fs from "node:fs";
import fsp from "node:fs/promises";
import { Readable } from "node:stream";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { resolveStorageSegments } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mimeTypes: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg"
};

function contentType(filePath: string) {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return mimeTypes[ext] || "application/octet-stream";
}

async function userCanAccessFile(userId: string, filePath: string) {
  const project = await prisma.videoProject.findFirst({
    where: {
      userId,
      OR: [
        { originalFilePath: filePath },
        { thumbnailPath: filePath },
        { audioPath: filePath },
        { exportPath: filePath },
        { exportJobs: { some: { outputPath: filePath } } }
      ]
    },
    select: { id: true }
  });

  return Boolean(project);
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nao autenticado.", 401);

  const { path: segments } = await context.params;
  const filePath = resolveStorageSegments(segments);

  if (!(await userCanAccessFile(user.id, filePath))) {
    return jsonError("Arquivo nao encontrado.", 404);
  }

  const stat = await fsp.stat(filePath).catch(() => null);
  if (!stat || !stat.isFile()) return jsonError("Arquivo nao encontrado.", 404);

  const range = request.headers.get("range");
  const type = contentType(filePath);

  if (range) {
    const match = range.match(/bytes=(\d+)-(\d*)/);
    if (!match) return jsonError("Range invalido.", 416);

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : stat.size - 1;
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "content-type": type,
        "content-length": String(chunkSize),
        "content-range": `bytes ${start}-${end}/${stat.size}`,
        "accept-ranges": "bytes"
      }
    });
  }

  const stream = fs.createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "content-type": type,
      "content-length": String(stat.size),
      "accept-ranges": "bytes"
    }
  });
}
