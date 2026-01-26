/**
 * Timezone utilities for Asia/Jakarta (WIB, UTC+7)
 */

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7 in milliseconds

/**
 * Convert UTC ISO string to datetime-local input value in Asia/Jakarta timezone
 */
export function toJakartaDatetimeLocal(isoString: string | null): string {
  if (!isoString) return "";

  const date = new Date(isoString);
  const utcMs = date.getTime();
  const jakartaMs = utcMs + JAKARTA_OFFSET_MS;
  const jakartaDate = new Date(jakartaMs);

  // Format: YYYY-MM-DDTHH:mm
  const year = jakartaDate.getUTCFullYear();
  const month = String(jakartaDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jakartaDate.getUTCDate()).padStart(2, '0');
  const hours = String(jakartaDate.getUTCHours()).padStart(2, '0');
  const minutes = String(jakartaDate.getUTCMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert datetime-local input value (in Asia/Jakarta timezone) to UTC ISO string
 */
export function fromJakartaDatetimeLocal(datetimeLocal: string): string | null {
  if (!datetimeLocal) return null;

  // Parse the datetime-local value as if it's in Jakarta timezone
  const date = new Date(datetimeLocal);
  const jakartaMs = date.getTime();
  const utcMs = jakartaMs - JAKARTA_OFFSET_MS;

  return new Date(utcMs).toISOString();
}

/**
 * Format UTC ISO string to display format in Asia/Jakarta timezone
 */
export function formatJakartaTime(isoString: string | null): string {
  if (!isoString) return "-";

  const date = new Date(isoString);
  const utcMs = date.getTime();
  const jakartaMs = utcMs + JAKARTA_OFFSET_MS;
  const jakartaDate = new Date(jakartaMs);

  // Format: DD/MM/YYYY HH:mm
  const day = String(jakartaDate.getUTCDate()).padStart(2, '0');
  const month = String(jakartaDate.getUTCMonth() + 1).padStart(2, '0');
  const year = jakartaDate.getUTCFullYear();
  const hours = String(jakartaDate.getUTCHours()).padStart(2, '0');
  const minutes = String(jakartaDate.getUTCMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
