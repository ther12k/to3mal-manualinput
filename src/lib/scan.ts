export function normalizeScannedIdentifier(value: string): string {
  return value.replace(/:/g, "").trim().toUpperCase();
}

export function buildGatepassFromScannedValue(scannedValue: string): string {
  const trimmedValue = scannedValue.trim();

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.startsWith("-1|")) {
    return trimmedValue;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const gatepassParam = parsedUrl.searchParams.get("gatepass");
    if (gatepassParam) {
      return gatepassParam.trim();
    }
  } catch {
    // Ignore non-URL values and fall back to the raw identifier format.
  }

  return `-1|T3I|TOSNUS|${normalizeScannedIdentifier(trimmedValue)}|||||`;
}
