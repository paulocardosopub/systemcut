import crypto from "node:crypto";
import fs from "node:fs";
import { finished } from "node:stream/promises";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import path from "node:path";
import Busboy from "busboy";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import {
  allowedVideoExtensions,
  ensureStorageDirs,
  fileExtension,
  sanitizeFileName,
  storagePath
} from "@/lib/storage";
import { processVideoProject } from "@/worker/video-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UploadResult = {
  originalFileName: string;
  originalFilePath: string;
  size: number;
};

function parseUpload(request: NextRequest, maxBytes: number) {
  return new Promise<{ fields: Record<string, string>; file: UploadResult }>((resolve, reject) => {
    const body = request.body;

    if (!body) {
      reject(new Error("Nenhum arquivo enviado."));
      return;
    }

    const headers = Object.fromEntries(request.headers.entries());
    const busboy = Busboy({ headers });
    const fields: Record<string, string> = {};
    let upload: UploadResult | null = null;
    let pending: Promise<unknown> | null = null;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (_name, file, info) => {
      if (upload || !info.filename) {
        file.resume();
        return;
      }

      const extension = fileExtension(info.filename);

      if (!allowedVideoExtensions.has(extension)) {
        file.resume();
        fail(new Error("Formato invalido. Envie MP4, MOV, MKV ou WEBM."));
        return;
      }

      const safeName = sanitizeFileName(info.filename);
      const fileName = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const outputPath = storagePath("uploads", fileName);
      const writeStream = fs.createWriteStream(outputPath);
      let size = 0;

      file.on("data", (chunk: Buffer) => {
        size += chunk.length;

        if (size > maxBytes) {
          writeStream.destroy();
          file.resume();
          fail(new Error("Arquivo maior que o limite configurado."));
        }
      });

      file.on("error", fail);
      writeStream.on("error", fail);
      file.pipe(writeStream);

      pending = finished(writeStream).then(() => {
        upload = {
          originalFileName: path.basename(info.filename),
          originalFilePath: outputPath,
          size
        };
      });
    });

    busboy.on("error", fail);
    busboy.on("finish", async () => {
      try {
        if (pending) await pending;
        if (!upload) throw new Error("Selecione um video para enviar.");
        if (!settled) {
          settled = true;
          resolve({ fields, file: upload });
        }
      } catch (error) {
        fail(error instanceof Error ? error : new Error("Falha no upload."));
      }
    });

    Readable.fromWeb(body as unknown as NodeReadableStream<Uint8Array>).pipe(busboy);
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) return jsonError("Nao autenticado.", 401);

  await ensureStorageDirs();

  try {
    const maxMb = Number(process.env.MAX_UPLOAD_MB || 2048);
    const { fields, file } = await parseUpload(request, maxMb * 1024 * 1024);

    const project = await prisma.videoProject.create({
      data: {
        userId: user.id,
        title: fields.title?.trim() || file.originalFileName,
        originalFileName: file.originalFileName,
        originalFilePath: file.originalFilePath,
        contentType: fields.contentType || "Outro",
        objective: fields.objective || "Melhores momentos",
        desiredDuration: fields.desiredDuration || "1 minuto",
        status: "Enviado"
      }
    });

    void processVideoProject(project.id);

    return Response.json({
      project: {
        ...project,
        uploadSize: file.size
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Falha no upload.", 400);
  }
}
