/**
 * O torneio é em Lisboa e a hora que aparece é a hora do recinto, venha o
 * telemóvel de onde vier.
 */
export const TZ = "Europe/Lisbon";

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-PT", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function shortDateLabel(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("pt-PT", { timeZone: TZ, day: "2-digit", month: "short" })
    .replace(".", "")
    .toUpperCase();
}

/** "18 de julho, 16:30" — data e hora juntas, para uma data errada saltar à vista. */
export function dateTimeLabel(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("pt-PT", {
      timeZone: TZ,
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", " ·");
}

/** "2026-07-18T16:30" na hora de Lisboa — o valor de um input datetime-local. */
export function dateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("en-CA", { timeZone: TZ }); // AAAA-MM-DD
  const hora = d.toLocaleTimeString("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }); // HH:mm
  return `${dia}T${hora}`;
}

/** "1:04:12" ou "4:12" — para a contagem decrescente. */
export function countdownLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
