import type {
  LoginRequest,
  LoginResponse,
  // PostGate Types
  PostGateTransaction,
  PostGateInspectionResponse,
  PostGateTruckINRequest,
  PostGateTruckINResponse,
  PostGateUpdateWeightRequest,
  Lane,
  PostGateEticketItem,
  // AMS Types
  AMSManualInputRequest,
  AMSManualInputResponse,
  AMSUpdateManualOUTRequest,
  AMSUpdateManualOUTResponse,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Helper to get API key from localStorage
function getApiKey(): string {
  return localStorage.getItem("apikey") || "";
}

export interface ApiError extends Error {
  status: number;
}

export function createApiError(status: number, message: string): ApiError {
  const error = Object.create(Error.prototype);
  error.name = "ApiError";
  error.message = message;
  error.status = status;
  return error;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred" }));
    throw createApiError(response.status, error.message || "An error occurred");
  }

  return response.json();
}

export const api = {
  // Auth - Login with username/password, validate via Login endpoint
  login: async (data: LoginRequest) => {
    // Validate credentials by calling the Login endpoint with the provided API key
    const response = await fetch(`${API_BASE_URL}/Configuration/Login?Apikey=${encodeURIComponent(data.apikey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: data.username,
        password: data.password,
      }),
    });

    if (!response.ok) {
      throw createApiError(response.status, "Login failed");
    }

    const result = await response.json();

    // Check if login was successful
    if (result.state !== 0) {
      throw createApiError(401, result.message || "Invalid username or password");
    }

    // Store API key for subsequent calls
    localStorage.setItem("apikey", data.apikey);
    localStorage.setItem("token", "authenticated");
    // Store a default username since we're using API key auth
    localStorage.setItem("username", data.username || "User");

    return Promise.resolve<LoginResponse>({
      token: "authenticated",
      username: data.username || "User",
      role: "User",
    });
  },

  logout: () => {
    localStorage.removeItem("apikey");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  },

  getCurrentUser: () => {
    const username = localStorage.getItem("username");
    const apikey = getApiKey();
    if (!username || !apikey) {
      throw createApiError(401, "Not authenticated");
    }
    return Promise.resolve<LoginResponse>({
      token: "authenticated",
      username: username,
      role: "User",
    });
  },

  // ========================
  // POSTGATE API ENDPOINTS
  // ========================

  // Get all lanes/gates
  getAllLanes: () => {
    const apikey = getApiKey();
    return request<Lane[]>(
      `/Configuration/GetAllLane?Apikey=${encodeURIComponent(apikey)}`,
      { method: "POST" }
    );
  },

  // Get Transaction by ID (returns both etickets and transaction details)
  getTransactionByID: (trId: string) => {
    const apikey = getApiKey();
    return request<{ state: number; item?: PostGateTransaction; message?: string }>(
      `/Transaction/GetTransactionByID?Apikey=${encodeURIComponent(apikey)}&trId=${encodeURIComponent(trId)}`,
      { method: "POST" }
    );
  },

  // 1. Get Eticket by Transaction ID (returns array of eticket items) - DEPRECATED, use getTransactionByID
  getPostGateTransaction: (transactionId: string, laneId: number) => {
    const apikey = getApiKey();
    return request<{ state: number; item?: PostGateEticketItem[]; message?: string }>(
      `/Transaction/GetEticketByTransaction?Apikey=${encodeURIComponent(apikey)}&transactionId=${encodeURIComponent(transactionId)}&laneId=${laneId}`,
      { method: "POST" }
    );
  },

  // Get Transaction by Gatepass (for getting weight and other details) - DEPRECATED, use getTransactionByID
  getTransactionByGatepass: (gatepass: string) => {
    const apikey = getApiKey();
    return request<{ state: number; item?: PostGateTransaction; message?: string }>(
      `/Transaction/GetTransaction?Apikey=${encodeURIComponent(apikey)}&gatepass=${encodeURIComponent(gatepass)}`,
      { method: "POST" }
    );
  },

  // 2. Check Inspection (not used in current flow - kept for reference)
  checkPostGateInspection: (data: {
    transactionID: number;
    laneID: number;
    gatepass: string;
    eticketstring?: string;
  }) => {
    const apikey = getApiKey();
    return request<PostGateInspectionResponse>(
      `/Transaction/CheckInspection?ApiKey=${encodeURIComponent(apikey)}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  // 3. Update Entry Transaction Weight
  updateEntryTransactionWeight: (id: number, weight: number) => {
    const apikey = getApiKey();
    return request<{ state: number; message: string; item: null }>(
      `/Transaction/UpdateEntryTransactionForWeight?Apikey=${encodeURIComponent(apikey)}&id=${id}&weight=${weight}`,
      { method: "POST" }
    );
  },

  // 4. TruckIN (Finalize Gate-In)
  postGateTruckIN: (data: PostGateTruckINRequest) => {
    const apikey = getApiKey();
    return request<PostGateTruckINResponse>(
      `/Transaction/TruckIN?ApiKey=${encodeURIComponent(apikey)}`,
      {
        method: "POST",
        body: JSON.stringify({
          transactionID: data.transactionID,
          laneID: data.laneID,
          truckID: data.truckID,
          nopol: data.nopol,
          postgate: data.postgate,
          mediaScan: data.mediaScan,
          gatepassList: data.gatepassList,
        }),
      }
    );
  },

  // Optional: Update Weight
  updatePostGateWeight: (data: PostGateUpdateWeightRequest) => {
    const apikey = getApiKey();
    return request<{ state: number; message: string }>(
      `/Transaction/UpdateWeight?Apikey=${encodeURIComponent(apikey)}&id=${data.id}&weight=${data.weight}`,
      { method: "POST" }
    );
  },

  // ========================
  // AMS API ENDPOINTS
  // ========================

  // Input Manual AMS
  inputManualAMS: (data: AMSManualInputRequest) => {
    const apikey = getApiKey();
    const params = new URLSearchParams({
      Apikey: apikey,
      transactionID: data.transactionID.toString(),
      noReq: data.noReq,
      container: data.container,
      containerCombo: data.containerCombo,
    });
    return request<AMSManualInputResponse>(
      `/Transaction/InputManualAMS?${params.toString()}`,
      { method: "POST" }
    );
  },

  // Update Manual OUT AMS
  updateManualOUTAMS: (data: AMSUpdateManualOUTRequest) => {
    const apikey = getApiKey();
    const params = new URLSearchParams({
      Apikey: apikey,
      transactionID: data.transactionID.toString(),
      noReq: data.noReq,
      container: data.container,
      containerCombo: data.containerCombo,
    });
    return request<AMSUpdateManualOUTResponse>(
      `/Transaction/UpdateManualOUTAMS?${params.toString()}`,
      { method: "POST" }
    );
  },
};
