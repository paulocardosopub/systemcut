export function desiredDurationToSeconds(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("30")) return 30;
  if (normalized.includes("1 minuto")) return 60;
  if (normalized.includes("3")) return 180;
  if (normalized.includes("5")) return 300;
  if (normalized.includes("10")) return 600;

  const match = normalized.match(/(\d+)/);
  if (match) return Number(match[1]);

  return 60;
}

export class SmartCutEngine {
  rank<T extends { score: number; startTime: number; endTime: number }>(cuts: T[]) {
    return [...cuts]
      .filter((cut) => cut.endTime > cut.startTime)
      .sort((a, b) => b.score - a.score)
      .map((cut, index) => ({
        ...cut,
        orderIndex: index
      }));
  }
}
