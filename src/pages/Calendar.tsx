import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import { useAppStore } from '@/store/appStore';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  MapPin,
  ArrowRightLeft,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  addMinutes,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { MEETING_STATUS_LABELS, Meeting, DEVICE_TYPE_LABELS } from '@/types';
import { cn } from '@/lib/utils';
import Button from '@/components/Button';

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

const statusColor: Record<Meeting['status'], string> = {
  scheduled: 'bg-blue-100 border-blue-300 text-blue-800',
  in_progress: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  completed: 'bg-slate-100 border-slate-300 text-slate-600',
  cancelled: 'bg-rose-100 border-rose-300 text-rose-700',
};

export default function CalendarPage() {
  const { meetings, rooms, devices } = useAppStore();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [changeRoomModal, setChangeRoomModal] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    meetings.forEach((meeting) => {
      const dateKey = format(parseISO(meeting.startTime), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(meeting);
    });
    return map;
  }, [meetings]);

  const handleChangeRoom = () => {
    if (!selectedMeeting || !newRoomId) return;
    const { changeMeetingRoom } = useAppStore.getState();
    const result = changeMeetingRoom(selectedMeeting.id, newRoomId);
    if (result.success) {
      setChangeRoomModal(false);
      setSelectedMeeting(null);
    } else {
      alert(result.error);
    }
  };

  return (
    <div>
      <PageHeader
        title="会议日历"
        description="查看和管理所有会议安排"
        actions={
          <Button onClick={() => navigate('/meetings/create')}>
            <Plus size={16} />
            创建会议
          </Button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800">
              {format(currentMonth, 'yyyy年 M月', { locale: zhCN })}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ChevronRight size={20} className="text-slate-600" />
            </button>
          </div>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            今天
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200">
          {weekDays.map((day) => (
            <div
              key={day}
              className="px-3 py-2.5 text-center text-xs font-medium text-slate-500 bg-slate-50 border-r border-slate-200 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayMeetings = meetingsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <div
                key={dateKey}
                className={cn(
                  'min-h-[120px] p-2 border-r border-b border-slate-200 last:border-r-0',
                  isCurrentMonth ? 'bg-white' : 'bg-slate-50/50'
                )}
              >
                <div
                  className={cn(
                    'text-xs font-medium mb-1.5 w-6 h-6 flex items-center justify-center rounded-full',
                    isToday(day) && 'bg-blue-600 text-white',
                    !isToday(day) && isCurrentMonth && 'text-slate-700',
                    !isToday(day) && !isCurrentMonth && 'text-slate-400'
                  )}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayMeetings.slice(0, 3).map((meeting) => (
                    <div
                      key={meeting.id}
                      onClick={() => setSelectedMeeting(meeting)}
                      className={cn(
                        'px-2 py-1 rounded text-xs border cursor-pointer truncate transition-all hover:shadow-sm',
                        statusColor[meeting.status]
                      )}
                      title={`${format(parseISO(meeting.startTime), 'HH:mm')} ${meeting.title}`}
                    >
                      <span className="font-medium">
                        {format(parseISO(meeting.startTime), 'HH:mm')}
                      </span>{' '}
                      {meeting.title}
                    </div>
                  ))}
                  {dayMeetings.length > 3 && (
                    <div className="text-xs text-slate-500 px-2">
                      +{dayMeetings.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={!!selectedMeeting}
        title={selectedMeeting?.title || '会议详情'}
        onClose={() => setSelectedMeeting(null)}
        width="max-w-xl"
        footer={
          selectedMeeting &&
          (selectedMeeting.status === 'scheduled' ||
            selectedMeeting.status === 'in_progress') ? (
            <>
              <Button
                variant="secondary"
                onClick={() => setChangeRoomModal(true)}
              >
                <ArrowRightLeft size={14} />
                临时换房
              </Button>
              <Button variant="secondary" onClick={() => setSelectedMeeting(null)}>
                关闭
              </Button>
            </>
          ) : undefined
        }
      >
        {selectedMeeting && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  selectedMeeting.status === 'in_progress'
                    ? 'info'
                    : selectedMeeting.status === 'completed'
                    ? 'success'
                    : selectedMeeting.status === 'cancelled'
                    ? 'danger'
                    : 'default'
                }
              >
                {MEETING_STATUS_LABELS[selectedMeeting.status]}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock size={16} className="text-slate-400" />
                <span>
                  {format(parseISO(selectedMeeting.startTime), 'yyyy-MM-dd HH:mm')} -{' '}
                  {format(parseISO(selectedMeeting.endTime), 'HH:mm')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Users size={16} className="text-slate-400" />
                <span>组织者：{selectedMeeting.organizer}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 col-span-2">
                <MapPin size={16} className="text-slate-400" />
                <span>{rooms.find((r) => r.id === selectedMeeting.roomId)?.name}</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                联动设备
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedMeeting.deviceIds.map((devId) => {
                  const device = devices.find((d) => d.id === devId);
                  return device ? (
                    <Badge key={devId} variant="info">
                      {DEVICE_TYPE_LABELS[device.type]}: {device.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>

            {selectedMeeting.feedback && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">
                  使用反馈
                </p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  {selectedMeeting.feedback}
                </p>
              </div>
            )}

            {selectedMeeting.abnormalReport && (
              <div>
                <p className="text-sm font-medium text-rose-700 mb-1">
                  异常报告
                </p>
                <p className="text-sm text-rose-600 bg-rose-50 rounded-lg p-3">
                  {selectedMeeting.abnormalReport}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={changeRoomModal}
        title="临时换房"
        onClose={() => setChangeRoomModal(false)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setChangeRoomModal(false)}
            >
              取消
            </Button>
            <Button onClick={handleChangeRoom}>确认换房</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            临时更换会议室后，系统将自动同步设备清单。
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              选择新会议室
            </label>
            <select
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">请选择会议室</option>
              {rooms
                .filter((r) => r.id !== selectedMeeting?.roomId)
                .map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} - {room.location} (容纳{room.capacity}人)
                  </option>
                ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
