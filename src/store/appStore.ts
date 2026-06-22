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
} from '@/types';
import { createInitialData, generateId } from '@/data/initialData';
import {
  areIntervalsOverlapping,
  format,
  parseISO,
  startOfToday,
} from 'date-fns';

interface AppState {
  rooms: Room[];
  devices: Device[];
  meetings: Meeting[];
  inspections: InspectionTask[];
  faults: FaultTicket[];
  exportRecords: ExportRecord[];

  addRoom: (room: Omit<Room, 'id'>) => void;
  updateRoom: (id: string, room: Partial<Room>) => void;
  deleteRoom: (id: string) => void;

  addDevice: (device: Omit<Device, 'id'>) => void;
  updateDevice: (id: string, device: Partial<Device>) => void;
  deleteDevice: (id: string) => void;

  createMeeting: (
    meeting: Omit<Meeting, 'id' | 'status'>
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

      createMeeting: (meeting) => {
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

      endMeeting: (id, data) =>
        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === id
              ? { ...m, status: 'completed' as MeetingStatus, ...data }
              : m
          ),
        })),

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
      }),
    }
  )
);
