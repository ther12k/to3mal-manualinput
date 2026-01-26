export const TransactionType = {
  In: 0,
  Out: 1,
} as const;

export type TransactionType = 0 | 1;

export const ChassisLength = {
  Feet20: 20,
  Feet40: 40,
  Feet45: 45,
} as const;

export type ChassisLength = 20 | 40 | 45;

export const ContainerDirection = {
  Export: 0,
  Import: 1,
} as const;

export type ContainerDirection = 0 | 1;

export const PictureType = {
  Gatepass: 0,
  Truck: 1,
  Container: 2,
  Document: 3,
  Other: 99,
} as const;

export type PictureType = 0 | 1 | 2 | 3 | 99;

export interface User {
  id: number;
  username: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  apikey: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: string;
}

// Container Picture
export interface ContainerPicture {
  id: number;
  type: PictureType;
  imagePath: string;
  description?: string | null;
  createdAt: string;
}

// Container within a transaction
export interface Container {
  id: number;
  containerNo: string;
  gatepass: string;
  direction: ContainerDirection;
  inspectionInAt?: string | null;
  inspectionOutAt?: string | null;
  pictures: ContainerPicture[];
}

// Transaction (Truck Visit)
export interface Transaction {
  id: number;
  stid: string; // Truck ID
  type: TransactionType;
  axle: number;
  plateNo: string | null;
  hasPlate: boolean;
  chassisLength: ChassisLength;
  weight: number | null;
  picturePaths: string[];
  gateInAt?: string | null;
  gateOutAt?: string | null;
  createdBy: number;
  createdByUsername: string;
  createdAt: string;
  updatedBy: number | null;
  updatedByUsername: string | null;
  updatedAt: string | null;
  containers: Container[];
}

export interface CreateContainerInput {
  containerNo: string;
  gatepass: string;
  direction: ContainerDirection;
  inspectionInAt?: string | null;
  inspectionOutAt?: string | null;
}

export interface CreateTransactionRequest {
  stid: string;
  type: TransactionType;
  axle: number;
  plateNo?: string;
  hasPlate: boolean;
  chassisLength: ChassisLength;
  weight?: number;
  picturePaths?: string[];
  gateInAt?: string | null;
  gateOutAt?: string | null;
  containers: CreateContainerInput[];
}

export interface UpdateContainerInput {
  id?: number | null; // Null for new containers in existing transaction
  containerNo: string;
  gatepass: string;
  direction: ContainerDirection;
  inspectionInAt?: string | null;
  inspectionOutAt?: string | null;
}

export interface UpdateTransactionRequest {
  stid?: string;
  type?: TransactionType;
  axle?: number;
  plateNo?: string;
  hasPlate?: boolean;
  chassisLength?: ChassisLength;
  weight?: number;
  picturePaths?: string[];
  gateInAt?: string | null;
  gateOutAt?: string | null;
  containers?: UpdateContainerInput[];
}

export interface SearchTransactionsQuery {
  stid?: string;
  containerNo?: string;
  gatepass?: string;
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
}

// Legacy types support (mapped to new structure in UI logic if needed, or removed)
// Keeping simple ContainerRecord for backward compat if any unmigrated code uses it
export interface ContainerRecord {
  id: number;
  type: TransactionType;
  containerNo: string;
  stid: string;
  gatepass: string;
  weight: number | null;
  axle: number | null;
  plateNo: string | null;
  hasPlate: boolean;
  chassisLength: ChassisLength;
  picturePaths: string[];
  createdBy: number;
  createdByUsername: string;
  createdAt: string;
  updatedAt: string | null;
  updatedBy: number | null;
  updatedByUsername: string | null;
  inspectionInAt?: string | null;
  inspectionOutAt?: string | null;
  gateInAt?: string | null;
  gateOutAt?: string | null;
}

// ========================
// POSTGATE TYPES
// ========================

// PostGate Eticket Transaction Response from GetEticketByTransaction
export interface PostGateEticketItem {
  id: number;
  datetime: string;
  laneid: number;
  transactionid: number;
  code: string;
  data: string;
  type: string;
  media: string;
  reqno: string;
  container: string;
}

export interface PostGateTransaction {
  ID: number;
  DATETIME: string;
  TERMINAL: string;
  TRUCKID: string;
  NOPOL: string;
  CONTAINER: string;
  ENTRYLANEID: number;
  ENTRYLANEIP: string;
  ENTRYLANENAME: string;
  ENTRYSTARTTIME: string;
  ENTRYPICTURE: number;
  ENTRYWEIGHT: number;
  ENTRYFINISHTIME: string;
  ENTRYELAPSEDTIME: number;
  ENTRYSTATUS: string;
  ENTRYPRINT: string;
  EXITLANEID: number | null;
  EXITLANEIP: string | null;
  EXITLANENAME: string | null;
  EXITSTARTTIME: string | null;
  EXITPICTURE: number | null;
  EXITWEIGHT: number | null;
  EXITFINISHTIME: string | null;
  EXITELAPSEDTIME: number | null;
  EXITSTATUS: string | null;
  EXITPRINT: string | null;
  POSTGATETIME: string | null;
  COMPLETE: number;
}

// PostGate Check Inspection Response from POST /api/inspection/check
export interface PostGateInspectionContainer {
  containerId: string;
  idTrx: string;
  sealNumber: string;
  weight: string;
}

export interface PostGateInspectionResponse {
  state: number;
  truckId: string;
  nopol: string;
  containers: PostGateInspectionContainer[];
}

// PostGate TruckIN Request for POST /api/Transaction/TruckIN
export interface PostGateTruckINRequest {
  transactionID: number;
  laneID: number;
  truckID: string;
  nopol: string;
  postgate: true;
  mediaScan?: string;
  gatepassList: string[];
}

// PostGate TruckIN Response
export interface PostGateTruckINResponse {
  state: number;
  message: string;
  cms?: Record<string, unknown>;
  bcData?: Record<string, unknown>;
}

// PostGate Update Weight Request
export interface PostGateUpdateWeightRequest {
  id: number;
  weight: number;
}

// Lane/Gate from GetAllLane API
export interface Lane {
  id: number;
  name: string;
  ip: string;
  lanetype: string;
  hasweightbridge: number;
  transactiontype: string; // "IN", "OUT", "DISABLE"
  hasprinter: number;
  adamip: string;
  adamport: number;
  pushbutton: string;
  malserviceurl: string | null;
  tO3SERVICEURL: string;
  cpprintserviceurl: string;
  postgateprintserviceurl: string;
  portal: string;
  tO3TYPE: string;
  pushbuttoncancel: string;
}
