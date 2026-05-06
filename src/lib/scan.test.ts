import { buildGatepassFromScannedValue, normalizeScannedIdentifier } from "@/lib/scan";

describe("scan helpers", () => {
  it("normalizes RFID-style identifiers", () => {
    expect(normalizeScannedIdentifier("2f:83:a2:80")).toBe("2F83A280");
  });

  it("builds a gatepass from a raw scanned value", () => {
    expect(buildGatepassFromScannedValue("af49f017")).toBe("-1|T3I|TOSNUS|AF49F017|||||");
  });

  it("keeps a full gatepass unchanged", () => {
    expect(buildGatepassFromScannedValue("-1|T3I|TOSNUS|AF49F017|||||")).toBe(
      "-1|T3I|TOSNUS|AF49F017|||||"
    );
  });

  it("extracts gatepass from a QR URL payload", () => {
    expect(
      buildGatepassFromScannedValue(
        "https://to3.halotec.my.id/?gatepass=-1%7CT3I%7CTOSNUS%7CAF49F017%7C%7C%7C%7C%7C"
      )
    ).toBe("-1|T3I|TOSNUS|AF49F017|||||");
  });
});
