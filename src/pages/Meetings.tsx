import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { useAppStore } from '@/store/appStore';
import {
  Plus,
  Play,
  Square,
  XCircle,
  Clock,
  Users,
  MapPin,
  Search,
  Filter,
  Projector,
  Volume2,
  DoorOpen,
  Wifi,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  format,
  parseISO,
} from 'date-fns';
import {
  Meeting,
  MeetingStatus,
  MEETING_STATUS_LABELS,
  DeviceType,
} from '@/types';
import { cn } from '@/lib/utils';

const statusFilterOptions: { value: MeetingStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'scheduled', label: '待开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const deviceTypeIcons: Record<DeviceType, typeof Projector> = {
  projector: Projector,
  speaker: Volume2,
  access: DoorOpen,
  network: Wifi,
};

export default function MeetingsPage() {
  const {
    meetings,
    rooms,
    devices,
    inspections,
    cancelMeeting,
    startMeeting,
    endMeeting,
    createFault,
  } = useAppStore();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'all'>('all');

  const [endMeetingModal, setEndMeetingModal] = useState<Meeting | null>(null);
  const [endFeedback, setEndFeedback] = useState('');
  const [endAbnormal, setEndAbnormal] = useState('');
  const [abnormalDeviceIds, setAbnormalDeviceIds] = useState<string[]>([]);

  const [cancelConfirm, setCancelConfirm] = useState<Meeting | null>(null);
  const [startConfirm, setStartConfirm] = useState<Meeting | null>(null);

  const filteredMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        if (statusFilter !== 'all' && m.status !== statusFilter) return false;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          if (
            !m.title.toLowerCase().includes(term) &&
            !m.organizer.toLowerCase().includes(term)
          )
            return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime()
      );
  }, [meetings, statusFilter, searchTerm]);

  const handleStartMeeting = () => {
    if (!startConfirm) return;
    const result = startMeeting(startConfirm.id);
    if (!result.success) {
      alert(result.error);
    }
    setStartConfirm(null);
  };

  const handleCancelMeeting = () => {
    if (!cancelConfirm) return;
    const result = cancelMeeting(cancelConfirm.id);
    if (!result.success) {
      alert(result.error);
    }
    setCancelConfirm(null);
  };

  const handleEndMeeting = () => {
    if (!endMeetingModal) return;

    abnormalDeviceIds.forEach((devId) => {
      const device = devices.find((d) => d.id === devId);
      createFault({
        deviceId: devId,
        meetingId: endMeetingModal.id,
        reporter: endMeetingModal.organizer,
        description:
          endAbnormal ||
          `会议「${endMeetingModal.title}」使用中报告异常: ${device?.name}`,
      });
    });

    endMeeting(endMeetingModal.id, {
      feedback: endFeedback,
      abnormalReport: endAbnormal || undefined,
    });
    setEndMeetingModal(null);
    setEndFeedback('');
    setEndAbnormal('');
    setAbnormalDeviceIds([]);
  };

  const openEndModal = (meeting: Meeting) => {
    setEndMeetingModal(meeting);
    setAbnormalDeviceIds([]);
  };

  return (
    <div>
      <PageHeader
        title="会议管理"
        description="查看和管理所有会议记录"
        actions={
          <Button onClick={() => navigate('/meetings/create')}>
            <Plus size={16} />
            创建会议
          </Button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-slate-400" />
            {statusFilterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  statusFilter === opt.value
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="搜索会议..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-64 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredMeetings.map((meeting) => {
            const room = rooms.find((r) => r.id === meeting.roomId);
            const meetingDevices = devices.filter((d) =>
              meeting.deviceIds.includes(d.id)
            );
            const inspection = inspections.find(
              (i) => i.meetingId === meeting.id
            );
            const canStart =
              meeting.status === 'scheduled' &&
              inspection?.status === 'completed';

            return (
              <div
                key={meeting.id}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-800">
                        {meeting.title}
                      </h3>
                      <Badge
                        variant={
                          meeting.status === 'in_progress'
                            ? 'info'
                            : meeting.status === 'completed'
                            ? 'success'
                            : meeting.status === 'cancelled'
                            ? 'danger'
                            : 'default'
                        }
                      >
                        {MEETING_STATUS_LABELS[meeting.status]}
                      </Badge>
                      {meeting.status === 'scheduled' &&
                        inspection &&
                        inspection.status !== 'completed' && (
                          <Badge variant="warning">
                            <AlertTriangle size={10} className="mr-1" />
                            待设备检查
                          </Badge>
                        )}
                      {canStart && (
                        <Badge variant="success">
                          <CheckCircle2 size={10} className="mr-1" />
                          可开始
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        {format(parseISO(meeting.startTime), 'yyyy-MM-dd HH:mm')}{' '}
                        - {format(parseISO(meeting.endTime), 'HH:mm')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-slate-400" />
                        {room?.name || '未知会议室'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={14} className="text-slate-400" />
                        {meeting.organizer}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {meetingDevices.map((device) => {
                        const IconCmp = deviceTypeIcons[device.type];
                        return (
                          <span
                            key={device.id}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border',
                              device.status === 'normal'
                                ? 'bg-slate-50 border-slate-200 text-slate-600'
                                : 'bg-rose-50 border-rose-200 text-rose-600'
                            )}
                          >
                            <IconCmp size={12} />
                            {device.name}
                          </span>
                        );
                      })}
                    </div>

                    {meeting.feedback && (
                      <p className="mt-3 text-sm text-slate-500 bg-slate-50 rounded p-2">
                        反馈：{meeting.feedback}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {meeting.status === 'scheduled' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setStartConfirm(meeting)}
                          disabled={!canStart}
                        >
                          <Play size={14} />
                          开始
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setCancelConfirm(meeting)}
                        >
                          <XCircle size={14} />
                          取消
                        </Button>
                      </>
                    )}
                    {meeting.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEndModal(meeting)}
                      >
                        <Square size={14} />
                        结束
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredMeetings.length === 0 && (
            <div className="p-12 text-center text-sm text-slate-500">
              暂无会议记录
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!cancelConfirm}
        title="确认取消会议"
        onClose={() => setCancelConfirm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelConfirm(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleCancelMeeting}>
              确认取消会议
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          确定要取消会议「
          <span className="font-medium text-slate-800">
            {cancelConfirm?.title}
          </span>
          」吗？取消后相关设备将被释放。
        </p>
      </Modal>

      <Modal
        open={!!startConfirm}
        title="开始会议"
        onClose={() => setStartConfirm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStartConfirm(null)}>
              取消
            </Button>
            <Button onClick={handleStartMeeting}>开始会议</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          确认开始会议「
          <span className="font-medium text-slate-800">
            {startConfirm?.title}
          </span>
          」吗？
        </p>
      </Modal>

      <Modal
        open={!!endMeetingModal}
        title="结束会议"
        onClose={() => setEndMeetingModal(null)}
        width="max-w-lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEndMeetingModal(null)}
            >
              取消
            </Button>
            <Button onClick={handleEndMeeting}>确认结束</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              使用反馈
            </label>
            <textarea
              value={endFeedback}
              onChange={(e) => setEndFeedback(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              placeholder="请输入会议使用体验和反馈..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              异常设备（如有）
            </label>
            <div className="grid grid-cols-2 gap-2">
              {endMeetingModal?.deviceIds.map((devId) => {
                const device = devices.find((d) => d.id === devId);
                if (!device) return null;
                const checked = abnormalDeviceIds.includes(devId);
                const IconCmp = deviceTypeIcons[device.type];
                return (
                  <label
                    key={devId}
                    className={cn(
                      'flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer transition-all',
                      checked
                        ? 'border-rose-400 bg-rose-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAbnormalDeviceIds([...abnormalDeviceIds, devId]);
                        } else {
                          setAbnormalDeviceIds(
                            abnormalDeviceIds.filter((id) => id !== devId)
                          );
                        }
                      }}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <IconCmp size={14} className="text-slate-500" />
                    <span className="text-sm text-slate-700 truncate">
                      {device.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          {abnormalDeviceIds.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                异常说明
              </label>
              <textarea
                value={endAbnormal}
                onChange={(e) => setEndAbnormal(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm resize-none"
                placeholder="请描述异常情况..."
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
