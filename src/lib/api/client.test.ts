import { api, createApiError } from "@/lib/api/client";

function mockJsonResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

describe("api client", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("formats the login request and stores credentials on success", async () => {
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        state: 0,
        message: "Success",
      })
    );

    const result = await api.login({
      username: "deja",
      password: "secret",
      apikey: "abc+/=",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/Configuration/Login?Apikey=abc%2B%2F%3D",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "deja",
          password: "secret",
        }),
      }
    );
    expect(localStorage.getItem("apikey")).toBe("abc+/=");
    expect(localStorage.getItem("token")).toBe("authenticated");
    expect(localStorage.getItem("username")).toBe("deja");
    expect(result).toEqual({
      token: "authenticated",
      username: "deja",
      role: "User",
    });
  });

  it("formats GetTransaction by gatepass as a POST with encoded query params", async () => {
    localStorage.setItem("apikey", "key with spaces");
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        state: 0,
        item: { id: 1520203 },
      })
    );

    await api.getTransactionByGatepass("-1|T3I|TOSNUS|AF49F017|||||");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/Transaction/GetTransaction?Apikey=key%20with%20spaces&gatepass=-1%7CT3I%7CTOSNUS%7CAF49F017%7C%7C%7C%7C%7C",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  });

  it("formats TruckIN with the expected JSON body", async () => {
    localStorage.setItem("apikey", "truck-key");
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        state: 0,
        message: "Success",
      })
    );

    await api.postGateTruckIN({
      transactionID: 1513974,
      laneID: 141,
      truckID: "TOSNUS",
      nopol: "AF49F017",
      postgate: true,
      mediaScan: "TID^AF49F017",
      gatepassList: ["-1|T3I|TOSNUS|AF49F017|||||"],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/Transaction/TruckIN?ApiKey=truck-key",
      {
        method: "POST",
        body: JSON.stringify({
          transactionID: 1513974,
          laneID: 141,
          truckID: "TOSNUS",
          nopol: "AF49F017",
          postgate: true,
          mediaScan: "TID^AF49F017",
          gatepassList: ["-1|T3I|TOSNUS|AF49F017|||||"],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  });

  it("formats ReprintCMS with the expected JSON body", async () => {
    localStorage.setItem("apikey", "reprint-key");
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        state: 0,
        message: "Success",
        cms: {
          cmsno: "CMS-001",
        },
      })
    );

    await api.reprintCMS({
      transactionID: 1513974,
      laneID: 141,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/Transaction/ReprintCMS?ApiKey=reprint-key",
      {
        method: "POST",
        body: JSON.stringify({
          transactionID: 1513974,
          laneID: 141,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  });

  it("formats InputManualAMS with URLSearchParams", async () => {
    localStorage.setItem("apikey", "ams key");
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        state: 0,
        message: "Success",
      })
    );

    await api.inputManualAMS({
      transactionID: 1514056,
      noReq: "REC267000115286",
      container: "TCKU7308830",
      containerCombo: "TCKU7308831",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/Transaction/InputManualAMS?Apikey=ams+key&transactionID=1514056&noReq=REC267000115286&container=TCKU7308830&containerCombo=TCKU7308831",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  });

  it("throws ApiError with backend message when a request fails", async () => {
    localStorage.setItem("apikey", "bad-key");
    fetchMock.mockResolvedValue(
      mockJsonResponse(
        {
          message: "Transaction Not Found",
        },
        false,
        404
      )
    );

    await expect(api.getTransactionByID("999")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Transaction Not Found",
    });
  });

  it("throws a not authenticated error when current user data is missing", async () => {
    expect(() => api.getCurrentUser()).toThrowError(
      expect.objectContaining({
        name: "ApiError",
        status: 401,
        message: "Not authenticated",
      })
    );
  });

  it("creates ApiError objects with the expected shape", () => {
    const error = createApiError(500, "Backend exploded");

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: "ApiError",
      status: 500,
      message: "Backend exploded",
    });
  });
});
