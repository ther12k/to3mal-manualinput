import { buildCmsPrintDocument } from "@/lib/cmsPrint";
import { buildXpsUrlFromPrintPath, parseCmsJsonPrintInput } from "@/lib/cmsJsonPrint";

describe("cms json print parser", () => {
  it("normalizes a gate-in transaction object into CMS print data", () => {
    const result = parseCmsJsonPrintInput(
      JSON.stringify({
        id: 1521157,
        terminal: "T3I",
        truckid: "C33999",
        nopol: "B9825NW",
        container: "SEGU5321424",
        entrylaneid: 222,
        entrylanename: "JoinGate In 3",
        entryweight: 13340,
        entrystatus: "GIN",
        entryprint: "Post Gate 1 T03\\2026\\05\\07\\1521157_CMS.xps",
      })
    );

    expect(result.sourceType).toBe("transaction");
    expect(result.laneName).toBe("JoinGate In 3");
    expect(result.xpsUrl).toBe(
      "http://183.91.69.74/logs/XPS/Post%20Gate%201%20T03/2026/05/07/1521157_CMS.xps"
    );
    expect(result.cms).toMatchObject({
      documentType: "CMS TEST PRINT",
      transactionID: 1521157,
      truckID: "C33999",
      container: "SEGU5321424",
      laneID: 222,
      weight: 13340,
    });
  });

  it("preserves TruckIN containers[].cms payloads for thermal rendering", () => {
    const result = parseCmsJsonPrintInput(
      JSON.stringify({
        state: 0,
        message: "OK",
        containers: [
          {
            cms: {
              cmsNO: "2605715819",
              cmsOp: "TRS",
              cmsSt: "FULL",
              cmsCmdt: "GE",
              cmsTid: "C28132",
              cmsNopol: "B9873UIX",
              cmsSizeCont: "40",
              cmsTime: "07/05/2026 18:24",
              cmsTerminal: "IN03",
              cmsWeight: "30064Kg",
              cmsEi: "IM",
              loc_stack: "2F-02-04-5",
              in_time: "20260507182400",
              containernumber: "FFAU3542029",
            },
            bcData: {
              transactiontype: "IN",
            },
          },
        ],
      })
    );

    expect(result.sourceType).toBe("cms");
    expect(Array.isArray(result.cms.containers)).toBe(true);
  });

  it("renders TruckIN containers[].cms payloads in the thermal layout", () => {
    const payload = parseCmsJsonPrintInput(
      JSON.stringify({
        state: 0,
        message: "OK",
        containers: [
          {
            cms: {
              cmsNO: "2605715819",
              cmsOp: "TRS",
              cmsSt: "FULL",
              cmsCmdt: "GE",
              cmsTid: "C28132",
              cmsNopol: "B9873UIX",
              cmsSizeCont: "40",
              cmsTime: "07/05/2026 18:24",
              cmsTerminal: "IN03",
              cmsWeight: "30064Kg",
              cmsEi: "IM",
              loc_stack: "2F-02-04-5",
              in_time: "20260507182400",
              containernumber: "FFAU3542029",
            },
            bcData: {
              transactiontype: "IN",
            },
          },
          {
            cms: {
              cmsNO: "2605715819",
              cmsOp: "TRS",
              cmsSt: "FULL",
              cmsCmdt: "GE",
              cmsTid: "C28132",
              cmsNopol: "B9873UIX",
              cmsSizeCont: "40",
              cmsTime: "07/05/2026 18:24",
              cmsTerminal: "IN03",
              cmsWeight: "27200Kg",
              cmsEi: "IM",
              loc_stack: "2E-16-02-2",
              in_time: "20260428021700",
              containernumber: "DFSU1969861",
            },
            bcData: {
              transactiontype: "IN",
            },
          },
        ],
      })
    );

    const document = buildCmsPrintDocument(payload.cms, payload.laneName);

    expect(document).toContain(">IMPORT<");
    expect(document).toContain("2605715819");
    expect(document).toContain("FFAU3542029");
    expect(document).toContain("DFSU1969861");
    expect(document).toContain("2F-02-04-5");
    expect(document).toContain("2E-16-02-2");
    expect(document).not.toContain("rawTransaction");
  });

  it("unwraps backend-style cms payloads", () => {
    const result = parseCmsJsonPrintInput(
      JSON.stringify({
        state: 0,
        cms: {
          cmsno: "CMS-001",
          container: "SEGU5321424",
        },
      })
    );

    expect(result.sourceType).toBe("cms");
    expect(result.cms).toEqual({
      cmsno: "CMS-001",
      container: "SEGU5321424",
    });
  });

  it("unwraps item arrays and uses the first object", () => {
    const result = parseCmsJsonPrintInput(
      JSON.stringify({
        state: 0,
        item: [
          {
            id: 1521143,
            container: "CAAU4565853",
            entrylaneid: 222,
            entrylanename: "JoinGate In 3",
          },
        ],
      })
    );

    expect(result.sourceType).toBe("transaction");
    expect(result.cms.transactionID).toBe(1521143);
  });

  it("builds XPS URLs from relative print paths", () => {
    expect(
      buildXpsUrlFromPrintPath("Post Gate 1 T03\\2026\\05\\07\\1521143_CMS_0705202601010099.xps")
    ).toBe(
      "http://183.91.69.74/logs/XPS/Post%20Gate%201%20T03/2026/05/07/1521143_CMS_0705202601010099.xps"
    );
  });
});
