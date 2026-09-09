export function calculateExamDeadline(
  waktuMulai: string | Date | null | undefined,
  examDurationMinutes: number
): number | null {
  const duration = Number(examDurationMinutes);
  if (!waktuMulai || !Number.isFinite(duration) || duration < 0) return null;
  const startMs = waktuMulai instanceof Date ? waktuMulai.getTime() : Date.parse(waktuMulai);
  if (!Number.isFinite(startMs)) return null;
  return startMs + duration * 60_000;
}

export function remainingExamSeconds(deadlineMs: number | null, nowMs: number): number {
  if (deadlineMs === null || !Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}
