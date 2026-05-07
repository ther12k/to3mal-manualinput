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
