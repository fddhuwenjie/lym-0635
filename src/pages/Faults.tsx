import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { useAppStore } from '@/store/appStore';
import {
  AlertTriangle,
  Search,
  Filter,
  User,
  Clock,
  Wrench,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Plus,
  AlertCircle,
  Building2,
  Users,
  ArrowRightLeft,
  Projector,
  Volume2,
  DoorOpen,
  Wifi,
} from 'lucide-react';
import {
  format,
  parseISO,
} from 'date-fns';
import {
  FaultTicket,
  FaultStatus,
  FAULT_STATUS_LABELS,
  DeviceType,
  DEVICE_TYPE_LABELS,
  FaultImpactAnalysis,
} from '@/types';
import { cn } from '@/lib/utils';

const statusFilterOptions: { value: FaultStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'open', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'fixed', label: '已修复' },
  { value: 'closed', label: '已关闭' },
];

const statusVariant: Record<FaultStatus, 'warning' | 'info' | 'success' | 'default'> = {
  open: 'warning',
  processing: 'info',
  fixed: 'success',
  closed: 'default',
};

const deviceTypeIcons: Record<DeviceType, typeof Projector> = {
  projector: Projector,
  speaker: Volume2,
  access: DoorOpen,
  network: Wifi,
};

export default function FaultsPage() {
  const {
    faults,
    devices,
    meetings,
    rooms,
    assignFaultHandler,
    fixFault,
    closeFault,
    createFault,
    getFaultImpactAnalysis,
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FaultStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [assignModal, setAssignModal] = useState<FaultTicket | null>(null);
  const [handlerName, setHandlerName] = useState('');

  const [fixModal, setFixModal] = useState<FaultTicket | null>(null);
  const [fixNote, setFixNote] = useState('');

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    deviceId: '',
    reporter: '管理员',
    description: '',
  });

  const [impactAnalysis, setImpactAnalysis] = useState<FaultImpactAnalysis | null>(null);
  const [impactModalOpen, setImpactModalOpen] = useState(false);

  const filteredFaults = useMemo(() => {
    return faults
      .filter((fault) => {
        if (statusFilter !== 'all' && fault.status !== statusFilter)
          return false;
        if (searchTerm) {
          const device = devices.find((d) => d.id === fault.deviceId);
          const term = searchTerm.toLowerCase();
          if (
            !fault.description.toLowerCase().includes(term) &&
            !fault.reporter.toLowerCase().includes(term) &&
            device &&
            !device.name.toLowerCase().includes(term)
          )
            return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          parseISO(b.createTime).getTime() - parseISO(a.createTime).getTime()
      );
  }, [faults, devices, statusFilter, searchTerm]);

  const handleAssign = () => {
    if (!assignModal || !handlerName.trim()) return;
    assignFaultHandler(assignModal.id, handlerName.trim());
    setAssignModal(null);
    setHandlerName('');
  };

  const handleFix = () => {
    if (!fixModal || !fixNote.trim()) {
      alert('请填写修复说明');
      return;
    }
    fixFault(fixModal.id, fixNote.trim());
    setFixModal(null);
    setFixNote('');
  };

  const handleClose = (fault: FaultTicket) => {
    if (fault.status !== 'fixed') {
      alert('只有已修复的故障单才能关闭');
      return;
    }
    if (confirm('确认关闭此故障单？关闭后设备将恢复可用状态。')) {
      closeFault(fault.id);
    }
  };

  const handleCreate = () => {
    if (!createForm.deviceId || !createForm.description.trim()) {
      alert('请填写完整信息');
      return;
    }
    createFault({
      deviceId: createForm.deviceId,
      reporter: createForm.reporter,
      description: createForm.description,
    });
    setCreateModal(false);
    setCreateForm({
      deviceId: '',
      reporter: '管理员',
      description: '',
    });
  };

  const getTimelineSteps = (fault: FaultTicket) => {
    const steps: { time: string; label: string; done: boolean; handler?: string }[] = [];
    steps.push({
      time: fault.createTime,
      label: '故障上报',
      done: true,
      handler: fault.reporter,
    });
    if (fault.handler) {
      steps.push({
        time: fault.createTime,
        label: '分配处理人',
        done: true,
        handler: fault.handler,
      });
    }
    if (fault.fixTime) {
      steps.push({
        time: fault.fixTime,
        label: '故障修复',
        done: true,
        handler: fault.handler,
      });
    }
    if (fault.closeTime) {
      steps.push({
        time: fault.closeTime,
        label: '关闭工单',
        done: true,
      });
    }
    return steps;
  };

  return (
    <div>
      <PageHeader
        title="故障报修"
        description="管理设备故障报修单和处理流程"
        actions={
          <Button onClick={() => setCreateModal(true)}>
            <Plus size={16} />
            新建故障单
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
              placeholder="搜索故障..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-64 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredFaults.map((fault) => {
            const device = devices.find((d) => d.id === fault.deviceId);
            const room = device ? rooms.find((r) => r.id === device.roomId) : null;
            const meeting = fault.meetingId
              ? meetings.find((m) => m.id === fault.meetingId)
              : null;
            const expanded = expandedId === fault.id;
            const timeline = getTimelineSteps(fault);

            return (
              <div key={fault.id} className="overflow-hidden">
                <div
                  className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() =>
                    setExpandedId(expanded ? null : fault.id)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle
                          size={18}
                          className={cn(
                            fault.status === 'closed'
                              ? 'text-slate-400'
                              : fault.status === 'fixed'
                              ? 'text-emerald-500'
                              : 'text-rose-500'
                          )}
                        />
                        <h3 className="font-semibold text-slate-800">
                          {device?.name || '未知设备'}
                        </h3>
                        <Badge variant={statusVariant[fault.status]}>
                          {FAULT_STATUS_LABELS[fault.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2 line-clamp-1">
                        {fault.description}
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <FileText size={12} />
                          工单 #{fault.id.slice(-6)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {format(parseISO(fault.createTime), 'yyyy-MM-dd HH:mm')}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {fault.reporter}
                        </span>
                        {room && (
                          <span className="flex items-center gap-1">
                            位置：{room.name}
                          </span>
                        )}
                        {meeting && (
                          <span className="flex items-center gap-1">
                            关联会议：{meeting.title}
                          </span>
                        )}
                        {fault.handler && (
                          <span className="flex items-center gap-1">
                            <Wrench size={12} />
                            处理人：{fault.handler}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          const analysis = getFaultImpactAnalysis(fault.id);
                          setImpactAnalysis(analysis);
                          setImpactModalOpen(true);
                        }}
                      >
                        <AlertCircle size={14} />
                        影响分析
                      </Button>
                      {fault.status === 'open' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignModal(fault);
                          }}
                        >
                          分配处理人
                        </Button>
                      )}
                      {fault.status === 'processing' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFixModal(fault);
                          }}
                        >
                          标记修复
                        </Button>
                      )}
                      {fault.status === 'fixed' && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClose(fault);
                          }}
                        >
                          关闭工单
                        </Button>
                      )}
                      {expanded ? (
                        <ChevronUp size={18} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={18} className="text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-3">
                            故障详情
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">设备名称</span>
                              <span className="text-slate-800 font-medium">
                                {device?.name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">所在会议室</span>
                              <span className="text-slate-800">
                                {room?.name}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">上报人</span>
                              <span className="text-slate-800">
                                {fault.reporter}
                              </span>
                            </div>
                            {fault.handler && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">处理人</span>
                                <span className="text-slate-800">
                                  {fault.handler}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="mt-3">
                            <p className="text-xs text-slate-500 mb-1">
                              故障描述
                            </p>
                            <p className="text-sm text-slate-700 bg-white rounded p-3 border border-slate-200">
                              {fault.description}
                            </p>
                          </div>
                          {fault.fixNote && (
                            <div className="mt-3">
                              <p className="text-xs text-slate-500 mb-1">
                                修复说明
                              </p>
                              <p className="text-sm text-emerald-700 bg-emerald-50 rounded p-3 border border-emerald-200">
                                {fault.fixNote}
                              </p>
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-3">
                            处理进度
                          </h4>
                          <div className="relative pl-6">
                            {timeline.map((step, idx) => (
                              <div key={idx} className="relative pb-6 last:pb-0">
                                {idx < timeline.length - 1 && (
                                  <div className="absolute left-[-18px] top-3 w-0.5 h-full bg-slate-200" />
                                )}
                                <div
                                  className={cn(
                                    'absolute left-[-22px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                                    step.done
                                      ? 'bg-emerald-500 border-emerald-500'
                                      : 'bg-white border-slate-300'
                                  )}
                                >
                                  {step.done && (
                                    <CheckCircle2
                                      size={10}
                                      className="text-white"
                                    />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">
                                    {step.label}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {format(parseISO(step.time), 'yyyy-MM-dd HH:mm')}
                                    {step.handler && ` · ${step.handler}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredFaults.length === 0 && (
            <div className="p-12 text-center text-sm text-slate-500">
              暂无故障记录
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!assignModal}
        title="分配处理人"
        onClose={() => setAssignModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignModal(null)}>
              取消
            </Button>
            <Button onClick={handleAssign}>确认分配</Button>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            处理人姓名
          </label>
          <input
            type="text"
            value={handlerName}
            onChange={(e) => setHandlerName(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="请输入处理人姓名"
          />
        </div>
      </Modal>

      <Modal
        open={!!fixModal}
        title="标记故障已修复"
        onClose={() => setFixModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFixModal(null)}>
              取消
            </Button>
            <Button onClick={handleFix}>确认修复</Button>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            修复说明
          </label>
          <textarea
            value={fixNote}
            onChange={(e) => setFixNote(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            placeholder="请描述修复过程和结果..."
          />
        </div>
      </Modal>

      <Modal
        open={createModal}
        title="新建故障单"
        onClose={() => setCreateModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleCreate}>
              创建故障单
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              故障设备 <span className="text-rose-500">*</span>
            </label>
            <select
              value={createForm.deviceId}
              onChange={(e) =>
                setCreateForm({ ...createForm, deviceId: e.target.value })
              }
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">请选择设备</option>
              {devices.map((device) => {
                const room = rooms.find((r) => r.id === device.roomId);
                return (
                  <option key={device.id} value={device.id}>
                    {device.name} ({room?.name})
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              上报人
            </label>
            <input
              type="text"
              value={createForm.reporter}
              onChange={(e) =>
                setCreateForm({ ...createForm, reporter: e.target.value })
              }
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              故障描述 <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={createForm.description}
              onChange={(e) =>
                setCreateForm({ ...createForm, description: e.target.value })
              }
              rows={4}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              placeholder="请详细描述故障情况..."
            />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle
              size={16}
              className="text-amber-500 mt-0.5 flex-shrink-0"
            />
            <p className="text-xs text-amber-700">
              创建故障单后，该设备将被标记为故障状态，不可在其他会议中分配。
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={impactModalOpen}
        title="故障影响分析"
        onClose={() => setImpactModalOpen(false)}
        width="max-w-3xl"
        footer={
          <Button onClick={() => setImpactModalOpen(false)}>关闭</Button>
        }
      >
        {impactAnalysis && (
          <div className="space-y-6">
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={20}
                  className="text-rose-500 mt-0.5 flex-shrink-0"
                />
                <div>
                  <h4 className="font-semibold text-rose-800">
                    故障设备：{impactAnalysis.deviceName}
                  </h4>
                  <p className="text-sm text-rose-600 mt-1">
                    以下为受该故障影响的会议和替代设备建议
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Users size={16} className="text-slate-500" />
                受影响的未来会议 ({impactAnalysis.affectedMeetings.length}场)
              </h4>
              {impactAnalysis.affectedMeetings.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {impactAnalysis.affectedMeetings.map((m) => (
                    <div
                      key={m.meetingId}
                      className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {m.meetingTitle}
                          {m.usesDevice && (
                            <Badge variant="danger" className="ml-2">
                              使用故障设备
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          <Building2 size={12} className="inline mr-1" />
                          {m.roomName} ·{' '}
                          {format(parseISO(m.startTime), 'MM-dd HH:mm')} -{' '}
                          {format(parseISO(m.endTime), 'HH:mm')} · {m.organizer}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-slate-500 py-6 bg-slate-50 rounded-lg">
                  暂无受影响的会议
                </div>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Building2 size={16} className="text-slate-500" />
                受影响的会议室 ({impactAnalysis.affectedRooms.length}个)
              </h4>
              <div className="flex flex-wrap gap-2">
                {impactAnalysis.affectedRooms.map((r) => (
                  <Badge key={r.roomId} variant="warning">
                    {r.roomName} · {r.meetingCount}场会议
                  </Badge>
                ))}
                {impactAnalysis.affectedRooms.length === 0 && (
                  <span className="text-sm text-slate-500">暂无受影响的会议室</span>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-slate-500" />
                可替代设备建议 ({impactAnalysis.alternativeDevices.length}台)
              </h4>
              {impactAnalysis.alternativeDevices.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {impactAnalysis.alternativeDevices.map((d) => {
                    const IconCmp = deviceTypeIcons[d.type];
                    return (
                      <div
                        key={d.deviceId}
                        className={cn(
                          'flex items-center gap-3 p-3 border rounded-lg',
                          d.available
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-amber-50 border-amber-200'
                        )}
                      >
                        <div className="p-1.5 bg-white rounded">
                          <IconCmp size={14} className="text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">
                            {d.deviceName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {d.roomName} · {DEVICE_TYPE_LABELS[d.type]}
                          </p>
                        </div>
                        <Badge variant={d.available ? 'success' : 'warning'}>
                          {d.available ? '可用' : '占用中'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-sm text-slate-500 py-6 bg-slate-50 rounded-lg">
                  暂无可用的替代设备
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
