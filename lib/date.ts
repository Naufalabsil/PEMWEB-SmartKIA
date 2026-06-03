const idDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const idWeekdayFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatLongDate(value: string | Date): string {
  return idDateFormatter.format(typeof value === "string" ? parseISODate(value) : value);
}

export function formatWeekdayDate(value: string | Date): string {
  return idWeekdayFormatter.format(typeof value === "string" ? parseISODate(value) : value);
}

export function daysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.ceil((end - start) / 86_400_000);
}

export function relativeDayLabel(date: string): string {
  const diff = daysBetween(new Date(), parseISODate(date));

  if (diff < 0) {
    return `Terlambat ${Math.abs(diff)} hari`;
  }

  if (diff === 0) {
    return "Hari ini";
  }

  return `${diff} hari lagi`;
}

export function kbTypeLabel(type: "1_bulan" | "3_bulan"): string {
  return type === "1_bulan" ? "Suntik KB 1 Bulan" : "Suntik KB 3 Bulan";
}
