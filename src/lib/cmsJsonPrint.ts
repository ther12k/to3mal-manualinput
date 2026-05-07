export const SAMPLE_CMS_JSON = `{
  "state": 0,
  "message": "OK",
  "containers": [
    {
      "cms": {
        "cmsNO": "2605715819",
        "cmsOp": "TRS",
        "cmsSt": "FULL",
        "cmsCmdt": "GE",
        "cmsTid": "C28132",
        "cmsNopol": "B9873UIX",
        "cmsSizeCont": "40",
        "cmsTime": "07/05/2026 18:24",
        "cmsTerminal": "IN03",
        "cmsWeight": "30064Kg",
        "cmsEi": "IM",
        "cmsTrId": "REC267000124312",
        "loc_stack": "2F-02-04-5",
        "in_time": "20260507182400",
        "containernumber": "FFAU3542029"
      },
      "bcData": {
        "transactiontype": "IN",
        "containersize": "40",
        "bruttoweights": "30064"
      }
    }
  ],
  "cms": null,
  "bcData": null
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

function hasTruckInCmsShape(record: Record<string, unknown>): boolean {
  return (
    Array.isArray(record.containers) &&
    record.containers.some(
      (item) => isRecord(item) && isRecord(item.cms)
    )
  );
}

function unwrapPayload(value: unknown): Record<string, unknown> {
  const record = firstRecordFrom(value);

  if (hasTruckInCmsShape(record)) {
    return record;
  }

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

  const rootRecord = firstRecordFrom(parsed);
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

  if (hasTruckInCmsShape(payload)) {
    return {
      cms: payload,
      laneName,
      xpsUrl: buildXpsUrlFromPrintPath(rootRecord.entryprint),
      sourceType: "cms",
    };
  }

  return {
    cms: payload,
    laneName,
    xpsUrl: buildXpsUrlFromPrintPath(payload.entryprint),
    sourceType: isRecord(rootRecord.cms) ? "cms" : "generic",
  };
}
