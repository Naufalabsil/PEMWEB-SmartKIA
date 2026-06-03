export function normalizeIndonesianWa(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("62")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  if (digits.startsWith("8")) {
    return `62${digits}`;
  }

  return digits;
}

export function isValidIndonesianWa(value: string): boolean {
  return /^62[0-9]{8,15}$/.test(value);
}
