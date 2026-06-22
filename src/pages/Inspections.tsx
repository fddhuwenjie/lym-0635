import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { useAppStore } from '@/store/appStore';
import {
  ClipboardCheck,
  Clock,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  AlertCircle,
} from 'lucide-react';
import {
  format,
  parseISO,
  isToday,
  isBefore,
  startOfToday,
} from 'date-fns';
import {
  InspectionTask,
  InspectionStatus,
  INSPECTION_STATUS_LABELS,
  CheckItem,
} from '@/types';
import { cn } from '@/lib/utils';

const statusFilterOptions: { value: InspectionStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待检查' },
  { value: 'in_progress', label: '检查中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '检查失败' },
];

export default function InspectionsPage() {
  const {
    inspections,
    meetings,
    rooms,
    devices,
    updateInspectionCheckItem,
    completeInspection,
    createFault,
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [executeModal, setExecuteModal] = useState<InspectionTask | null>(null);
  const [localCheckItems, setLocalCheckItems] = useState<CheckItem[]>([]);
  const [faultModal, setFaultModal] = useState<{
    deviceId: string;
    deviceName: string;
    meetingId?: string;
  } | null>(null);
  const [faultDesc, setFaultDesc] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredInspections = useMemo(() => {
    return inspections
      .filter((inspection) => {
        if (statusFilter !== 'all' && inspection.status !== statusFilter)
          return false;
        if (searchTerm) {
          const meeting = meetings.find((m) => m.id === inspection.meetingId);
          const term = searchTerm.toLowerCase();
          if (
            meeting &&
            !meeting.title.toLowerCase().includes(term) &&
            !meeting.organizer.toLowerCase().includes(term)
          )
            return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime()
      );
  }, [inspections, meetings, statusFilter, searchTerm]);

  const openExecuteModal = (inspection: InspectionTask) => {
    setExecuteModal(inspection);
    setLocalCheckItems(JSON.parse(JSON.stringify(inspection.checkItems)));
    setError(null);
  };

  const updateLocalCheckItem = (
    deviceId: string,
    data: Partial<CheckItem>
  ) => {
    setLocalCheckItems((items) =>
      items.map((item) =>
        item.deviceId === deviceId ? { ...item, ...data } : item
      )
    );
  };

  const handleComplete = () => {
    if (!executeModal) return;

    const unchecked = localCheckItems.filter((item) => !item.checked);
    if (unchecked.length > 0) {
      setError(`还有 ${unchecked.length} 项设备未检查`);
      return;
    }

    localCheckItems.forEach((item) => {
      updateInspectionCheckItem(executeModal.id, item.deviceId, {
        checked: item.checked,
        normal: item.normal,
        remark: item.remark,
      });
    });

    const result = completeInspection(executeModal.id);
    if (!result.success) {
      setError(result.error || '提交检查失败');
      return;
    }

    setExecuteModal(null);
  };

  const submitFault = () => {
    if (!faultModal) return;
    if (!faultDesc.trim()) {
      alert('请描述故障情况');
      return;
    }
    createFault({
      deviceId: faultModal.deviceId,
      meetingId: faultModal.meetingId,
      reporter: '管理员',
      description: faultDesc,
    });
    setFaultModal(null);
    setFaultDesc('');
  };

  const getStatusVariant = (status: InspectionStatus) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'in_progress':
        return 'info';
      default:
        return 'warning';
    }
  };

  return (
    <div>
      <PageHeader
        title="检查任务"
        description="管理会议前设备检查任务"
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
          {filteredInspections.map((inspection) => {
            const meeting = meetings.find((m) => m.id === inspection.meetingId);
            const room = meeting ? rooms.find((r) => r.id === meeting.roomId) : null;
            const expanded = expandedId === inspection.id;
            const completedCount = inspection.checkItems.filter(
              (i) => i.checked
            ).length;
            const abnormalCount = inspection.checkItems.filter(
              (i) => i.checked && !i.normal
            ).length;

            return (
              <div key={inspection.id} className="overflow-hidden">
                <div
                  className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() =>
                    setExpandedId(expanded ? null : inspection.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <ClipboardCheck
                          size={18}
                          className={cn(
                            inspection.status === 'completed'
                              ? 'text-emerald-500'
                              : inspection.status === 'failed'
                              ? 'text-rose-500'
                              : 'text-amber-500'
                          )}
                        />
                        <h3 className="font-semibold text-slate-800">
                          {meeting?.title || '未知会议'}
                        </h3>
                        <Badge variant={getStatusVariant(inspection.status)}>
                          {INSPECTION_STATUS_LABELS[inspection.status]}
                        </Badge>
                        {abnormalCount > 0 && (
                          <Badge variant="danger">
                            <AlertTriangle size={10} className="mr-1" />
                            {abnormalCount} 项异常
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          {meeting
                            ? `${format(parseISO(meeting.startTime), 'yyyy-MM-dd HH:mm')} - ${format(parseISO(meeting.endTime), 'HH:mm')}`
                            : '-'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-400" />
                          {room?.name || '-'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users size={14} className="text-slate-400" />
                          检查进度: {completedCount}/
                          {inspection.checkItems.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(inspection.status === 'pending' ||
                        inspection.status === 'in_progress') && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openExecuteModal(inspection);
                          }}
                        >
                          执行检查
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
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                      {inspection.checkItems.map((item) => {
                        const device = devices.find(
                          (d) => d.id === item.deviceId
                        );
                        return (
                          <div
                            key={item.deviceId}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                          >
                            <div className="flex items-center gap-3">
                              {item.checked ? (
                                item.normal ? (
                                  <CheckCircle2
                                    size={18}
                                    className="text-emerald-500"
                                  />
                                ) : (
                                  <XCircle
                                    size={18}
                                    className="text-rose-500"
                                  />
                                )
                              ) : (
                                <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {item.deviceName}
                                </p>
                                {item.remark && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    备注：{item.remark}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-sm">
                              {item.checked ? (
                                item.normal ? (
                                  <span className="text-emerald-600">
                                    正常
                                  </span>
                                ) : (
                                  <span className="text-rose-600">异常</span>
                                )
                              ) : (
                                <span className="text-slate-400">待检查</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredInspections.length === 0 && (
            <div className="p-12 text-center text-sm text-slate-500">
              暂无检查任务
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!executeModal}
        title="执行设备检查"
        onClose={() => setExecuteModal(null)}
        width="max-w-xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExecuteModal(null)}>
              保存并稍后继续
            </Button>
            <Button onClick={handleComplete}>完成检查</Button>
          </>
        }
      >
        {executeModal && (
          <div className="space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle
                  size={16}
                  className="text-rose-500 mt-0.5 flex-shrink-0"
                />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <p className="text-sm text-slate-600">
              请逐项检查设备状态，如有异常请标记为异常并可直接上报故障。
            </p>

            <div className="space-y-3">
              {localCheckItems.map((item) => (
                <div
                  key={item.deviceId}
                  className={cn(
                    'p-4 border-2 rounded-xl transition-all',
                    item.checked
                      ? item.normal
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-rose-200 bg-rose-50/50'
                      : 'border-slate-200 bg-white'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-slate-800">
                      {item.deviceName}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`status-${item.deviceId}`}
                        checked={item.checked && item.normal}
                        onChange={() =>
                          updateLocalCheckItem(item.deviceId, {
                            checked: true,
                            normal: true,
                          })
                        }
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-emerald-700">正常</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`status-${item.deviceId}`}
                        checked={item.checked && !item.normal}
                        onChange={() =>
                          updateLocalCheckItem(item.deviceId, {
                            checked: true,
                            normal: false,
                          })
                        }
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm text-rose-700">异常</span>
                    </label>
                    {!item.checked && (
                      <button
                        onClick={() =>
                          updateLocalCheckItem(item.deviceId, {
                            checked: false,
                            normal: true,
                          })
                        }
                        className="text-sm text-slate-500 hover:text-slate-600"
                      >
                        重置
                      </button>
                    )}
                  </div>
                  {item.checked && !item.normal && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={item.remark || ''}
                        onChange={(e) =>
                          updateLocalCheckItem(item.deviceId, {
                            remark: e.target.value,
                          })
                        }
                        placeholder="请输入异常描述"
                        className="flex-1 px-3 py-2 text-sm border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          const meeting = meetings.find(
                            (m) => m.id === executeModal.meetingId
                          );
                          setFaultModal({
                            deviceId: item.deviceId,
                            deviceName: item.deviceName,
                            meetingId: meeting?.id,
                          });
                          setFaultDesc(item.remark || '');
                        }}
                      >
                        上报故障
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!faultModal}
        title="上报故障"
        onClose={() => setFaultModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFaultModal(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={submitFault}>
              确认上报
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            上报故障后，设备将被标记为故障状态，不可在其他会议中分配。
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              故障设备
            </label>
            <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-3">
              {faultModal?.deviceName}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              故障描述
            </label>
            <textarea
              value={faultDesc}
              onChange={(e) => setFaultDesc(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm resize-none"
              placeholder="请详细描述故障情况..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
