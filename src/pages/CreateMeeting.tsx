import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import { useAppStore } from '@/store/appStore';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  Projector,
  Volume2,
  DoorOpen,
  Wifi,
} from 'lucide-react';
import {
  format,
  addHours,
  startOfHour,
  parseISO,
  isBefore,
  startOfToday,
  addMinutes,
  differenceInMinutes,
} from 'date-fns';
import { DeviceType, DEVICE_TYPE_LABELS } from '@/types';
import { cn } from '@/lib/utils';

const deviceTypeIcons: Record<DeviceType, typeof Projector> = {
  projector: Projector,
  speaker: Volume2,
  access: DoorOpen,
  network: Wifi,
};

export default function CreateMeetingPage() {
  const navigate = useNavigate();
  const { rooms, devices, createMeeting, isDeviceAvailable, isDeviceFaulty } =
    useAppStore();

  const today = startOfToday();
  const defaultStart = addHours(startOfHour(new Date()), 1);
  const defaultEnd = addHours(defaultStart, 1);

  const [form, setForm] = useState({
    title: '',
    roomId: rooms[0]?.id || '',
    organizer: '管理员',
    startTime: format(defaultStart, "yyyy-MM-dd'T'HH:mm"),
    endTime: format(defaultEnd, "yyyy-MM-dd'T'HH:mm"),
    deviceIds: [] as string[],
  });

  const [error, setError] = useState<string | null>(null);

  const roomDevices = useMemo(() => {
    return devices.filter((d) => d.roomId === form.roomId);
  }, [devices, form.roomId]);

  useEffect(() => {
    setForm((f) => ({ ...f, deviceIds: [] }));
  }, [form.roomId]);

  const toggleDevice = (deviceId: string) => {
    setForm((f) => {
      if (f.deviceIds.includes(deviceId)) {
        return { ...f, deviceIds: f.deviceIds.filter((id) => id !== deviceId) };
      }
      return { ...f, deviceIds: [...f.deviceIds, deviceId] };
    });
  };

  const selectAllDevices = () => {
    const availableIds = roomDevices
      .filter((d) => isDeviceAvailable(d.id, form.startTime, form.endTime))
      .map((d) => d.id);
    setForm((f) => ({ ...f, deviceIds: availableIds }));
  };

  const clearDevices = () => {
    setForm((f) => ({ ...f, deviceIds: [] }));
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return '请输入会议主题';
    if (!form.roomId) return '请选择会议室';
    if (!form.organizer.trim()) return '请输入组织者';
    if (!form.startTime || !form.endTime) return '请选择会议时间';
    if (isBefore(parseISO(form.endTime), parseISO(form.startTime))) {
      return '结束时间不能早于开始时间';
    }
    if (form.deviceIds.length === 0) {
      return '请至少选择一个联动设备';
    }
    return null;
  };

  const handleSubmit = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const startISO = form.startTime + ':00';
    const endISO = form.endTime + ':00';

    const result = createMeeting({
      title: form.title,
      roomId: form.roomId,
      organizer: form.organizer,
      startTime: startISO,
      endTime: endISO,
      deviceIds: form.deviceIds,
    });

    if (!result.success) {
      setError(result.error || '创建会议失败');
      return;
    }

    navigate('/meetings');
  };

  return (
    <div>
      <PageHeader
        title="创建会议"
        description="新建会议并联动所需设备"
        actions={
          <Button variant="ghost" onClick={() => navigate('/meetings')}>
            <ArrowLeft size={16} />
            返回会议列表
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle
                size={18}
                className="text-rose-500 mt-0.5 flex-shrink-0"
              />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">
              基本信息
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                会议主题 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="请输入会议主题"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <MapPin size={14} className="inline mr-1" />
                  会议室 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.roomId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} - {room.location} (容纳{room.capacity}人)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Users size={14} className="inline mr-1" />
                  组织者 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.organizer}
                  onChange={(e) =>
                    setForm({ ...form, organizer: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="请输入组织者姓名"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Clock size={14} className="inline mr-1" />
                  开始时间 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  min={format(today, "yyyy-MM-dd'T'HH:mm")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Clock size={14} className="inline mr-1" />
                  结束时间 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  min={form.startTime}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800">
                联动设备 <span className="text-rose-500">*</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllDevices}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  全选可用
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={clearDevices}
                  className="text-sm text-slate-500 hover:text-slate-600"
                >
                  清空
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              请勾选本次会议需要使用的设备，系统会自动校验设备是否可用。
            </p>

            <div className="grid grid-cols-2 gap-3">
              {roomDevices.map((device) => {
                const IconCmp = deviceTypeIcons[device.type];
                const isFaulty = isDeviceFaulty(device.id);
                const isAvailable = !isFaulty && isDeviceAvailable(
                  device.id,
                  form.startTime + ':00',
                  form.endTime + ':00'
                );
                const disabled = !isAvailable;
                const checked = form.deviceIds.includes(device.id);

                return (
                  <label
                    key={device.id}
                    className={cn(
                      'flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all',
                      checked && !disabled
                        ? 'border-blue-500 bg-blue-50'
                        : disabled
                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => !disabled && toggleDevice(device.id)}
                      disabled={disabled}
                      className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded">
                            <IconCmp size={14} className="text-slate-600" />
                          </div>
                          <span className="font-medium text-slate-800">
                            {device.name}
                          </span>
                        </div>
                        {isFaulty ? (
                          <Badge variant="danger">
                            <AlertCircle size={10} className="mr-1" />
                            故障中
                          </Badge>
                        ) : isAvailable ? (
                          <Badge variant="success">
                            <CheckCircle2 size={10} className="mr-1" />
                            可用
                          </Badge>
                        ) : (
                          <Badge variant="warning">已占用</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 ml-8">
                        {DEVICE_TYPE_LABELS[device.type]} · {device.model}
                      </p>
                    </div>
                  </label>
                );
              })}
              {roomDevices.length === 0 && (
                <div className="col-span-2 text-center text-sm text-slate-500 py-6 border border-dashed border-slate-300 rounded-lg">
                  该会议室暂未配置设备，请先在设备管理中添加设备
                </div>
              )}
            </div>

            {form.deviceIds.length > 0 && (
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <span className="text-sm text-slate-600">
                  已选择{' '}
                  <span className="font-semibold text-blue-600">
                    {form.deviceIds.length}
                  </span>{' '}
                  台设备
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sticky top-6">
            <h4 className="font-semibold text-slate-800 mb-4">会议概览</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">会议主题</span>
                <span className="text-slate-800 font-medium">
                  {form.title || '未填写'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">会议室</span>
                <span className="text-slate-800 font-medium">
                  {rooms.find((r) => r.id === form.roomId)?.name || '未选择'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">组织者</span>
                <span className="text-slate-800 font-medium">
                  {form.organizer || '未填写'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">会议时长</span>
                <span className="text-slate-800 font-medium">
                  {form.startTime && form.endTime
                    ? (() => {
                        const mins = differenceInMinutes(
                          parseISO(form.endTime + ':00'),
                          parseISO(form.startTime + ':00')
                        );
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        return h > 0 ? `${h}小时${m > 0 ? m + '分钟' : ''}` : `${m}分钟`;
                      })()
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">联动设备</span>
                <span className="text-slate-800 font-medium">
                  {form.deviceIds.length} 台
                </span>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <Button className="w-full" onClick={handleSubmit}>
                创建会议
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate('/meetings')}
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
