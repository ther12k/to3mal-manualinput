function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildCmsPrintDocument(cms: Record<string, unknown>, laneName?: string): string {
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
            <div class="value">${escapeHtml(
              typeof value === "object" ? JSON.stringify(value) : value
            )}</div>
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
