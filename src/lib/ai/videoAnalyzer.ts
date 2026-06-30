import { desiredDurationToSeconds } from "@/lib/smart-cut-engine";

export type VideoAnalysisInput = {
  duration: number;
  contentType: string;
  objective: string;
  desiredDuration: string;
};

export type TranscriptSegmentDraft = {
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
};

export type SmartCutDraft = {
  startTime: number;
  endTime: number;
  title: string;
  description: string;
  reason: string;
  score: number;
  tags: string[];
  transcriptExcerpt: string;
};

export type VideoAnalysisResult = {
  summary: string;
  transcript: TranscriptSegmentDraft[];
  cuts: SmartCutDraft[];
};

function segmentText(index: number, contentType: string, objective: string) {
  const texts = [
    `Abertura do conteudo com contexto de ${contentType.toLowerCase()} e preparacao para ${objective.toLowerCase()}.`,
    "Trecho com explicacao clara, ritmo constante e fala suficiente para virar um corte independente.",
    "Momento com aumento de energia, boa continuidade narrativa e potencial para prender atencao.",
    "Parte central com detalhe importante, contexto completo e fechamento natural da ideia.",
    "Conclusao do bloco com frase forte, gancho para compartilhamento e boa cadencia de edicao."
  ];

  return texts[index % texts.length];
}

export async function analyzeVideoWithAi(input: VideoAnalysisInput): Promise<VideoAnalysisResult> {
  const targetSeconds = desiredDurationToSeconds(input.desiredDuration);
  const duration = Math.max(8, input.duration || targetSeconds * 3);
  const segmentSize = Math.max(8, Math.min(28, duration / 6));
  const transcript: TranscriptSegmentDraft[] = [];

  for (let start = 0, index = 0; start < duration; start += segmentSize, index += 1) {
    const end = Math.min(duration, start + segmentSize);
    transcript.push({
      startTime: Number(start.toFixed(2)),
      endTime: Number(end.toFixed(2)),
      text: segmentText(index, input.contentType, input.objective),
      confidence: 0.86
    });
  }

  const anchors = [0.08, 0.28, 0.5, 0.7, 0.84];
  const cuts = anchors
    .map((anchor, index) => {
      const wanted = Math.min(targetSeconds, Math.max(8, duration * 0.7));
      const center = duration * anchor;
      const start = Math.max(0, Math.min(duration - 4, center - wanted * 0.35));
      const end = Math.min(duration, start + wanted);
      const excerpt = transcript
        .filter((segment) => segment.endTime >= start && segment.startTime <= end)
        .map((segment) => segment.text)
        .join(" ");

      return {
        startTime: Number(start.toFixed(2)),
        endTime: Number(end.toFixed(2)),
        title: [
          "Melhor gancho do video",
          "Momento com contexto completo",
          "Trecho forte para redes sociais",
          "Resumo com ritmo bom",
          "Fechamento com impacto"
        ][index],
        description: `Corte sugerido para ${input.objective.toLowerCase()} com duracao proxima de ${input.desiredDuration.toLowerCase()}.`,
        reason: "Mock de IA combinando ritmo de fala, ponto de entrada natural e trecho com sentido independente.",
        score: Math.max(72, 94 - index * 5),
        tags: [input.contentType.toLowerCase(), input.objective.toLowerCase(), "smart-cut"],
        transcriptExcerpt: excerpt.slice(0, 480)
      };
    })
    .filter((cut) => cut.endTime - cut.startTime >= 4);

  return {
    summary:
      "Analise mockada criada para o MVP. A estrutura ja permite trocar este provider por transcricao real e modelos de linguagem.",
    transcript,
    cuts
  };
}
