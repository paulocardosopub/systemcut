import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { storageUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) return jsonError("Nao autenticado.", 401);

  const projects = await prisma.videoProject.findMany({
    where: { userId: user.id },
    include: {
      cuts: true,
      exportJobs: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return jsonOk({
    projects: projects.map((project) => ({
      ...project,
      thumbnailUrl: storageUrl(project.thumbnailPath),
      videoUrl: storageUrl(project.originalFilePath),
      exportUrl: storageUrl(project.exportPath)
    }))
  });
}
