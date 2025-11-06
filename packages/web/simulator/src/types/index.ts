// Type definitions for simulator
export interface DeviceInfo {
  deviceId: string;
  code: string;
  expiresAt: string;
}

export interface DeviceToken {
  token: string;
  expiresAt: string;
}

export interface SimulatorConfig {
  apiBaseUrl: string;
  storageDir: string;
}

export interface TimetableItem {
  id: string;
  title: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  content?: string;
}

export interface TimetableData {
  title: string;
  items: TimetableItem[];
  startTime?: string;
  totalDuration?: number;
}

export interface PresentationSaveRequest {
  gamma_url: string;
  title: string;
  start_time?: string;
  total_duration?: number;
  timetable_data: TimetableData;
}

export interface RegisterResponse {
  deviceId: string;
  code: string;
  expiresAt: string;
}
