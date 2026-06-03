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

export function displayWa(value: string): string {
  const normalized = normalizeIndonesianWa(value);
  if (!normalized.startsWith("62")) {
    return value;
  }

  const local = normalized.slice(2);
  return local.replace(/(\d{3})(\d{4})(\d{0,5})/, (_, a: string, b: string, c: string) =>
    c ? `${a}-${b}-${c}` : `${a}-${b}`,
  );
}
