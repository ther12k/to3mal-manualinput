import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ReprintPage } from "@/pages/Reprint/ReprintPage";
import { api } from "@/lib/api/client";

const { toast } = vi.hoisted(() => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

const { qrPayload } = vi.hoisted(() => ({
  qrPayload: {
    value: "AF49F017",
  },
}));

const { scanHookMocks } = vi.hoisted(() => ({
  scanHookMocks: {
    startNfcReading: vi.fn(),
    stopNfcReading: vi.fn(),
    startQrScanning: vi.fn(),
    stopQrScanning: vi.fn(),
    handleQrScanResult: vi.fn(),
    handleQrScanError: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast,
}));

vi.mock("@/hooks/useNFCReader", () => ({
  useNFCReader: () => ({
    isSupported: false,
    isReading: false,
    error: null,
    startReading: scanHookMocks.startNfcReading,
    stopReading: scanHookMocks.stopNfcReading,
    lastReadData: null,
  }),
}));

vi.mock("@/hooks/useQRScanner", () => ({
  useQRScanner: () => ({
    isSupported: true,
    isScanning: false,
    error: null,
    startScanning: scanHookMocks.startQrScanning,
    stopScanning: scanHookMocks.stopQrScanning,
    handleScanResult: scanHookMocks.handleQrScanResult,
    handleScanError: scanHookMocks.handleQrScanError,
    lastScannedData: null,
  }),
}));

vi.mock("react-qr-reader", () => ({
  QrReader: ({ onResult }: { onResult: (result: { getText: () => string } | null, error?: Error) => void }) => (
    <button
      type="button"
      onClick={() => onResult({ getText: () => qrPayload.value })}
    >
      Mock QR Scan
    </button>
  ),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    getTransactionByID: vi.fn(),
    getTransactionByGatepass: vi.fn(),
    reprintCMS: vi.fn(),
  },
}));

const transaction = {
  id: 1520203,
  datetime: "2026-05-06T16:29:33",
  terminal: "T3I",
  truckid: "SHCU2215522",
  nopol: "B 1234 XYZ",
  container: "REC267000122678",
  entrylaneid: 202,
  entrylaneip: "10.0.0.1",
  entrylanename: "Gate IN 4",
  entrystarttime: "2026-05-06T16:29:33",
  entrypicture: 1,
  entryweight: 220020800,
  entryfinishtime: "2026-05-06T16:30:00",
  entryelapsedtime: 27,
  entrystatus: "OK",
  entryprint: "OK",
  exitlaneid: null,
  exitlaneip: null,
  exitlanename: null,
  exitstarttime: null,
  exitpicture: null,
  exitweight: null,
  exitfinishtime: null,
  exitelapsedtime: null,
  exitstatus: null,
  exitprint: null,
  postdatetime: null,
  complete: 0,
};

function renderReprintPage() {
  return render(
    <MemoryRouter>
      <ReprintPage />
    </MemoryRouter>
  );
}

describe("ReprintPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    qrPayload.value = "AF49F017";
  });

  it("loads transaction lane data before calling ReprintCMS and opening CMS preview", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTransactionByID).mockResolvedValue({
      state: 0,
      item: transaction,
    } as any);
    vi.mocked(api.reprintCMS).mockResolvedValue({
      state: 0,
      message: "Success",
      containers: null,
      cms: {
        cmsno: "2605715159",
        container: "SHCU2215522",
      },
      bcData: null,
    });

    renderReprintPage();

    // Switch to Manual mode first (default is now RFID)
    await user.click(screen.getByRole("button", { name: "Manual" }));

    await user.type(screen.getByLabelText("Transaction ID *"), "1520203");
    await user.click(screen.getByRole("button", { name: "Print CMS" }));

    await waitFor(() => {
      expect(api.getTransactionByID).toHaveBeenCalledWith("1520203");
      expect(api.reprintCMS).toHaveBeenCalledWith({
        transactionID: 1520203,
        laneID: 202,
      });
    });

    expect(await screen.findByText("CMS Preview")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Print CMS" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Gate IN 4")).toBeInTheDocument();
  });

  it("uses RFID input as a gatepass lookup before reprinting CMS", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTransactionByGatepass).mockResolvedValue({
      state: 0,
      item: transaction,
    } as any);
    vi.mocked(api.reprintCMS).mockResolvedValue({
      state: 0,
      message: "Success",
      containers: null,
      cms: {
        cmsno: "2605715159",
        container: "SHCU2215522",
      },
      bcData: null,
    });

    renderReprintPage();

    await user.click(screen.getByRole("button", { name: "RFID" }));
    await user.type(screen.getByLabelText("Container / RFID Number"), "2f:83:a2:80");
    await user.click(screen.getByRole("button", { name: "Print CMS" }));

    await waitFor(() => {
      expect(api.getTransactionByGatepass).toHaveBeenCalledWith(
        "-1|T3I|TOSNUS|2F83A280|||||"
      );
      expect(api.reprintCMS).toHaveBeenCalledWith({
        transactionID: 1520203,
        laneID: 202,
      });
    });

    expect(await screen.findByText("CMS Preview")).toBeInTheDocument();
    expect(api.getTransactionByID).not.toHaveBeenCalled();
  });

  it("uses QR scan result as a gatepass lookup before reprinting CMS", async () => {
    const user = userEvent.setup();
    qrPayload.value = "https://to3.halotec.my.id/?gatepass=-1%7CT3I%7CTOSNUS%7CAF49F017%7C%7C%7C%7C%7C";
    vi.mocked(api.getTransactionByGatepass).mockResolvedValue({
      state: 0,
      item: transaction,
    } as any);
    vi.mocked(api.reprintCMS).mockResolvedValue({
      state: 0,
      message: "Success",
      containers: null,
      cms: {
        cmsno: "2605715159",
        container: "SHCU2215522",
      },
      bcData: null,
    });

    renderReprintPage();

    await user.click(screen.getByRole("button", { name: "QR Scan" }));
    await user.click(await screen.findByRole("button", { name: "Mock QR Scan" }));

    await waitFor(() => {
      expect(api.getTransactionByGatepass).toHaveBeenCalledWith(
        "-1|T3I|TOSNUS|AF49F017|||||"
      );
      expect(api.reprintCMS).toHaveBeenCalledWith({
        transactionID: 1520203,
        laneID: 202,
      });
    });

    expect(await screen.findByText("CMS Preview")).toBeInTheDocument();
    expect(api.getTransactionByID).not.toHaveBeenCalled();
  });

  it("shows a clear error when ReprintCMS returns no cms payload", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTransactionByID).mockResolvedValue({
      state: 0,
      item: transaction,
    } as any);
    vi.mocked(api.reprintCMS).mockResolvedValue({
      state: 1,
      message: null,
      containers: null,
      cms: null,
      bcData: null,
    });

    renderReprintPage();

    // Switch to Manual mode first (default is now RFID)
    await user.click(screen.getByRole("button", { name: "Manual" }));

    await user.type(screen.getByLabelText("Transaction ID *"), "1520203");
    await user.click(screen.getByRole("button", { name: "Print CMS" }));

    const expectedMessage =
      "No saved CMS print data found for this transaction. Reprint only works after a successful Gate In/TruckIN print was saved.";
    expect(await screen.findByText(expectedMessage)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith(expectedMessage);
  });

  it("opens CMS preview when ReprintCMS returns nested containers cms data", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTransactionByID).mockResolvedValue({
      state: 0,
      item: transaction,
    } as any);
    vi.mocked(api.reprintCMS).mockResolvedValue({
      state: 0,
      message: "Success",
      containers: [
        {
          cms: {
            cmsno: "2605715159",
            containernumber: "SHCU2215522",
          },
          bcData: null,
        },
      ],
      cms: null,
      bcData: null,
    });

    renderReprintPage();

    await user.click(screen.getByRole("button", { name: "Manual" }));
    await user.type(screen.getByLabelText("Transaction ID *"), "1520203");
    await user.click(screen.getAllByRole("button", { name: "Print CMS" })[0]);

    expect(await screen.findByText("CMS Preview")).toBeInTheDocument();
    expect(screen.getByText("Gate IN 4")).toBeInTheDocument();
  });
});
