import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import { useAppStore } from '@/store/appStore';
import {
  FileBarChart,
  Download,
  Clock,
  User,
  Calendar,
  FileText,
} from 'lucide-react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';
import { ExportType, EXPORT_TYPE_LABELS } from '@/types';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const {
    meetings,
    devices,
    inspections,
    faults,
    rooms,
    exportRecords,
    addExportRecord,
  } = useAppStore();

  const defaultStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
  const defaultEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const [form, setForm] = useState({
    type: 'comprehensive' as ExportType,
    startTime: defaultStart,
    endTime: defaultEnd,
  });

  const generateCSV = () => {
    const { type, startTime, endTime } = form;
    const startISO = `${startTime}T00:00:00`;
    const endISO = `${endTime}T23:59:59`;
    const start = parseISO(startISO);
    const end = parseISO(endISO);

    let content = '';
    let fileName = '';
    const now = format(new Date(), 'yyyyMMdd_HHmmss');

    const filterByTime = (time: string) => {
      const t = parseISO(time);
      return t >= start && t <= end;
    };

    if (type === 'device_usage' || type === 'comprehensive') {
      content += '=== 设备占用报告 ===\n';
      content += '会议标题,会议室,开始时间,结束时间,组织者,占用设备,会议状态\n';
      meetings
        .filter((m) => filterByTime(m.startTime))
        .forEach((m) => {
          const room = rooms.find((r) => r.id === m.roomId);
          const usedDevices = m.deviceIds
            .map((id) => devices.find((d) => d.id === id)?.name)
            .filter(Boolean)
            .join('; ');
          content += `"${m.title}","${room?.name || ''}","${format(
            parseISO(m.startTime),
            'yyyy-MM-dd HH:mm'
          )}","${format(parseISO(m.endTime), 'HH:mm')}","${
            m.organizer
          }","${usedDevices}","${m.status}"\n`;
        });
      content += '\n';
    }

    if (type === 'inspection' || type === 'comprehensive') {
      content += '=== 设备检查报告 ===\n';
      content +=
        '会议标题,会议室,检查时间,检查员,检查结果,检查项总数,通过数,异常数\n';
      inspections
        .filter((i) => filterByTime(i.startTime))
        .forEach((i) => {
          const meeting = meetings.find((m) => m.id === i.meetingId);
          const room = meeting
            ? rooms.find((r) => r.id === meeting.roomId)
            : null;
          const total = i.checkItems.length;
          const passed = i.checkItems.filter(
            (item) => item.checked && item.normal
          ).length;
          const abnormal = i.checkItems.filter(
            (item) => item.checked && !item.normal
          ).length;
          content += `"${meeting?.title || ''}","${room?.name || ''}","${format(
            parseISO(i.startTime),
            'yyyy-MM-dd HH:mm'
          )}","${i.inspector}","${i.status}",${total},${passed},${abnormal}\n`;
        });
      content += '\n';
    }

    if (type === 'fault' || type === 'comprehensive') {
      content += '=== 故障处理报告 ===\n';
      content +=
        '设备名称,会议室,上报时间,上报人,故障描述,处理人,故障状态,修复说明,修复时间,关闭时间\n';
      faults
        .filter((f) => filterByTime(f.createTime))
        .forEach((f) => {
          const device = devices.find((d) => d.id === f.deviceId);
          const room = device
            ? rooms.find((r) => r.id === device.roomId)
            : null;
          content += `"${device?.name || ''}","${room?.name || ''}","${format(
            parseISO(f.createTime),
            'yyyy-MM-dd HH:mm'
          )}","${f.reporter}","${f.description}","${f.handler || ''}","${
            f.status
          }","${f.fixNote || ''}","${
            f.fixTime ? format(parseISO(f.fixTime), 'yyyy-MM-dd HH:mm') : ''
          }","${
            f.closeTime ? format(parseISO(f.closeTime), 'yyyy-MM-dd HH:mm') : ''
          }"\n`;
        });
      content += '\n';
    }

    if (type === 'comprehensive') {
      const totalMeetings = meetings.filter((m) =>
        filterByTime(m.startTime)
      ).length;
      const completedMeetings = meetings.filter(
        (m) => filterByTime(m.startTime) && m.status === 'completed'
      ).length;
      const totalFaults = faults.filter((f) => filterByTime(f.createTime)).length;
      const closedFaults = faults.filter(
        (f) => filterByTime(f.createTime) && f.status === 'closed'
      ).length;
      const totalInspections = inspections.filter((i) =>
        filterByTime(i.startTime)
      ).length;

      content += '=== 统计汇总 ===\n';
      content += `统计周期:,${startTime} 至 ${endTime}\n`;
      content += `会议总数:,${totalMeetings}\n`;
      content += `已完成会议数:,${completedMeetings}\n`;
      content += `设备检查任务数:,${totalInspections}\n`;
      content += `故障上报数:,${totalFaults}\n`;
      content += `已关闭故障数:,${closedFaults}\n`;
      content += `报告生成时间:,${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n`;
      content += `报告操作人:,管理员\n`;
    }

    fileName = `${EXPORT_TYPE_LABELS[type]}_${now}.csv`;

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addExportRecord({
      type,
      startTime: startISO,
      endTime: endISO,
      fileName,
      operator: '管理员',
    });
  };

  const exportTypeOptions: { value: ExportType; desc: string }[] = [
    { value: 'device_usage', desc: '包含设备占用情况、会议信息' },
    { value: 'inspection', desc: '包含设备检查结果、通过率' },
    { value: 'fault', desc: '包含故障处理人、处理进度' },
    { value: 'comprehensive', desc: '包含以上所有内容及统计汇总' },
  ];

  return (
    <div>
      <PageHeader
        title="报告导出"
        description="导出设备使用、检查、故障等数据报告"
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">
              <FileBarChart size={18} className="inline mr-2" />
              导出配置
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                报告类型 <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {exportTypeOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all',
                      form.type === opt.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="exportType"
                      value={opt.value}
                      checked={form.type === opt.value}
                      onChange={(e) =>
                        setForm({ ...form, type: e.target.value as ExportType })
                      }
                      className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {EXPORT_TYPE_LABELS[opt.value]}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {opt.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Calendar size={14} className="inline mr-1" />
                  开始日期
                </label>
                <input
                  type="date"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Calendar size={14} className="inline mr-1" />
                  结束日期
                </label>
                <input
                  type="date"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={generateCSV} size="lg">
                <Download size={18} />
                生成并导出报告
              </Button>
              <span className="text-xs text-slate-500">
                报告将以 CSV 格式导出，支持 Excel 打开
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4">
              <FileText size={18} className="inline mr-2" />
              导出历史
            </h3>

            {exportRecords.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-8">
                暂无导出记录
              </div>
            ) : (
              <div className="space-y-3">
                {exportRecords.slice(0, 20).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <FileBarChart size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {record.fileName}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {format(
                              parseISO(record.generateTime),
                              'yyyy-MM-dd HH:mm'
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={11} />
                            {record.operator}
                          </span>
                          <span>
                            {format(parseISO(record.startTime), 'MM-dd')} ~{' '}
                            {format(parseISO(record.endTime), 'MM-dd')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="info">
                      {EXPORT_TYPE_LABELS[record.type]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-5 text-white sticky top-6">
            <h4 className="font-semibold text-base mb-4 flex items-center gap-2">
              <FileBarChart size={18} />
              报告包含内容
            </h4>
            <ul className="space-y-2.5 text-sm">
              {form.type === 'device_usage' || form.type === 'comprehensive' ? (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-200 mt-1.5 flex-shrink-0" />
                  <span>设备占用记录（会议、设备、时间）</span>
                </li>
              ) : null}
              {form.type === 'inspection' || form.type === 'comprehensive' ? (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-200 mt-1.5 flex-shrink-0" />
                  <span>设备检查结果（检查项、通过/异常数）</span>
                </li>
              ) : null}
              {form.type === 'fault' || form.type === 'comprehensive' ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-200 mt-1.5 flex-shrink-0" />
                    <span>故障处理人及处理进度</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-200 mt-1.5 flex-shrink-0" />
                    <span>故障上报/修复/关闭时间</span>
                  </li>
                </>
              ) : null}
              {form.type === 'comprehensive' && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-200 mt-1.5 flex-shrink-0" />
                  <span>统计汇总数据及生成信息</span>
                </li>
              )}
            </ul>
            <div className="mt-5 pt-4 border-t border-blue-500/30">
              <p className="text-xs text-blue-200">
                统计周期: {form.startTime} ~ {form.endTime}
              </p>
              <p className="text-xs text-blue-200 mt-1">
                操作人: 管理员
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
