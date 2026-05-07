function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (isRecord(value)) {
    return JSON.stringify(value);
  }

  return String(value ?? "");
}

function compactValues(values: unknown[]): string[] {
  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function shortStatus(value: unknown): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized) {
    return "";
  }

  if (normalized === "FULL") {
    return "F";
  }

  if (normalized === "EMPTY") {
    return "E";
  }

  return normalized;
}

function formatWeight(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  if (/kg$/i.test(raw)) {
    return raw;
  }

  return `${raw}Kg`;
}

interface TruckInCmsContainer {
  cms: Record<string, unknown>;
  bcData?: Record<string, unknown>;
}

function extractTruckInCmsContainers(cms: Record<string, unknown>): TruckInCmsContainer[] {
  if (!Array.isArray(cms.containers)) {
    return [];
  }

  return cms.containers
    .filter(isRecord)
    .map((item) => ({
      cms: isRecord(item.cms) ? item.cms : {},
      bcData: isRecord(item.bcData) ? item.bcData : undefined,
    }))
    .filter((item) => Object.keys(item.cms).length > 0);
}

function isTruckInCmsPayload(cms: Record<string, unknown>): boolean {
  return extractTruckInCmsContainers(cms).length > 0;
}

function isSingleCmsPayload(cms: Record<string, unknown>): boolean {
  return [
    "cmsNO",
    "cmsTid",
    "containernumber",
    "loc_stack",
    "cmsWeight",
  ].some((key) => key in cms);
}

function renderTruckInCmsDocument(cms: Record<string, unknown>, laneName?: string): string {
  const containers = extractTruckInCmsContainers(cms);
  const first = containers[0];
  const firstCms = first.cms;
  const title = String(cms.documentLabel ?? "REPRINT").trim() || "REPRINT";
  const primarySubtitle = compactValues(["CMS", firstCms.cmsNO]).join("    ");
  const laneLabel = laneName ? `<div class="lane">${escapeHtml(laneName)}</div>` : "";

  const sections = containers
    .map(({ cms: containerCms, bcData }, index) => {
      const topLine = compactValues([
        containerCms.in_time,
        containerCms.cmsOp ?? bcData?.cntrop,
      ]);
      const metaLineOne = compactValues([
        bcData?.transactiontype ?? containerCms.cmsEi,
        shortStatus(containerCms.cmsSt),
        containerCms.cmsCmdt,
        containerCms.cmsTerminal || "",
      ]);
      const metaLineTwo = compactValues([
        containerCms.cmsSizeCont || bcData?.containersize,
        formatWeight(containerCms.cmsWeight ?? bcData?.bruttoweights),
      ]);
      const location = String(containerCms.loc_stack ?? "-").trim();

      return `
        <section class="container-block">
          ${
            topLine.length
              ? `<div class="meta-row top-line">${topLine
                  .map((value) => `<span>${escapeHtml(value)}</span>`)
                  .join("")}</div>`
              : ""
          }
          <div class="container-no">${escapeHtml(containerCms.containernumber)}</div>
          ${
            metaLineOne.length
              ? `<div class="meta-grid">${metaLineOne
                  .map((value) => `<span>${escapeHtml(value)}</span>`)
                  .join("")}</div>`
              : ""
          }
          ${
            metaLineTwo.length
              ? `<div class="meta-grid compact">${metaLineTwo
                  .map((value) => `<span>${escapeHtml(value)}</span>`)
                  .join("")}</div>`
              : ""
          }
          <div class="location">${escapeHtml(location)}</div>
          ${
            index < containers.length - 1
              ? '<div class="divider dashed"></div>'
              : ""
          }
        </section>
      `;
    })
    .join("");

  const footerLeft = String(firstCms.cmsTid ?? "").trim();
  const footerRight = String(firstCms.cmsNopol ?? "").trim();
  const footerTime = String(firstCms.cmsTime ?? "").trim();
  const footerSite = String(cms.siteLabel ?? "").trim();

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>CMS Print</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        width: 70mm;
        margin: 0 auto;
        padding: 10px 8px 16px;
        color: #111827;
        background: #ffffff;
      }
      .title {
        text-align: center;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: 0.04em;
        margin-bottom: 4px;
      }
      .subtitle {
        text-align: center;
        font-size: 17px;
        margin-bottom: 2px;
      }
      .lane {
        text-align: center;
        font-size: 12px;
        margin-bottom: 8px;
      }
      .container-block {
        margin-bottom: 10px;
      }
      .meta-row,
      .footer-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        font-size: 12px;
      }
      .top-line {
        margin-bottom: 4px;
      }
      .container-no {
        text-align: center;
        font-size: 22px;
        font-weight: 800;
        margin: 4px 0 6px;
      }
      .meta-grid {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: 8px;
        text-align: center;
        font-size: 10px;
        margin-bottom: 4px;
      }
      .meta-grid.compact {
        font-size: 8px;
      }
      .location {
        text-align: center;
        font-size: 22px;
        font-weight: 800;
        margin: 8px 0;
      }
      .divider.dashed {
        border-top: 1px dashed #111827;
        margin-top: 10px;
      }
      .footer {
        margin-top: 10px;
      }
      .footer-time,
      .footer-site {
        text-align: center;
        font-size: 11px;
        margin-top: 4px;
      }
      @media print {
        body {
          margin: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="title">${escapeHtml(title)}</div>
    <div class="subtitle">${escapeHtml(primarySubtitle)}</div>
    ${laneLabel}
    ${sections}
    <div class="divider dashed"></div>
    <div class="footer">
      ${
        footerLeft || footerRight
          ? `<div class="footer-row">
              <span>${escapeHtml(footerLeft)}</span>
              <span>${escapeHtml(footerRight)}</span>
            </div>`
          : ""
      }
      ${footerTime ? `<div class="footer-time">${escapeHtml(footerTime)}</div>` : ""}
      ${footerSite ? `<div class="footer-site">${escapeHtml(footerSite)}</div>` : ""}
    </div>
  </body>
</html>`;
}

function renderSingleCmsDocument(cms: Record<string, unknown>, laneName?: string): string {
  const topLine = compactValues([cms.cmsTime ?? cms.datetime, cms.cmsOp]);
  const metaLineOne = compactValues([
    cms.cmsEi,
    shortStatus(cms.cmsSt),
    cms.cmsCmdt,
    cms.cmsTerminal,
  ]);
  const metaLineTwo = compactValues([
    cms.cmsSizeCont,
    formatWeight(cms.cmsWeight),
  ]);
  const footerLine = compactValues([cms.cmsTid, cms.cmsNopol]);
  const laneLabel = laneName ? `<div class="lane">${escapeHtml(laneName)}</div>` : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>CMS Print</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        width: 70mm;
        margin: 0 auto;
        padding: 10px 8px 16px;
        color: #111827;
      }
      .title {
        text-align: center;
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 4px;
      }
      .subtitle {
        text-align: center;
        font-size: 16px;
        margin-bottom: 4px;
      }
      .lane {
        text-align: center;
        font-size: 12px;
        margin-bottom: 8px;
      }
      .meta-row {
        display: flex;
        justify-content: center;
        gap: 12px;
        font-size: 11px;
        margin-bottom: 4px;
      }
      .container-no {
        text-align: center;
        font-size: 22px;
        font-weight: 800;
        margin: 8px 0;
      }
      .meta-grid {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: 8px;
        text-align: center;
        font-size: 10px;
        margin-bottom: 4px;
      }
      .location {
        text-align: center;
        font-size: 22px;
        font-weight: 800;
        margin: 10px 0;
      }
      .footer-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        font-size: 12px;
        margin-top: 10px;
      }
      .footer-time {
        text-align: center;
        font-size: 11px;
        margin-top: 4px;
      }
      @media print {
        body {
          margin: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="title">CMS</div>
    <div class="subtitle">${escapeHtml(cms.cmsNO ?? "")}</div>
    ${laneLabel}
    ${
      topLine.length
        ? `<div class="meta-row">${topLine
            .map((value) => `<span>${escapeHtml(value)}</span>`)
            .join("")}</div>`
        : ""
    }
    <div class="container-no">${escapeHtml(cms.containernumber ?? cms.container)}</div>
    ${
      metaLineOne.length
        ? `<div class="meta-grid">${metaLineOne
            .map((value) => `<span>${escapeHtml(value)}</span>`)
            .join("")}</div>`
        : ""
    }
    ${
      metaLineTwo.length
        ? `<div class="meta-grid">${metaLineTwo
            .map((value) => `<span>${escapeHtml(value)}</span>`)
            .join("")}</div>`
        : ""
    }
    <div class="location">${escapeHtml(cms.loc_stack ?? "")}</div>
    ${
      footerLine.length
        ? `<div class="footer-row">${footerLine
            .map((value) => `<span>${escapeHtml(value)}</span>`)
            .join("")}</div>`
        : ""
    }
    ${cms.cmsTime ? `<div class="footer-time">${escapeHtml(cms.cmsTime)}</div>` : ""}
  </body>
</html>`;
}

function renderGenericCmsDocument(cms: Record<string, unknown>, laneName?: string): string {
  const entries = Object.entries(cms);
  const highlightedKeys = [
    "cms",
    "cmsno",
    "container",
    "containerno",
    "location",
    "loc",
    "weight",
    "truckid",
    "nopol",
    "date",
    "datetime",
  ];

  const highlighted = entries.filter(([key]) =>
    highlightedKeys.includes(key.toLowerCase())
  );
  const details = entries.filter(
    ([key]) => !highlightedKeys.includes(key.toLowerCase())
  );

  const formatRows = (rows: Array<[string, unknown]>) =>
    rows
      .map(
        ([key, value]) => `
          <div class="row">
            <div class="label">${escapeHtml(key)}</div>
            <div class="value">${escapeHtml(formatValue(value))}</div>
          </div>
        `
      )
      .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>CMS Print</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        width: 72mm;
        margin: 0 auto;
        padding: 8px;
        color: #111827;
      }
      h1 {
        text-align: center;
        font-size: 24px;
        margin: 0 0 8px;
      }
      .lane {
        text-align: center;
        font-size: 12px;
        margin-bottom: 12px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 6px;
        font-size: 13px;
      }
      .label {
        font-weight: 700;
        text-transform: uppercase;
      }
      .value {
        text-align: right;
        word-break: break-word;
      }
      .highlight .value {
        font-size: 20px;
        font-weight: 700;
      }
      .divider {
        border-top: 1px dashed #111827;
        margin: 10px 0;
      }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 10px;
      }
      @media print {
        body {
          margin: 0;
        }
      }
    </style>
  </head>
  <body>
    <h1>CMS</h1>
    ${laneName ? `<div class="lane">${escapeHtml(laneName)}</div>` : ""}
    <div class="highlight">
      ${formatRows(highlighted)}
    </div>
    ${details.length ? `<div class="divider"></div>${formatRows(details)}` : ""}
    <div class="divider"></div>
    <pre>${escapeHtml(JSON.stringify(cms, null, 2))}</pre>
  </body>
</html>`;
}

export function buildCmsPrintDocument(cms: Record<string, unknown>, laneName?: string): string {
  if (isTruckInCmsPayload(cms)) {
    return renderTruckInCmsDocument(cms, laneName);
  }

  if (isSingleCmsPayload(cms)) {
    return renderSingleCmsDocument(cms, laneName);
  }

  return renderGenericCmsDocument(cms, laneName);
}
