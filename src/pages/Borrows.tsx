import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { useAppStore } from '@/store/appStore';
import {
  ArrowRightLeft,
  Search,
  Filter,
  User,
  Clock,
  Building2,
  ChevronDown,
  ChevronUp,
  FileText,
  XCircle,
  CheckCircle2,
  Projector,
  Volume2,
  DoorOpen,
  Wifi,
  AlertTriangle,
} from 'lucide-react';
import {
  format,
  parseISO,
} from 'date-fns';
import {
  BorrowRecord,
  BorrowStatus,
  BORROW_STATUS_LABELS,
  DeviceType,
  DEVICE_TYPE_LABELS,
} from '@/types';
import { cn } from '@/lib/utils';

const statusFilterOptions: { value: BorrowStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '借调中' },
  { value: 'returning', label: '待归还检查' },
  { value: 'completed', label: '已归还' },
  { value: 'cancelled', label: '已取消' },
];

const statusVariant: Record<BorrowStatus, 'warning' | 'info' | 'success' | 'default'> = {
  active: 'warning',
  returning: 'info',
  completed: 'success',
  cancelled: 'default',
};

const deviceTypeIcons: Record<DeviceType, typeof Projector> = {
  projector: Projector,
  speaker: Volume2,
  access: DoorOpen,
  network: Wifi,
};

export default function BorrowsPage() {
  const {
    borrowRecords,
    devices,
    meetings,
    rooms,
    cancelBorrow,
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BorrowStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<BorrowRecord | null>(null);

  const filteredBorrows = useMemo(() => {
    return borrowRecords
      .filter((borrow) => {
        if (statusFilter !== 'all' && borrow.status !== statusFilter) return false;
        if (searchTerm) {
          const device = devices.find((d) => d.id === borrow.deviceId);
          const term = searchTerm.toLowerCase();
          if (
            !borrow.deviceName.toLowerCase().includes(term) &&
            !borrow.meetingTitle.toLowerCase().includes(term) &&
            !borrow.sourceRoomName.toLowerCase().includes(term) &&
            !borrow.targetRoomName.toLowerCase().includes(term) &&
            device &&
            !device.model.toLowerCase().includes(term)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) =>
          parseISO(b.createTime).getTime() - parseISO(a.createTime).getTime()
      );
  }, [borrowRecords, devices, statusFilter, searchTerm]);

  const handleCancel = () => {
    if (!cancelConfirm) return;
    cancelBorrow(cancelConfirm.id);
    setCancelConfirm(null);
  };

  const getTimelineSteps = (borrow: BorrowRecord) => {
    const steps: { time: string; label: string; done: boolean }[] = [];
    steps.push({
      time: borrow.createTime,
      label: '创建借调',
      done: true,
    });
    if (borrow.status !== 'cancelled') {
      steps.push({
        time: borrow.borrowStartTime,
        label: '开始借调',
        done: true,
      });
    }
    if (borrow.status === 'returning' || borrow.status === 'completed') {
      steps.push({
        time: borrow.borrowEndTime,
        label: '待归还检查',
        done: true,
      });
    }
    if (borrow.actualReturnTime) {
      steps.push({
        time: borrow.actualReturnTime,
        label: '归还完成',
        done: true,
      });
    }
    if (borrow.status === 'cancelled') {
      steps.push({
        time: borrow.createTime,
        label: '已取消',
        done: true,
      });
    }
    return steps;
  };

  return (
    <div>
      <PageHeader
        title="设备借调"
        description="管理跨会议室设备借调记录"
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
              placeholder="搜索借调记录..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-64 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredBorrows.map((borrow) => {
            const device = devices.find((d) => d.id === borrow.deviceId);
            const meeting = meetings.find((m) => m.id === borrow.meetingId);
            const sourceRoom = rooms.find((r) => r.id === borrow.sourceRoomId);
            const targetRoom = rooms.find((r) => r.id === borrow.targetRoomId);
            const expanded = expandedId === borrow.id;
            const timeline = getTimelineSteps(borrow);
            const IconCmp = device ? deviceTypeIcons[device.type] : Projector;

            return (
              <div key={borrow.id} className="overflow-hidden">
                <div
                  className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expanded ? null : borrow.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <ArrowRightLeft
                          size={18}
                          className={cn(
                            borrow.status === 'completed'
                              ? 'text-emerald-500'
                              : borrow.status === 'cancelled'
                              ? 'text-slate-400'
                              : borrow.status === 'returning'
                              ? 'text-blue-500'
                              : 'text-amber-500'
                          )}
                        />
                        <h3 className="font-semibold text-slate-800">
                          {borrow.deviceName}
                        </h3>
                        <Badge variant={statusVariant[borrow.status]}>
                          {BORROW_STATUS_LABELS[borrow.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded">
                          <Building2 size={12} />
                          {borrow.sourceRoomName}
                        </span>
                        <ArrowRightLeft size={12} className="text-slate-400" />
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                          <Building2 size={12} />
                          {borrow.targetRoomName}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <FileText size={12} />
                          借调 #{borrow.id.slice(-6)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {format(parseISO(borrow.borrowStartTime), 'MM-dd HH:mm')} -{' '}
                          {format(parseISO(borrow.borrowEndTime), 'MM-dd HH:mm')}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          审批人：{borrow.approver}
                        </span>
                        <span className="flex items-center gap-1">
                          关联会议：{borrow.meetingTitle}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {borrow.status === 'active' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelConfirm(borrow);
                          }}
                        >
                          <XCircle size={14} className="text-rose-500" />
                          取消借调
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
                            借调详情
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">设备名称</span>
                              <span className="text-slate-800 font-medium flex items-center gap-2">
                                <div className="p-1 bg-slate-100 rounded">
                                  <IconCmp size={12} className="text-slate-600" />
                                </div>
                                {borrow.deviceName}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">设备型号</span>
                              <span className="text-slate-800">
                                {device?.model || '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">设备类型</span>
                              <span className="text-slate-800">
                                {device ? DEVICE_TYPE_LABELS[device.type] : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">来源会议室</span>
                              <span className="text-slate-800">
                                {sourceRoom?.name || '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">目标会议室</span>
                              <span className="text-slate-800">
                                {targetRoom?.name || '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">审批人</span>
                              <span className="text-slate-800">
                                {borrow.approver}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-xs text-slate-500 mb-1">
                              借调原因
                            </p>
                            <p className="text-sm text-slate-700 bg-white rounded p-3 border border-slate-200">
                              {borrow.reason}
                            </p>
                          </div>
                          {borrow.actualReturnTime && (
                            <div className="mt-3">
                              <p className="text-xs text-slate-500 mb-1">
                                实际归还时间
                              </p>
                              <p className="text-sm text-emerald-700 bg-emerald-50 rounded p-3 border border-emerald-200">
                                {format(
                                  parseISO(borrow.actualReturnTime),
                                  'yyyy-MM-dd HH:mm:ss'
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-3">
                            借调进度
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
          {filteredBorrows.length === 0 && (
            <div className="p-12 text-center text-sm text-slate-500">
              暂无借调记录
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!cancelConfirm}
        title="确认取消借调"
        onClose={() => setCancelConfirm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelConfirm(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleCancel}>
              确认取消
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={20}
            className="text-amber-500 mt-0.5 flex-shrink-0"
          />
          <div>
            <p className="text-sm text-slate-600">
              确定要取消设备
              <span className="font-medium text-slate-800">
                「{cancelConfirm?.deviceName}」
              </span>
              的借调吗？
            </p>
            <p className="text-xs text-slate-500 mt-2">
              取消后该设备将恢复原会议室可用状态。
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
