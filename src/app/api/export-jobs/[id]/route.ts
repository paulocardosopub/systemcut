import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { storageUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nao autenticado.", 401);

  const { id } = await context.params;
  const job = await prisma.exportJob.findFirst({
    where: {
      id,
      project: {
        userId: user.id
      }
    },
    include: {
      project: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  if (!job) return jsonError("Exportacao nao encontrada.", 404);

  return jsonOk({
    job: {
      ...job,
      downloadUrl: storageUrl(job.outputPath)
    }
  });
}
