import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReprintPage } from "@/pages/Reprint/ReprintPage";
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

vi.mock("@/lib/api/client", () => ({
  api: {
    getTransactionByID: vi.fn(),
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

describe("ReprintPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    render(<ReprintPage />);

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
    expect(screen.getByRole("button", { name: "Print CMS" })).toBeInTheDocument();
    expect(screen.getByText("Gate IN 4")).toBeInTheDocument();
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

    render(<ReprintPage />);

    await user.type(screen.getByLabelText("Transaction ID *"), "1520203");
    await user.click(screen.getByRole("button", { name: "Print CMS" }));

    expect(await screen.findByText("CMS reprint data not found")).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("CMS reprint data not found");
  });
});
