import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function timestamp(seconds: number) {
  const ms = Math.floor((seconds % 1) * 1000);
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nao autenticado.", 401);

  const { id } = await context.params;
  const project = await prisma.videoProject.findFirst({
    where: { id, userId: user.id },
    include: {
      captions: {
        orderBy: { startTime: "asc" }
      }
    }
  });

  if (!project) return jsonError("Projeto nao encontrado.", 404);

  const body = project.captions
    .map(
      (caption, index) =>
        `${index + 1}\n${timestamp(caption.startTime)} --> ${timestamp(caption.endTime)}\n${caption.text}\n`
    )
    .join("\n");

  return new Response(body, {
    headers: {
      "content-type": "application/x-subrip; charset=utf-8",
      "content-disposition": `attachment; filename="${project.id}.srt"`
    }
  });
}
