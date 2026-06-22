import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Room,
  Device,
  Meeting,
  InspectionTask,
  FaultTicket,
  ExportRecord,
  CheckItem,
  MeetingStatus,
  DeviceType,
  BorrowRecord,
  BorrowStatus,
  FaultImpactAnalysis,
} from '@/types';
import { createInitialData, generateId } from '@/data/initialData';
import {
  addDays,
  areIntervalsOverlapping,
  format,
  parseISO,
  startOfToday,
  isBefore,
} from 'date-fns';

interface AppState {
  rooms: Room[];
  devices: Device[];
  meetings: Meeting[];
  inspections: InspectionTask[];
  faults: FaultTicket[];
  exportRecords: ExportRecord[];
  borrowRecords: BorrowRecord[];

  addRoom: (room: Omit<Room, 'id'>) => void;
  updateRoom: (id: string, room: Partial<Room>) => void;
  deleteRoom: (id: string) => void;

  addDevice: (device: Omit<Device, 'id'>) => void;
  updateDevice: (id: string, device: Partial<Device>) => void;
  deleteDevice: (id: string) => void;

  createMeeting: (
    meeting: Omit<Meeting, 'id' | 'status'>,
    borrowDevices?: { deviceId: string; reason: string; approver: string }[]
  ) => { success: boolean; error?: string };
  updateMeeting: (id: string, meeting: Partial<Meeting>) => void;
  cancelMeeting: (id: string) => { success: boolean; error?: string };
  startMeeting: (id: string) => { success: boolean; error?: string };
  endMeeting: (
    id: string,
    data: { feedback?: string; abnormalReport?: string }
  ) => void;
  changeMeetingRoom: (
    meetingId: string,
    newRoomId: string
  ) => { success: boolean; error?: string; newDeviceIds?: string[] };

  createInspection: (meetingId: string) => void;
  updateInspectionCheckItem: (
    inspectionId: string,
    deviceId: string,
    data: Partial<CheckItem>
  ) => void;
  completeInspection: (
    inspectionId: string
  ) => { success: boolean; error?: string };

  createFault: (fault: Omit<FaultTicket, 'id' | 'status' | 'createTime'>) => void;
  updateFault: (id: string, fault: Partial<FaultTicket>) => void;
  assignFaultHandler: (id: string, handler: string) => void;
  fixFault: (id: string, fixNote: string) => void;
  closeFault: (id: string) => void;

  isDeviceAvailable: (
    deviceId: string,
    startTime: string,
    endTime: string,
    excludeMeetingId?: string
  ) => boolean;
  isDeviceFaulty: (deviceId: string) => boolean;
  isRoomAvailable: (
    roomId: string,
    startTime: string,
    endTime: string,
    excludeMeetingId?: string
  ) => boolean;
  getAvailableDevices: (
    roomId: string,
    startTime: string,
    endTime: string,
    types?: DeviceType[]
  ) => Device[];
  getBorrowableDevices: (
    targetRoomId: string,
    startTime: string,
    endTime: string,
    types?: DeviceType[]
  ) => Device[];
  isDeviceBorrowed: (
    deviceId: string,
    startTime: string,
    endTime: string,
    excludeMeetingId?: string
  ) => boolean;
  hasPendingReturnInspection: (deviceId: string) => boolean;

  createBorrowRecord: (
    data: Omit<BorrowRecord, 'id' | 'status' | 'createTime'>
  ) => void;
  updateBorrowRecord: (id: string, data: Partial<BorrowRecord>) => void;
  completeBorrowReturn: (borrowId: string) => { success: boolean; error?: string };
  cancelBorrow: (borrowId: string) => void;

  createReturnInspection: (borrowId: string) => void;
  completeReturnInspection: (
    inspectionId: string
  ) => { success: boolean; error?: string };

  getFaultImpactAnalysis: (faultId: string) => FaultImpactAnalysis | null;

  addExportRecord: (record: Omit<ExportRecord, 'id' | 'generateTime'>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...createInitialData(),

      addRoom: (room) =>
        set((state) => ({
          rooms: [...state.rooms, { ...room, id: generateId() }],
        })),

      updateRoom: (id, room) =>
        set((state) => ({
          rooms: state.rooms.map((r) => (r.id === id ? { ...r, ...room } : r)),
        })),

      deleteRoom: (id) =>
        set((state) => ({
          rooms: state.rooms.filter((r) => r.id !== id),
          devices: state.devices.filter((d) => d.roomId !== id),
        })),

      addDevice: (device) =>
        set((state) => ({
          devices: [...state.devices, { ...device, id: generateId() }],
        })),

      updateDevice: (id, device) =>
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? { ...d, ...device } : d
          ),
        })),

      deleteDevice: (id) =>
        set((state) => ({
          devices: state.devices.filter((d) => d.id !== id),
        })),

      isDeviceFaulty: (deviceId) => {
        const state = get();
        const device = state.devices.find((d) => d.id === deviceId);
        if (!device || device.status === 'fault') return true;
        const hasOpenFault = state.faults.some(
          (f) => f.deviceId === deviceId && f.status !== 'closed'
        );
        return hasOpenFault;
      },

      isDeviceAvailable: (deviceId, startTime, endTime, excludeMeetingId) => {
        const state = get();
        if (state.isDeviceFaulty(deviceId)) return false;
        if (state.isDeviceBorrowed(deviceId, startTime, endTime, excludeMeetingId)) return false;
        if (state.hasPendingReturnInspection(deviceId)) return false;

        const start = parseISO(startTime);
        const end = parseISO(endTime);

        for (const meeting of state.meetings) {
          if (excludeMeetingId && meeting.id === excludeMeetingId) continue;
          if (
            meeting.status !== 'scheduled' &&
            meeting.status !== 'in_progress'
          )
            continue;
          if (!meeting.deviceIds.includes(deviceId)) continue;

          const mStart = parseISO(meeting.startTime);
          const mEnd = parseISO(meeting.endTime);

          if (areIntervalsOverlapping({ start, end }, { start: mStart, end: mEnd })) {
            return false;
          }
        }
        return true;
      },

      isDeviceBorrowed: (deviceId, startTime, endTime, excludeMeetingId) => {
        const state = get();
        const start = parseISO(startTime);
        const end = parseISO(endTime);

        for (const borrow of state.borrowRecords) {
          if (borrow.status === 'completed' || borrow.status === 'cancelled') continue;
          if (excludeMeetingId && borrow.meetingId === excludeMeetingId) continue;

          const bStart = parseISO(borrow.borrowStartTime);
          const bEnd = parseISO(borrow.borrowEndTime);

          if (areIntervalsOverlapping({ start, end }, { start: bStart, end: bEnd })) {
            return true;
          }
        }
        return false;
      },

      hasPendingReturnInspection: (deviceId) => {
        const state = get();
        return state.borrowRecords.some(
          (b) => b.deviceId === deviceId && b.status === 'returning'
        );
      },

      getBorrowableDevices: (targetRoomId, startTime, endTime, types) => {
        const state = get();
        return state.devices.filter((d) => {
          if (d.roomId === targetRoomId) return false;
          if (types && !types.includes(d.type)) return false;
          return state.isDeviceAvailable(d.id, startTime, endTime);
        });
      },

      isRoomAvailable: (roomId, startTime, endTime, excludeMeetingId) => {
        const state = get();
        const start = parseISO(startTime);
        const end = parseISO(endTime);

        for (const meeting of state.meetings) {
          if (excludeMeetingId && meeting.id === excludeMeetingId) continue;
          if (
            meeting.status !== 'scheduled' &&
            meeting.status !== 'in_progress'
          )
            continue;
          if (meeting.roomId !== roomId) continue;

          const mStart = parseISO(meeting.startTime);
          const mEnd = parseISO(meeting.endTime);

          if (areIntervalsOverlapping({ start, end }, { start: mStart, end: mEnd })) {
            return false;
          }
        }
        return true;
      },

      getAvailableDevices: (roomId, startTime, endTime, types) => {
        const state = get();
        return state.devices.filter((d) => {
          if (d.roomId !== roomId) return false;
          if (types && !types.includes(d.type)) return false;
          return state.isDeviceAvailable(d.id, startTime, endTime);
        });
      },

      createMeeting: (meeting, borrowDevices = []) => {
        const state = get();

        if (!state.isRoomAvailable(meeting.roomId, meeting.startTime, meeting.endTime)) {
          return { success: false, error: '该会议室在所选时间段已被占用' };
        }

        for (const deviceId of meeting.deviceIds) {
          if (state.isDeviceFaulty(deviceId)) {
            const device = state.devices.find((d) => d.id === deviceId);
            return {
              success: false,
              error: `设备"${device?.name || '未知'}"已故障，不可使用`,
            };
          }
          if (!state.isDeviceAvailable(deviceId, meeting.startTime, meeting.endTime)) {
            const device = state.devices.find((d) => d.id === deviceId);
            return {
              success: false,
              error: `设备"${device?.name || '未知'}"在所选时间段已被占用`,
            };
          }
        }

        const newMeeting: Meeting = {
          ...meeting,
          id: generateId(),
          status: 'scheduled',
        };

        const targetRoom = state.rooms.find((r) => r.id === meeting.roomId);

        for (const borrowInfo of borrowDevices) {
          const device = state.devices.find((d) => d.id === borrowInfo.deviceId);
          const sourceRoom = device ? state.rooms.find((r) => r.id === device.roomId) : null;
          
          if (!device || !sourceRoom) continue;

          if (state.isDeviceBorrowed(borrowInfo.deviceId, meeting.startTime, meeting.endTime)) {
            return {
              success: false,
              error: `设备"${device.name}"在所选时间段已被借调`,
            };
          }

          if (state.hasPendingReturnInspection(borrowInfo.deviceId)) {
            return {
              success: false,
              error: `设备"${device.name}"待归还检查，不可借出`,
            };
          }

          const borrowRecord: BorrowRecord = {
            id: generateId(),
            deviceId: device.id,
            deviceName: device.name,
            sourceRoomId: sourceRoom.id,
            sourceRoomName: sourceRoom.name,
            targetRoomId: meeting.roomId,
            targetRoomName: targetRoom?.name || '未知会议室',
            meetingId: newMeeting.id,
            meetingTitle: meeting.title,
            reason: borrowInfo.reason,
            expectedReturnTime: meeting.endTime,
            approver: borrowInfo.approver,
            status: 'active',
            createTime: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
            borrowStartTime: meeting.startTime,
            borrowEndTime: meeting.endTime,
          };

          set((s) => ({
            borrowRecords: [...s.borrowRecords, borrowRecord],
          }));
        }

        set((s) => ({
          meetings: [...s.meetings, newMeeting],
        }));

        get().createInspection(newMeeting.id);

        return { success: true };
      },

      updateMeeting: (id, meeting) =>
        set((state) => ({
          meetings: state.meetings.map((m) =>
            m.id === id ? { ...m, ...meeting } : m
          ),
        })),

      cancelMeeting: (id) => {
        const state = get();
        const meeting = state.meetings.find((m) => m.id === id);
        if (!meeting) return { success: false, error: '会议不存在' };
        if (meeting.status === 'in_progress')
          return { success: false, error: '进行中的会议不可取消' };
        if (meeting.status === 'completed' || meeting.status === 'cancelled')
          return { success: false, error: '该会议已结束或已取消' };

        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === id ? { ...m, status: 'cancelled' as MeetingStatus } : m
          ),
        }));

        return { success: true };
      },

      startMeeting: (id) => {
        const state = get();
        const meeting = state.meetings.find((m) => m.id === id);
        if (!meeting) return { success: false, error: '会议不存在' };
        if (meeting.status !== 'scheduled')
          return { success: false, error: '只有待开始的会议可以开始' };

        const inspection = state.inspections.find(
          (i) => i.meetingId === id
        );
        if (!inspection || inspection.status !== 'completed') {
          return { success: false, error: '设备检查未完成，不可开始会议' };
        }

        const hasAbnormal = inspection.checkItems.some(
          (item) => item.checked && !item.normal
        );
        if (hasAbnormal) {
          return { success: false, error: '存在设备检查异常，请先处理故障' };
        }

        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === id ? { ...m, status: 'in_progress' as MeetingStatus } : m
          ),
        }));

        return { success: true };
      },

      endMeeting: (id, data) => {
        const state = get();
        const meeting = state.meetings.find((m) => m.id === id);
        
        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === id
              ? { ...m, status: 'completed' as MeetingStatus, ...data }
              : m
          ),
        }));

        if (meeting) {
          const borrowRecords = state.borrowRecords.filter(
            (b) => b.meetingId === id && b.status === 'active'
          );
          
          borrowRecords.forEach((borrow) => {
            get().updateBorrowRecord(borrow.id, { status: 'returning' });
            get().createReturnInspection(borrow.id);
          });
        }
      },

      changeMeetingRoom: (meetingId, newRoomId) => {
        const state = get();
        const meeting = state.meetings.find((m) => m.id === meetingId);
        if (!meeting) return { success: false, error: '会议不存在' };
        if (meeting.status === 'completed' || meeting.status === 'cancelled')
          return { success: false, error: '会议已结束或已取消' };

        if (
          !state.isRoomAvailable(
            newRoomId,
            meeting.startTime,
            meeting.endTime,
            meetingId
          )
        ) {
          return { success: false, error: '新会议室在该时间段不可用' };
        }

        const oldRoomDevices = state.devices.filter(
          (d) => d.roomId === meeting.roomId
        );
        const selectedTypes = oldRoomDevices
          .filter((d) => meeting.deviceIds.includes(d.id))
          .map((d) => d.type);

        const newRoomDevices = state.devices.filter(
          (d) => d.roomId === newRoomId
        );
        const newDeviceIds: string[] = [];

        for (const type of selectedTypes) {
          const matchingDevice = newRoomDevices.find(
            (d) =>
              d.type === type &&
              state.isDeviceAvailable(
                d.id,
                meeting.startTime,
                meeting.endTime,
                meetingId
              )
          );
          if (matchingDevice) {
            newDeviceIds.push(matchingDevice.id);
          }
        }

        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === meetingId
              ? { ...m, roomId: newRoomId, deviceIds: newDeviceIds }
              : m
          ),
          inspections: s.inspections.map((i) => {
            if (i.meetingId !== meetingId) return i;
            const newCheckItems = newDeviceIds.map((devId) => {
              const device = s.devices.find((d) => d.id === devId);
              return {
                deviceId: devId,
                deviceName: device?.name || '未知设备',
                checked: false,
                normal: true,
              };
            });
            return {
              ...i,
              deviceIds: newDeviceIds,
              checkItems: newCheckItems,
              status: 'pending',
            };
          }),
        }));

        return { success: true, newDeviceIds };
      },

      createInspection: (meetingId) => {
        const state = get();
        const meeting = state.meetings.find((m) => m.id === meetingId);
        if (!meeting) return;

        const existing = state.inspections.find((i) => i.meetingId === meetingId);
        if (existing) return;

        const checkItems: CheckItem[] = meeting.deviceIds.map((devId) => {
          const device = state.devices.find((d) => d.id === devId);
          return {
            deviceId: devId,
            deviceName: device?.name || '未知设备',
            checked: false,
            normal: true,
          };
        });

        const inspection: InspectionTask = {
          id: generateId(),
          meetingId,
          deviceIds: meeting.deviceIds,
          inspector: '管理员',
          status: 'pending',
          startTime: meeting.startTime,
          checkItems,
        };

        set((s) => ({
          inspections: [...s.inspections, inspection],
        }));
      },

      updateInspectionCheckItem: (inspectionId, deviceId, data) =>
        set((state) => ({
          inspections: state.inspections.map((i) => {
            if (i.id !== inspectionId) return i;
            return {
              ...i,
              status: 'in_progress',
              checkItems: i.checkItems.map((item) =>
                item.deviceId === deviceId ? { ...item, ...data } : item
              ),
            };
          }),
        })),

      completeInspection: (inspectionId) => {
        const state = get();
        const inspection = state.inspections.find(
          (i) => i.id === inspectionId
        );
        if (!inspection) return { success: false, error: '检查任务不存在' };

        const unchecked = inspection.checkItems.filter(
          (item) => !item.checked
        );
        if (unchecked.length > 0) {
          return {
            success: false,
            error: `还有 ${unchecked.length} 项设备未检查`,
          };
        }

        const abnormal = inspection.checkItems.filter(
          (item) => !item.normal
        );

        abnormal.forEach((item) => {
          get().createFault({
            deviceId: item.deviceId,
            meetingId: inspection.meetingId,
            reporter: inspection.inspector,
            description:
              item.remark || `设备"${item.deviceName}"检查发现异常`,
          });
        });

        set((s) => ({
          inspections: s.inspections.map((i) =>
            i.id === inspectionId
              ? {
                  ...i,
                  status: abnormal.length > 0 ? 'failed' : 'completed',
                  completeTime: format(
                    new Date(),
                    "yyyy-MM-dd'T'HH:mm:ss"
                  ),
                }
              : i
          ),
        }));

        return { success: true };
      },

      createFault: (fault) => {
        const newFault: FaultTicket = {
          ...fault,
          id: generateId(),
          status: 'open',
          createTime: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
        };

        set((s) => ({
          faults: [...s.faults, newFault],
          devices: s.devices.map((d) =>
            d.id === fault.deviceId ? { ...d, status: 'fault' } : d
          ),
        }));
      },

      updateFault: (id, fault) =>
        set((state) => ({
          faults: state.faults.map((f) =>
            f.id === id ? { ...f, ...fault } : f
          ),
        })),

      assignFaultHandler: (id, handler) =>
        set((state) => ({
          faults: state.faults.map((f) =>
            f.id === id ? { ...f, handler, status: 'processing' } : f
          ),
        })),

      fixFault: (id, fixNote) =>
        set((state) => ({
          faults: state.faults.map((f) =>
            f.id === id
              ? {
                  ...f,
                  fixNote,
                  status: 'fixed',
                  fixTime: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
                }
              : f
          ),
        })),

      closeFault: (id) => {
        const state = get();
        const fault = state.faults.find((f) => f.id === id);
        if (!fault) return;

        const otherOpenFaults = state.faults.some(
          (f) =>
            f.deviceId === fault.deviceId &&
            f.id !== id &&
            f.status !== 'closed'
        );

        set((s) => ({
          faults: s.faults.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'closed',
                  closeTime: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
                }
              : f
          ),
          devices: otherOpenFaults
            ? s.devices
            : s.devices.map((d) =>
                d.id === fault.deviceId ? { ...d, status: 'normal' } : d
              ),
        }));
      },

      createBorrowRecord: (data) => {
        const newRecord: BorrowRecord = {
          ...data,
          id: generateId(),
          status: 'active',
          createTime: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
        };
        set((s) => ({
          borrowRecords: [...s.borrowRecords, newRecord],
        }));
      },

      updateBorrowRecord: (id, data) =>
        set((state) => ({
          borrowRecords: state.borrowRecords.map((b) =>
            b.id === id ? { ...b, ...data } : b
          ),
        })),

      completeBorrowReturn: (borrowId) => {
        const state = get();
        const borrow = state.borrowRecords.find((b) => b.id === borrowId);
        if (!borrow) return { success: false, error: '借调记录不存在' };
        if (borrow.status !== 'returning') {
          return { success: false, error: '该借调设备不在待归还状态' };
        }

        set((s) => ({
          borrowRecords: s.borrowRecords.map((b) =>
            b.id === borrowId
              ? {
                  ...b,
                  status: 'completed',
                  actualReturnTime: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
                }
              : b
          ),
        }));

        return { success: true };
      },

      cancelBorrow: (borrowId) => {
        const state = get();
        const borrow = state.borrowRecords.find((b) => b.id === borrowId);
        if (!borrow || borrow.status !== 'active') return;

        set((s) => ({
          borrowRecords: s.borrowRecords.map((b) =>
            b.id === borrowId ? { ...b, status: 'cancelled' } : b
          ),
        }));
      },

      createReturnInspection: (borrowId) => {
        const state = get();
        const borrow = state.borrowRecords.find((b) => b.id === borrowId);
        if (!borrow) return;

        const existing = state.inspections.find(
          (i) => i.meetingId === `return-${borrowId}`
        );
        if (existing) return;

        const checkItems: CheckItem[] = [
          {
            deviceId: borrow.deviceId,
            deviceName: borrow.deviceName,
            checked: false,
            normal: true,
          },
        ];

        const inspection: InspectionTask = {
          id: generateId(),
          meetingId: `return-${borrowId}`,
          deviceIds: [borrow.deviceId],
          inspector: '管理员',
          status: 'pending',
          startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
          checkItems,
        };

        set((s) => ({
          inspections: [...s.inspections, inspection],
        }));
      },

      completeReturnInspection: (inspectionId) => {
        const state = get();
        const inspection = state.inspections.find(
          (i) => i.id === inspectionId
        );
        if (!inspection) return { success: false, error: '检查任务不存在' };

        const borrowId = inspection.meetingId.replace('return-', '');
        const borrow = state.borrowRecords.find((b) => b.id === borrowId);
        if (!borrow) return { success: false, error: '借调记录不存在' };

        const result = state.completeInspection(inspectionId);
        if (!result.success) return result;

        if (inspection.status === 'completed') {
          return state.completeBorrowReturn(borrowId);
        }

        return { success: true };
      },

      getFaultImpactAnalysis: (faultId) => {
        const state = get();
        const fault = state.faults.find((f) => f.id === faultId);
        if (!fault) return null;

        const device = state.devices.find((d) => d.id === fault.deviceId);
        if (!device) return null;

        const now = new Date();
        const affectedMeetings: FaultImpactAnalysis['affectedMeetings'] = [];
        const roomMeetingMap = new Map<string, number>();

        for (const meeting of state.meetings) {
          if (
            meeting.status !== 'scheduled' &&
            meeting.status !== 'in_progress'
          )
            continue;

          const meetingStart = parseISO(meeting.startTime);
          if (isBefore(meetingStart, now)) continue;

          const usesDevice = meeting.deviceIds.includes(device.id);
          
          if (usesDevice || meeting.roomId === device.roomId) {
            const room = state.rooms.find((r) => r.id === meeting.roomId);
            affectedMeetings.push({
              meetingId: meeting.id,
              meetingTitle: meeting.title,
              roomId: meeting.roomId,
              roomName: room?.name || '未知',
              startTime: meeting.startTime,
              endTime: meeting.endTime,
              organizer: meeting.organizer,
              usesDevice,
            });

            const count = roomMeetingMap.get(meeting.roomId) || 0;
            roomMeetingMap.set(meeting.roomId, count + 1);
          }
        }

        const affectedRooms: FaultImpactAnalysis['affectedRooms'] = [];
        roomMeetingMap.forEach((meetingCount, roomId) => {
          const room = state.rooms.find((r) => r.id === roomId);
          if (room) {
            affectedRooms.push({
              roomId: room.id,
              roomName: room.name,
              meetingCount,
            });
          }
        });

        const alternativeDevices: FaultImpactAnalysis['alternativeDevices'] = [];
        for (const d of state.devices) {
          if (d.id === device.id) continue;
          if (d.type !== device.type) continue;
          if (d.status !== 'normal') continue;
          if (state.isDeviceFaulty(d.id)) continue;

          const room = state.rooms.find((r) => r.id === d.roomId);
          alternativeDevices.push({
            deviceId: d.id,
            deviceName: d.name,
            roomId: d.roomId,
            roomName: room?.name || '未知',
            type: d.type,
            available: !state.isDeviceBorrowed(
              d.id,
              format(now, "yyyy-MM-dd'T'HH:mm:ss"),
              format(addDays(now, 7), "yyyy-MM-dd'T'HH:mm:ss")
            ),
          });
        }

        return {
          faultId,
          deviceId: device.id,
          deviceName: device.name,
          affectedMeetings,
          affectedRooms,
          alternativeDevices,
        };
      },

      addExportRecord: (record) =>
        set((state) => ({
          exportRecords: [
            {
              ...record,
              id: generateId(),
              generateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
            },
            ...state.exportRecords,
          ],
        })),
    }),
    {
      name: 'meeting-room-system-storage',
      partialize: (state) => ({
        rooms: state.rooms,
        devices: state.devices,
        meetings: state.meetings,
        inspections: state.inspections,
        faults: state.faults,
        exportRecords: state.exportRecords,
        borrowRecords: state.borrowRecords,
      }),
    }
  )
);
