export const SAMPLE_GATE_IN_JSON = `{
  "id": 1521157,
  "datetime": "2026-05-07T12:23:43",
  "terminal": "T3I",
  "truckid": "C33999",
  "nopol": "B9825NW",
  "container": "SEGU5321424",
  "entrylaneid": 222,
  "entrylanename": "JoinGate In 3",
  "entryweight": 13340,
  "entrystatus": "GIN",
  "entryprint": "Post Gate 1 T03\\\\2026\\\\05\\\\07\\\\1521157_CMS_0705202601075492.xps",
  "exitlaneid": 124,
  "exitweight": 9260,
  "exitstatus": "GOUT",
  "postgatetime": "2026-05-07T13:07:55.069743",
  "complete": 1
}`;

export interface CmsJsonPrintPayload {
  cms: Record<string, unknown>;
  laneName?: string;
  xpsUrl?: string;
  sourceType: "cms" | "transaction" | "generic";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstRecordFrom(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    const firstRecord = value.find(isRecord);
    if (!firstRecord) {
      throw new Error("JSON array must contain at least one object.");
    }
    return firstRecord;
  }

  if (!isRecord(value)) {
    throw new Error("JSON input must be an object or an array of objects.");
  }

  return value;
}

function unwrapPayload(value: unknown): Record<string, unknown> {
  const record = firstRecordFrom(value);

  if (isRecord(record.cms)) {
    return record.cms;
  }

  if (Array.isArray(record.item) || isRecord(record.item)) {
    return unwrapPayload(record.item);
  }

  return record;
}

function hasTransactionShape(record: Record<string, unknown>): boolean {
  return (
    "entrylaneid" in record ||
    "entrylanename" in record ||
    "entryweight" in record ||
    "entryprint" in record ||
    "entrystatus" in record
  );
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function normalizeTransactionForCms(record: Record<string, unknown>): Record<string, unknown> {
  return compactRecord({
    documentType: "CMS TEST PRINT",
    transactionID: record.id,
    terminal: record.terminal,
    truckID: record.truckid ?? record.truckID,
    nopol: record.nopol,
    container: record.container,
    laneID: record.entrylaneid,
    laneName: record.entrylanename,
    weight: record.entryweight,
    status: record.entrystatus,
    entryPrint: record.entryprint,
    gateInTime: record.postgatetime ?? record.entryfinishtime ?? record.datetime,
    complete: record.complete,
    rawTransaction: record,
  });
}

export function buildXpsUrlFromPrintPath(printPath: unknown): string | undefined {
  if (typeof printPath !== "string" || !printPath.trim()) {
    return undefined;
  }

  const trimmed = printPath.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const normalizedPath = trimmed.replace(/\\/g, "/").replace(/^\/+/, "");
  const encodedPath = normalizedPath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `http://183.91.69.74/logs/XPS/${encodedPath}`;
}

export function parseCmsJsonPrintInput(rawJson: string): CmsJsonPrintPayload {
  const trimmed = rawJson.trim();
  if (!trimmed) {
    throw new Error("Paste a JSON object first.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`Invalid JSON: ${detail}`);
  }

  const payload = unwrapPayload(parsed);
  const laneName =
    typeof payload.entrylanename === "string"
      ? payload.entrylanename
      : typeof payload.laneName === "string"
        ? payload.laneName
        : undefined;

  if (hasTransactionShape(payload)) {
    return {
      cms: normalizeTransactionForCms(payload),
      laneName,
      xpsUrl: buildXpsUrlFromPrintPath(payload.entryprint),
      sourceType: "transaction",
    };
  }

  return {
    cms: payload,
    laneName,
    xpsUrl: buildXpsUrlFromPrintPath(payload.entryprint),
    sourceType: isRecord(firstRecordFrom(parsed).cms) ? "cms" : "generic",
  };
}
