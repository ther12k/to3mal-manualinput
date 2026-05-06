import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomsPage } from "@/pages/Customs/CustomsPage";
import { api } from "@/lib/api/client";

const { toast } = vi.hoisted(() => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
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
    startReading: vi.fn(),
    stopReading: vi.fn(),
    lastReadData: null,
  }),
}));

vi.mock("@/hooks/useQRScanner", () => ({
  useQRScanner: () => ({
    isSupported: false,
    isScanning: false,
    error: null,
    startScanning: vi.fn(),
    stopScanning: vi.fn(),
    handleScanResult: vi.fn(),
    handleScanError: vi.fn(),
    lastScannedData: null,
  }),
}));

vi.mock("react-qr-reader", () => ({
  QrReader: () => <div data-testid="qr-reader" />,
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    inputManualAMS: vi.fn(),
    updateManualOUTAMS: vi.fn(),
    getTransactionByGatepass: vi.fn(),
    getPostGateTransaction: vi.fn(),
  },
}));

describe("CustomsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits manual AMS input with normalized container values", async () => {
    const user = userEvent.setup();
    vi.mocked(api.inputManualAMS).mockResolvedValue({
      state: 0,
      message: "Success",
    });

    render(<CustomsPage />);

    await user.click(screen.getByRole("button", { name: "Manual" }));
    await user.type(screen.getByLabelText("Transaction ID *"), "1514056");
    await user.type(screen.getByLabelText("No Request *"), "rec267000115286");
    await user.type(screen.getByLabelText("Container *"), "tcku7308830");
    await user.type(screen.getByLabelText("Container Combo *"), "tcku7308831");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(api.inputManualAMS).toHaveBeenCalledWith({
        transactionID: 1514056,
        noReq: "REC267000115286",
        container: "TCKU7308830",
        containerCombo: "TCKU7308831",
      });
    });

    expect(await screen.findByText("AMS Input Successful!")).toBeInTheDocument();
  });

  it("prefills transaction data from RFID lookup and leaves container combo editable", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTransactionByGatepass).mockResolvedValue({
      state: 0,
      item: {
        id: 1520203,
        entrylaneid: 202,
      },
    } as any);
    vi.mocked(api.getPostGateTransaction).mockResolvedValue({
      state: 0,
      item: [
        {
          id: 1614623,
          datetime: "2026-05-06T16:29:33",
          laneid: 202,
          transactionid: 1520203,
          code: "0FD0C0C8",
          data: "-1|T3I|TOSNUS|0FD0C0C8|||||",
          type: "T3I",
          media: "TID",
          reqno: "REC267000122678",
          container: "SHCU2215522",
        },
      ],
    });

    render(<CustomsPage />);

    await user.type(screen.getByLabelText("Container / RFID Number"), "2f:83:a2:80");
    await user.click(screen.getByRole("button", { name: "Process" }));

    await waitFor(() => {
      expect(api.getTransactionByGatepass).toHaveBeenCalledWith(
        "-1|T3I|TOSNUS|2F83A280|||||"
      );
    });

    expect(await screen.findByLabelText("Transaction ID *")).toHaveValue(1520203);
    expect(screen.getByLabelText("Transaction ID *")).toBeDisabled();
    expect(screen.getByLabelText("No Request *")).toHaveValue("REC267000122678");
    expect(screen.getByLabelText("No Request *")).toBeDisabled();
    expect(screen.getByLabelText("Container *")).toHaveValue("SHCU2215522");
    expect(screen.getByLabelText("Container *")).toBeDisabled();

    const comboInput = screen.getByLabelText("Container Combo *");
    expect(comboInput).toHaveValue("SHCU2215522");
    expect(comboInput).not.toBeDisabled();
    expect(
      screen.getByText(/Prefilled from container - please verify\/update with correct Container Combo/i)
    ).toBeInTheDocument();
  });
});
