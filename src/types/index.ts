export interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  status: 'normal' | 'maintenance';
}

export type DeviceType = 'projector' | 'speaker' | 'access' | 'network';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  roomId: string;
  model: string;
  status: 'normal' | 'fault' | 'maintenance';
  purchaseDate: string;
}

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Meeting {
  id: string;
  title: string;
  roomId: string;
  startTime: string;
  endTime: string;
  organizer: string;
  status: MeetingStatus;
  deviceIds: string[];
  feedback?: string;
  abnormalReport?: string;
}

export interface CheckItem {
  deviceId: string;
  deviceName: string;
  checked: boolean;
  normal: boolean;
  remark?: string;
}

export type InspectionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface InspectionTask {
  id: string;
  meetingId: string;
  deviceIds: string[];
  inspector: string;
  status: InspectionStatus;
  startTime: string;
  completeTime?: string;
  checkItems: CheckItem[];
}

export type FaultStatus = 'open' | 'processing' | 'fixed' | 'closed';

export interface FaultTicket {
  id: string;
  deviceId: string;
  meetingId?: string;
  reporter: string;
  description: string;
  status: FaultStatus;
  handler?: string;
  fixNote?: string;
  createTime: string;
  fixTime?: string;
  closeTime?: string;
}

export type BorrowStatus = 'active' | 'returning' | 'completed' | 'cancelled';

export interface BorrowRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  sourceRoomId: string;
  sourceRoomName: string;
  targetRoomId: string;
  targetRoomName: string;
  meetingId: string;
  meetingTitle: string;
  reason: string;
  expectedReturnTime: string;
  actualReturnTime?: string;
  approver: string;
  status: BorrowStatus;
  createTime: string;
  borrowStartTime: string;
  borrowEndTime: string;
}

export interface FaultImpactAnalysis {
  faultId: string;
  deviceId: string;
  deviceName: string;
  affectedMeetings: {
    meetingId: string;
    meetingTitle: string;
    roomId: string;
    roomName: string;
    startTime: string;
    endTime: string;
    organizer: string;
    usesDevice: boolean;
  }[];
  affectedRooms: {
    roomId: string;
    roomName: string;
    meetingCount: number;
  }[];
  alternativeDevices: {
    deviceId: string;
    deviceName: string;
    roomId: string;
    roomName: string;
    type: DeviceType;
    available: boolean;
  }[];
}

export type ExportType = 'device_usage' | 'inspection' | 'fault' | 'comprehensive' | 'borrow' | 'fault_impact';

export interface ExportRecord {
  id: string;
  type: ExportType;
  startTime: string;
  endTime: string;
  fileName: string;
  generateTime: string;
  operator: string;
}

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  projector: '投影仪',
  speaker: '音响',
  access: '门禁',
  network: '网络设备',
};

export const DEVICE_STATUS_LABELS: Record<Device['status'], string> = {
  normal: '正常',
  fault: '故障',
  maintenance: '维护中',
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  pending: '待检查',
  in_progress: '检查中',
  completed: '已完成',
  failed: '检查失败',
};

export const FAULT_STATUS_LABELS: Record<FaultStatus, string> = {
  open: '待处理',
  processing: '处理中',
  fixed: '已修复',
  closed: '已关闭',
};

export const BORROW_STATUS_LABELS: Record<BorrowStatus, string> = {
  active: '借调中',
  returning: '待归还检查',
  completed: '已归还',
  cancelled: '已取消',
};

export const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  device_usage: '设备占用报告',
  inspection: '设备检查报告',
  fault: '故障处理报告',
  comprehensive: '综合报告',
  borrow: '设备借调报告',
  fault_impact: '故障影响分析报告',
};
