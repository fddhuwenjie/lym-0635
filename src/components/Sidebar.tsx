import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  MonitorCog,
  ClipboardCheck,
  AlertTriangle,
  FileBarChart,
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { to: '/', label: '设备状态墙', icon: LayoutDashboard },
  { to: '/calendar', label: '会议日历', icon: Calendar },
  { to: '/meetings', label: '会议管理', icon: Users },
  { to: '/devices', label: '设备管理', icon: MonitorCog },
  { to: '/inspections', label: '检查任务', icon: ClipboardCheck },
  { to: '/faults', label: '故障报修', icon: AlertTriangle },
  { to: '/borrows', label: '设备借调', icon: ArrowRightLeft },
  { to: '/reports', label: '报告导出', icon: FileBarChart },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-[#1e293b] text-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-5 border-b border-slate-700">
        <h1 className="text-lg font-bold tracking-wide text-slate-100">
          会议室设备管理系统
        </h1>
        <p className="text-xs text-slate-400 mt-1">Meeting Room System</p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              )
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
            A
          </div>
          <div>
            <p className="text-sm font-medium">管理员</p>
            <p className="text-xs text-slate-400">admin@company.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
