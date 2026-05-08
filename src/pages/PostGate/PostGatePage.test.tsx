import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PostGatePage } from "@/pages/PostGate/PostGatePage";
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
    getAllLanes: vi.fn(),
    checkServerStatus: vi.fn(),
    getTransactionByID: vi.fn(),
    postGateTruckIN: vi.fn(),
    reprintCMS: vi.fn(),
  },
}));

describe("PostGatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAllLanes).mockResolvedValue([
      {
        id: 141,
        name: "Gate IN 1",
        transactiontype: "IN",
      },
    ] as any);
    vi.mocked(api.checkServerStatus).mockResolvedValue({
      state: 0,
      autogateMode: false,
      dbDown: false,
    } as any);
  });

  it("searches by transaction ID and confirms gate-in with lane from transaction data", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTransactionByID).mockResolvedValue({
      state: 0,
      item: {
        id: 1513974,
        datetime: "2026-04-30T00:21:57",
        terminal: "T3I",
        truckid: "AF49F017",
        nopol: "AF49F017",
        container: "TOSNUS",
        entrylaneid: 141,
        entrylaneip: "10.0.0.1",
        entrylanename: "Gate IN 1",
        entrystarttime: "2026-04-30T00:21:57",
        entrypicture: 1,
        entryweight: 45320,
        entryfinishtime: "2026-04-30T00:21:58",
        entryelapsedtime: 1.2,
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
      },
    } as any);
    vi.mocked(api.postGateTruckIN).mockResolvedValue({
      state: 0,
      message: "Success",
      cms: {
        cmsno: "CMS-001",
        container: "AF49F017",
      },
    } as any);

    render(
      <MemoryRouter>
        <PostGatePage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Manual" }));
    await user.type(screen.getByLabelText("Transaction ID *"), "1513974");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Confirm Gate-In")).toBeInTheDocument();
    expect(screen.getByText("Gate IN 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "CONFIRM GATE-IN" }));

    await waitFor(() => {
      expect(api.postGateTruckIN).toHaveBeenCalledWith({
        transactionID: 1513974,
        laneID: 141,
        truckID: "TOSNUS",
        nopol: "AF49F017",
        postgate: true,
        mediaScan: "picture1^I",
        gatepassList: ["-1|T3I|TOSNUS|AF49F017|||||"],
      });
    });

    expect(await screen.findByText("CMS Preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print CMS" })).toBeInTheDocument();
    expect(await screen.findByText("Gate-In Successful!")).toBeInTheDocument();
  });

  it("can load CMS preview from ReprintCMS without confirming gate-in again", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTransactionByID).mockResolvedValue({
      state: 0,
      item: {
        id: 1513974,
        datetime: "2026-04-30T00:21:57",
        terminal: "T3I",
        truckid: "AF49F017",
        nopol: "AF49F017",
        container: "TOSNUS",
        entrylaneid: 141,
        entrylaneip: "10.0.0.1",
        entrylanename: "Gate IN 1",
        entrystarttime: "2026-04-30T00:21:57",
        entrypicture: 1,
        entryweight: 45320,
        entryfinishtime: "2026-04-30T00:21:58",
        entryelapsedtime: 1.2,
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
      },
    } as any);
    vi.mocked(api.reprintCMS).mockResolvedValue({
      state: 0,
      message: "Success",
      cms: {
        cmsno: "CMS-REPRINT-001",
        container: "AF49F017",
      },
      bcData: null,
      containers: null,
    });

    render(
      <MemoryRouter>
        <PostGatePage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Manual" }));
    await user.type(screen.getByLabelText("Transaction ID *"), "1513974");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Confirm Gate-In")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "TEST PRINT CMS" }));

    await waitFor(() => {
      expect(api.reprintCMS).toHaveBeenCalledWith({
        transactionID: 1513974,
        laneID: 141,
      });
    });

    expect(await screen.findByText("CMS Preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print CMS" })).toBeInTheDocument();
    expect(api.postGateTruckIN).not.toHaveBeenCalled();
  });

  it("can load CMS preview from nested ReprintCMS containers payload", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getTransactionByID).mockResolvedValue({
      state: 0,
      item: {
        id: 1513974,
        datetime: "2026-04-30T00:21:57",
        terminal: "T3I",
        truckid: "AF49F017",
        nopol: "AF49F017",
        container: "TOSNUS",
        entrylaneid: 141,
        entrylaneip: "10.0.0.1",
        entrylanename: "Gate IN 1",
        entrystarttime: "2026-04-30T00:21:57",
        entrypicture: 1,
        entryweight: 45320,
        entryfinishtime: "2026-04-30T00:21:58",
        entryelapsedtime: 1.2,
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
      },
    } as any);
    vi.mocked(api.reprintCMS).mockResolvedValue({
      state: 0,
      message: "Success",
      containers: [
        {
          cms: {
            cmsno: "CMS-REPRINT-002",
            containernumber: "AF49F017",
          },
          bcData: null,
        },
      ],
      cms: null,
      bcData: null,
    } as any);

    render(
      <MemoryRouter>
        <PostGatePage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Manual" }));
    await user.type(screen.getByLabelText("Transaction ID *"), "1513974");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Confirm Gate-In")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "TEST PRINT CMS" }));

    expect(await screen.findByText("CMS Preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print CMS" })).toBeInTheDocument();
    expect(api.postGateTruckIN).not.toHaveBeenCalled();
  });
});
