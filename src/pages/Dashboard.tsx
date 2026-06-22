import { useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import { useAppStore } from '@/store/appStore';
import {
  Projector,
  Volume2,
  DoorOpen,
  Wifi,
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';
import { DeviceType, DEVICE_TYPE_LABELS, MEETING_STATUS_LABELS } from '@/types';
import { format, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const deviceTypeIcons: Record<DeviceType, typeof Projector> = {
  projector: Projector,
  speaker: Volume2,
  access: DoorOpen,
  network: Wifi,
};

const getDeviceStatusColor = (status: string) => {
  switch (status) {
    case 'normal':
      return 'text-emerald-600 bg-emerald-50';
    case 'fault':
      return 'text-rose-600 bg-rose-50';
    case 'maintenance':
      return 'text-amber-600 bg-amber-50';
    default:
      return 'text-slate-600 bg-slate-50';
  }
};

const getDeviceStatusIcon = (status: string) => {
  switch (status) {
    case 'normal':
      return CheckCircle2;
    case 'fault':
      return XCircle;
    case 'maintenance':
      return AlertTriangle;
    default:
      return CheckCircle2;
  }
};

export default function DashboardPage() {
  const { rooms, devices, meetings, faults } = useAppStore();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const roomDevices = devices.filter((d) => d.roomId === selectedRoomId);

  const todayMeetings = useMemo(() => {
    if (!selectedRoomId) return [];
    return meetings
      .filter(
        (m) =>
          m.roomId === selectedRoomId &&
          isToday(parseISO(m.startTime)) &&
          m.status !== 'cancelled'
      )
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
  }, [selectedRoomId, meetings]);

  const stats = useMemo(() => {
    const totalDevices = devices.length;
    const normalDevices = devices.filter((d) => d.status === 'normal').length;
    const faultDevices = devices.filter((d) => d.status === 'fault').length;
    const todayMeetingCount = meetings.filter(
      (m) => isToday(parseISO(m.startTime)) && m.status !== 'cancelled'
    ).length;
    const openFaults = faults.filter((f) => f.status !== 'closed').length;
    return {
      totalDevices,
      normalDevices,
      faultDevices,
      todayMeetingCount,
      openFaults,
    };
  }, [devices, meetings, faults]);

  return (
    <div>
      <PageHeader
        title="设备状态墙"
        description="实时监控各会议室设备运行状态与会议安排"
      />

      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard
          label="会议室总数"
          value={rooms.length}
          icon={<MapPin size={20} />}
          color="bg-blue-500"
        />
        <StatCard
          label="设备总数"
          value={stats.totalDevices}
          icon={<CheckCircle2 size={20} />}
          color="bg-emerald-500"
        />
        <StatCard
          label="正常运行"
          value={stats.normalDevices}
          icon={<CheckCircle2 size={20} />}
          color="bg-teal-500"
        />
        <StatCard
          label="今日会议"
          value={stats.todayMeetingCount}
          icon={<Clock size={20} />}
          color="bg-cyan-500"
        />
        <StatCard
          label="待处理故障"
          value={stats.openFaults}
          icon={<AlertTriangle size={20} />}
          color="bg-rose-500"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {rooms.map((room) => {
          const rd = devices.filter((d) => d.roomId === room.id);
          const normalCount = rd.filter((d) => d.status === 'normal').length;
          const faultCount = rd.filter((d) => d.status === 'fault').length;
          const maintenanceCount = rd.filter(
            (d) => d.status === 'maintenance'
          ).length;

          const currentMeeting = meetings.find(
            (m) =>
              m.roomId === room.id &&
              m.status === 'in_progress'
          );

          return (
            <div
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800">{room.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin size={12} />
                    {room.location}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Users size={12} />
                  {room.capacity}人
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex gap-2">
                  <Badge variant="success">正常 {normalCount}</Badge>
                  {faultCount > 0 && (
                    <Badge variant="danger">故障 {faultCount}</Badge>
                  )}
                  {maintenanceCount > 0 && (
                    <Badge variant="warning">维护 {maintenanceCount}</Badge>
                  )}
                </div>
              </div>

              {currentMeeting ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-blue-600 font-medium">正在使用</p>
                  <p className="text-sm text-slate-700 truncate">
                    {currentMeeting.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentMeeting.organizer}
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <p className="text-sm text-slate-500">当前空闲</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        open={!!selectedRoom}
        title={selectedRoom?.name || '会议室详情'}
        onClose={() => setSelectedRoomId(null)}
        width="max-w-3xl"
      >
        {selectedRoom && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <MapPin size={14} />
                  {selectedRoom.location}
                </p>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                  <Users size={14} />
                  可容纳 {selectedRoom.capacity} 人
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-800 mb-3">设备清单</h4>
              <div className="grid grid-cols-2 gap-3">
                {roomDevices.map((device) => {
                  const IconCmp = deviceTypeIcons[device.type];
                  const StatusIcon = getDeviceStatusIcon(device.status);
                  return (
                    <div
                      key={device.id}
                      className="border border-slate-200 rounded-lg p-3 flex items-start gap-3"
                    >
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          getDeviceStatusColor(device.status)
                        )}
                      >
                        <IconCmp size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {device.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {DEVICE_TYPE_LABELS[device.type]} · {device.model}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1">
                          <StatusIcon
                            size={12}
                            className={cn(
                              device.status === 'normal'
                                ? 'text-emerald-500'
                                : device.status === 'fault'
                                ? 'text-rose-500'
                                : 'text-amber-500'
                            )}
                          />
                          <span
                            className={cn(
                              'text-xs',
                              device.status === 'normal'
                                ? 'text-emerald-600'
                                : device.status === 'fault'
                                ? 'text-rose-600'
                                : 'text-amber-600'
                            )}
                          >
                            {device.status === 'normal'
                              ? '正常'
                              : device.status === 'fault'
                              ? '故障'
                              : '维护中'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {roomDevices.length === 0 && (
                  <p className="col-span-2 text-center text-sm text-slate-500 py-6">
                    暂无设备
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-800 mb-3">今日会议安排</h4>
              <div className="space-y-2">
                {todayMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {meeting.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {format(parseISO(meeting.startTime), 'HH:mm')} -{' '}
                        {format(parseISO(meeting.endTime), 'HH:mm')} ·{' '}
                        {meeting.organizer}
                      </p>
                    </div>
                    <Badge
                      variant={
                        meeting.status === 'in_progress'
                          ? 'info'
                          : meeting.status === 'completed'
                          ? 'success'
                          : 'default'
                      }
                    >
                      {MEETING_STATUS_LABELS[meeting.status]}
                    </Badge>
                  </div>
                ))}
                {todayMeetings.length === 0 && (
                  <p className="text-center text-sm text-slate-500 py-4">
                    今日暂无会议安排
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      <div className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-lg text-white', color)}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
