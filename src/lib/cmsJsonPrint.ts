export const SAMPLE_CMS_JSON = `{
  "state": 0,
  "message": "OK",
  "containers": [
    {
      "cms": {
        "cmsNO": "2605716909",
        "cmsOp": "EMA",
        "cmsSt": "FULL",
        "cmsCmdt": "GE",
        "cmsTid": "C33930",
        "cmsNopol": "B9236UEY",
        "cmsSizeCont": "40",
        "cmsTime": "08/05/2026 09:57",
        "cmsTerminal": "",
        "cmsWeight": "26200Kg",
        "cmsVoyIn": null,
        "cmsVoyOut": null,
        "cmsCallSign": null,
        "cmsEi": "I",
        "cmsTrId": "DEL267000125457",
        "contClass": "IM",
        "contStatus": "FULL",
        "loc_stack": "PNF",
        "in_time": "20260430192420",
        "out_time": null,
        "inspect_time": null,
        "remark": null,
        "inspector": null,
        "bookingno": null,
        "sp": null,
        "isError": false,
        "errorCode": null,
        "statusDescription": null,
        "message": null,
        "datetime": null,
        "containernumber": "FFAU4872405",
        "nopol": null,
        "voyage": null,
        "vesselname": null,
        "containersize": null,
        "isocode": "4500",
        "terminalid": null,
        "transactiontype": "IN",
        "documenttype": null,
        "documentnumber": null,
        "documentdate": null,
        "fullemptyindr": null,
        "portloading": null,
        "portdischarge": null,
        "atb": null,
        "atd": null,
        "etd": null,
        "bC11NUMBER": null,
        "bC11DATE": null,
        "blnumber": null,
        "autohold": null,
        "consignee": null,
        "kpbccode": null,
        "bruttoweights": "26200Kg",
        "block": null,
        "slot": null,
        "cntrop": null,
        "cntrclass": null,
        "cntrstatus": null,
        "cntrtype": null,
        "remarks": null,
        "tier": null,
        "row": null
      },
      "bcData": {
        "isError": false,
        "errorCode": null,
        "statusDescription": null,
        "message": null,
        "datetime": null,
        "containernumber": "FFAU4872405",
        "nopol": null,
        "voyage": "W373-0001",
        "vesselname": "WAN HAI 373",
        "containersize": "40",
        "isocode": "4500",
        "terminalid": null,
        "transactiontype": "OUT",
        "documenttype": "SPPB PIB BC 2.0",
        "documentnumber": "284267/KPU.1/2026",
        "documentdate": "2026-05-06T17:00:00.000Z",
        "fullemptyindr": "FULL",
        "portloading": null,
        "portdischarge": "IDJKT",
        "atb": "-",
        "atd": "-",
        "etd": "2026-05-01T16:59:00.000Z",
        "bC11NUMBER": "004584",
        "bC11DATE": "2026-04-27T17:00:00.000Z",
        "blnumber": "-",
        "autohold": "A",
        "consignee": "INDOMAJU SUKSES MAKMUR",
        "kpbccode": "-",
        "bruttoweights": "26200",
        "block": "PNF---",
        "slot": null,
        "cntrop": null,
        "cntrclass": null,
        "cntrstatus": null,
        "cntrtype": null,
        "remarks": null,
        "tier": null,
        "row": null
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
