import { Room, Device, Meeting, InspectionTask, FaultTicket } from '@/types';
import { addDays, addHours, addMinutes, format, startOfToday, subDays } from 'date-fns';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const createInitialRooms = (): Room[] => [
  {
    id: 'room-1',
    name: '星辰大会议室',
    capacity: 30,
    location: 'A座3楼301',
    status: 'normal',
  },
  {
    id: 'room-2',
    name: '明月中会议室',
    capacity: 15,
    location: 'A座3楼302',
    status: 'normal',
  },
  {
    id: 'room-3',
    name: '晨曦小会议室',
    capacity: 6,
    location: 'B座2楼201',
    status: 'normal',
  },
  {
    id: 'room-4',
    name: '多功能厅',
    capacity: 100,
    location: 'C座1楼',
    status: 'normal',
  },
];

export const createInitialDevices = (): Device[] => [
  { id: 'dev-1-1', name: '爱普生投影仪', type: 'projector', roomId: 'room-1', model: 'CB-2255U', status: 'normal', purchaseDate: '2024-01-15' },
  { id: 'dev-1-2', name: 'BOSE音响系统', type: 'speaker', roomId: 'room-1', model: 'L1 Pro 32', status: 'normal', purchaseDate: '2024-01-15' },
  { id: 'dev-1-3', name: '智能门禁', type: 'access', roomId: 'room-1', model: 'ZK-F20', status: 'normal', purchaseDate: '2024-02-01' },
  { id: 'dev-1-4', name: '华为交换机', type: 'network', roomId: 'room-1', model: 'S5735-L24T', status: 'normal', purchaseDate: '2024-01-15' },

  { id: 'dev-2-1', name: '明基投影仪', type: 'projector', roomId: 'room-2', model: 'MS560', status: 'normal', purchaseDate: '2024-03-10' },
  { id: 'dev-2-2', name: 'JBL会议音响', type: 'speaker', roomId: 'room-2', model: 'Control 25AV', status: 'fault', purchaseDate: '2024-03-10' },
  { id: 'dev-2-3', name: '智能门禁', type: 'access', roomId: 'room-2', model: 'ZK-F20', status: 'normal', purchaseDate: '2024-03-10' },
  { id: 'dev-2-4', name: '华为AP设备', type: 'network', roomId: 'room-2', model: 'AirEngine 5760', status: 'normal', purchaseDate: '2024-03-10' },

  { id: 'dev-3-1', name: '极米投影仪', type: 'projector', roomId: 'room-3', model: 'H3S', status: 'normal', purchaseDate: '2024-05-20' },
  { id: 'dev-3-2', name: '索尼蓝牙音响', type: 'speaker', roomId: 'room-3', model: 'SRS-XB43', status: 'normal', purchaseDate: '2024-05-20' },
  { id: 'dev-3-3', name: '智能门禁', type: 'access', roomId: 'room-3', model: 'ZK-F20', status: 'normal', purchaseDate: '2024-05-20' },
  { id: 'dev-3-4', name: 'TP-Link路由器', type: 'network', roomId: 'room-3', model: 'Archer AX6000', status: 'normal', purchaseDate: '2024-05-20' },

  { id: 'dev-4-1', name: '科视激光投影', type: 'projector', roomId: 'room-4', model: 'LWU550-APS', status: 'normal', purchaseDate: '2023-11-01' },
  { id: 'dev-4-2', name: '专业线阵音响', type: 'speaker', roomId: 'room-4', model: 'JBL VRX900', status: 'normal', purchaseDate: '2023-11-01' },
  { id: 'dev-4-3', name: '双开门禁', type: 'access', roomId: 'room-4', model: 'ZK-F28', status: 'normal', purchaseDate: '2023-11-01' },
  { id: 'dev-4-4', name: '华为核心交换机', type: 'network', roomId: 'room-4', model: 'S6730-H48X6C', status: 'normal', purchaseDate: '2023-11-01' },
];

export const createInitialMeetings = (): Meeting[] => {
  const today = startOfToday();
  return [
    {
      id: 'meeting-1',
      title: 'Q2季度产品规划评审会',
      roomId: 'room-1',
      startTime: format(addHours(today, 10), "yyyy-MM-dd'T'HH:mm:ss"),
      endTime: format(addHours(today, 12), "yyyy-MM-dd'T'HH:mm:ss"),
      organizer: '张经理',
      status: 'scheduled',
      deviceIds: ['dev-1-1', 'dev-1-2', 'dev-1-3', 'dev-1-4'],
    },
    {
      id: 'meeting-2',
      title: '技术方案讨论会',
      roomId: 'room-3',
      startTime: format(addHours(today, 14), "yyyy-MM-dd'T'HH:mm:ss"),
      endTime: format(addMinutes(addHours(today, 15), 30), "yyyy-MM-dd'T'HH:mm:ss"),
      organizer: '李工程师',
      status: 'scheduled',
      deviceIds: ['dev-3-1', 'dev-3-3', 'dev-3-4'],
    },
    {
      id: 'meeting-3',
      title: '上周工作总结会议',
      roomId: 'room-2',
      startTime: format(subDays(today, 1), "yyyy-MM-dd'T'") + '09:00:00',
      endTime: format(subDays(today, 1), "yyyy-MM-dd'T'") + '10:30:00',
      organizer: '王总监',
      status: 'completed',
      deviceIds: ['dev-2-1', 'dev-2-3', 'dev-2-4'],
      feedback: '会议顺利，设备运行正常',
    },
    {
      id: 'meeting-4',
      title: '新员工入职培训',
      roomId: 'room-1',
      startTime: format(addDays(today, 2), "yyyy-MM-dd'T'") + '09:00:00',
      endTime: format(addDays(today, 2), "yyyy-MM-dd'T'") + '12:00:00',
      organizer: 'HR部门',
      status: 'scheduled',
      deviceIds: ['dev-1-1', 'dev-1-2', 'dev-1-3', 'dev-1-4'],
    },
  ];
};

export const createInitialInspections = (): InspectionTask[] => {
  const today = startOfToday();
  return [
    {
      id: 'insp-1',
      meetingId: 'meeting-1',
      deviceIds: ['dev-1-1', 'dev-1-2', 'dev-1-3', 'dev-1-4'],
      inspector: '管理员',
      status: 'pending',
      startTime: format(addMinutes(addHours(today, 9), 30), "yyyy-MM-dd'T'HH:mm:ss"),
      checkItems: [
        { deviceId: 'dev-1-1', deviceName: '爱普生投影仪', checked: false, normal: true },
        { deviceId: 'dev-1-2', deviceName: 'BOSE音响系统', checked: false, normal: true },
        { deviceId: 'dev-1-3', deviceName: '智能门禁', checked: false, normal: true },
        { deviceId: 'dev-1-4', deviceName: '华为交换机', checked: false, normal: true },
      ],
    },
    {
      id: 'insp-2',
      meetingId: 'meeting-3',
      deviceIds: ['dev-2-1', 'dev-2-3', 'dev-2-4'],
      inspector: '管理员',
      status: 'completed',
      startTime: format(subDays(today, 1), "yyyy-MM-dd'T'") + '08:30:00',
      completeTime: format(subDays(today, 1), "yyyy-MM-dd'T'") + '08:50:00',
      checkItems: [
        { deviceId: 'dev-2-1', deviceName: '明基投影仪', checked: true, normal: true },
        { deviceId: 'dev-2-3', deviceName: '智能门禁', checked: true, normal: true },
        { deviceId: 'dev-2-4', deviceName: '华为AP设备', checked: true, normal: true },
      ],
    },
  ];
};

export const createInitialFaults = (): FaultTicket[] => [
  {
    id: 'fault-1',
    deviceId: 'dev-2-2',
    meetingId: 'meeting-3',
    reporter: '王总监',
    description: '音响系统有杂音，音质不清晰，影响会议使用',
    status: 'processing',
    handler: '赵工程师',
    createTime: format(subDays(startOfToday(), 1), "yyyy-MM-dd'T'") + '11:00:00',
    fixNote: '正在排查音频线路和扬声器问题',
  },
];

export const createInitialData = () => ({
  rooms: createInitialRooms(),
  devices: createInitialDevices(),
  meetings: createInitialMeetings(),
  inspections: createInitialInspections(),
  faults: createInitialFaults(),
  exportRecords: [],
});
