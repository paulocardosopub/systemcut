import { processPendingProjects } from "@/worker/video-worker";

async function main() {
  await processPendingProjects();
}

main()
  .then(() => {
    console.log("Worker finalizou a fila local.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
