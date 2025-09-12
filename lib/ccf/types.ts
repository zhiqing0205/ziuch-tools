export interface CCFMetadata {
  confMD5: string;
  accMD5: string;
  lastUpdate: string; // ISO date string
}

export interface CCFUpdateResult {
  success: boolean;
  message: string;
  metadata?: CCFMetadata;
}

export interface CCFDataResponse {
  conferences: any[];
  acceptances: any[];
  metadata: CCFMetadata;
}