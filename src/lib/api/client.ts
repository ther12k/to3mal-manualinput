import type {
  LoginRequest,
  LoginResponse,
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  SearchTransactionsQuery,
  Container,
  CreateContainerInput,
  ContainerPicture,
  PictureType,
  // PostGate Types
  PostGateTransaction,
  PostGateInspectionResponse,
  PostGateTruckINRequest,
  PostGateTruckINResponse,
  PostGateUpdateWeightRequest,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

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
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
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
  // Auth
  login: (data: LoginRequest) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getCurrentUser: () => request<LoginResponse>("/auth/me"),

  // Transactions
  getTransactions: (params?: SearchTransactionsQuery) => {
    const searchParams = new URLSearchParams();
    if (params?.stid) searchParams.append("stid", params.stid);
    if (params?.containerNo) searchParams.append("containerNo", params.containerNo);
    if (params?.gatepass) searchParams.append("gatepass", params.gatepass);
    if (params?.type !== undefined) searchParams.append("type", params.type.toString());
    if (params?.dateFrom) searchParams.append("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.append("dateTo", params.dateTo);

    const query = searchParams.toString();
    return request<Transaction[]>(`/transactions${query ? `?${query}` : ""}`);
  },

  getTransaction: (id: number) => request<Transaction>(`/transactions/${id}`),

  getTransactionByStid: (stid: string) => request<Transaction>(`/transactions/by-stid/${stid}`),

  createTransaction: (data: CreateTransactionRequest) =>
    request<Transaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTransaction: (id: number, data: UpdateTransactionRequest) =>
    request<Transaction>(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: number) =>
    request<void>(`/transactions/${id}`, { method: "DELETE" }),

  // Container Management (within transaction)
  addContainer: (transactionId: number, data: CreateContainerInput) =>
    request<Container>(`/transactions/${transactionId}/containers`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteContainer: (transactionId: number, containerId: number) =>
    request<void>(`/transactions/${transactionId}/containers/${containerId}`, {
      method: "DELETE",
    }),

  // Export
  exportExcel: (params?: SearchTransactionsQuery) => {
    // Currently re-using old endpoint params until backend export is updated to transactions
    // Assuming backend will be updated to handle transaction-based export or we map params
    const searchParams = new URLSearchParams();
    if (params?.containerNo) searchParams.append("containerNo", params.containerNo);
    if (params?.gatepass) searchParams.append("gatepass", params.gatepass);
    if (params?.type !== undefined) searchParams.append("type", params.type.toString());
    if (params?.dateFrom) searchParams.append("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.append("dateTo", params.dateTo);

    const query = searchParams.toString();
    const token = localStorage.getItem("token");

    // NOTE: If using old endpoint, it targets 'records/export/excel'. 
    // If we need new one, we should add 'transactions/export/excel'.
    // For now, assuming we might need to fix backend export or use this temporarily.
    // Let's stick to the old signature if backend hasn't updated export yet, 
    // BUT since we removed RecordsController, this WILL FAIL unless we add export to TransactionsController.
    // I noticed I didn't add Export to TransactionsController in the previous step.
    // I will add it to TransactionsController or fix this path. 
    // Let's assume I will fix backend controller to include export.
    return fetch(`${API_BASE_URL}/transactions/export/excel${query ? `?${query}` : ""}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }).then((response) => {
      if (!response.ok) throw new Error("Failed to export");
      return response.blob();
    });
  },

  // Upload
  uploadPictures: async (files: File[]): Promise<string[]> => {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload pictures");
    }

    return response.json();
  },

  // Upload single image from base64 data URL
  uploadSingleImage: async (dataUrl: string, fileName?: string): Promise<string> => {
    const token = localStorage.getItem("token");

    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create FormData with the blob
    const formData = new FormData();
    formData.append("file", blob, fileName || `image_${Date.now()}.jpg`);

    const uploadResponse = await fetch(`${API_BASE_URL}/upload/single`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload image");
    }

    const result = await uploadResponse.json();
    return result.path; // Backend returns { path: "..." }
  },

  // Container Pictures
  getContainerPictures: async (transactionId: number, containerId: number): Promise<ContainerPicture[]> => {
    return request<ContainerPicture[]>(`/transactions/${transactionId}/containers/${containerId}/pictures`);
  },

  addContainerPicture: async (
    transactionId: number,
    containerId: number,
    type: PictureType,
    imagePath: string,
    description?: string
  ): Promise<ContainerPicture> => {
    return request<ContainerPicture>(`/transactions/${transactionId}/containers/${containerId}/pictures`, {
      method: "POST",
      body: JSON.stringify({ type, imagePath, description }),
    });
  },

  deleteContainerPicture: async (transactionId: number, containerId: number, pictureId: number): Promise<void> => {
    return request<void>(`/transactions/${transactionId}/containers/${containerId}/pictures/${pictureId}`, {
      method: "DELETE",
    });
  },

  getPictureUrl: (filename: string) => `${API_BASE_URL}/upload/${filename}`,

  // ========================
  // POSTGATE API ENDPOINTS
  // ========================

  // 1. Get Transaction by Gatepass (TRX ID)
  // GET /api/transaction?gatepass={trxID}
  getPostGateTransaction: (gatepass: string) => {
    return request<{ state: number; item: PostGateTransaction }>(`/transaction?gatepass=${encodeURIComponent(gatepass)}`);
  },

  // 2. Check Inspection
  // POST /api/inspection/check
  checkPostGateInspection: (data: {
    transactionID: number;
    laneID: number;
    gatepass: string;
  }) => {
    return request<PostGateInspectionResponse>("/inspection/check", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 3. TruckIN (Finalize Gate-In)
  // POST /api/truckin
  postGateTruckIN: (data: PostGateTruckINRequest) => {
    return request<PostGateTruckINResponse>("/truckin", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Optional: Update Weight
  // POST /api/transaction/weight
  updatePostGateWeight: (data: PostGateUpdateWeightRequest) => {
    return request<{ state: number; message: string }>("/transaction/weight", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
