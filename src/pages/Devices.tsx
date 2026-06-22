import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { useAppStore } from '@/store/appStore';
import {
  Plus,
  Trash2,
  Edit3,
  Projector,
  Volume2,
  DoorOpen,
  Wifi,
  Search,
  Building2,
  MonitorCog,
} from 'lucide-react';
import {
  Device,
  DeviceType,
  Room,
  DEVICE_TYPE_LABELS,
  DEVICE_STATUS_LABELS,
} from '@/types';
import { cn } from '@/lib/utils';

type TabType = 'rooms' | 'devices';

const deviceTypeIcons: Record<DeviceType, typeof Projector> = {
  projector: Projector,
  speaker: Volume2,
  access: DoorOpen,
  network: Wifi,
};

const deviceStatusVariant: Record<Device['status'], 'success' | 'danger' | 'warning'> = {
  normal: 'success',
  fault: 'danger',
  maintenance: 'warning',
};

export default function DevicesPage() {
  const {
    rooms,
    devices,
    addRoom,
    updateRoom,
    deleteRoom,
    addDevice,
    updateDevice,
    deleteDevice,
  } = useAppStore();

  const [tab, setTab] = useState<TabType>('rooms');
  const [searchTerm, setSearchTerm] = useState('');

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState({
    name: '',
    capacity: 10,
    location: '',
    status: 'normal' as Room['status'],
  });

  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    type: 'projector' as DeviceType,
    roomId: '',
    model: '',
    status: 'normal' as Device['status'],
    purchaseDate: '',
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'room' | 'device';
    id: string;
    name: string;
  } | null>(null);

  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openRoomModal = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setRoomForm({
        name: room.name,
        capacity: room.capacity,
        location: room.location,
        status: room.status,
      });
    } else {
      setEditingRoom(null);
      setRoomForm({
        name: '',
        capacity: 10,
        location: '',
        status: 'normal',
      });
    }
    setRoomModalOpen(true);
  };

  const submitRoom = () => {
    if (!roomForm.name.trim()) return;
    if (editingRoom) {
      updateRoom(editingRoom.id, roomForm);
    } else {
      addRoom(roomForm);
    }
    setRoomModalOpen(false);
  };

  const openDeviceModal = (device?: Device) => {
    if (device) {
      setEditingDevice(device);
      setDeviceForm({
        name: device.name,
        type: device.type,
        roomId: device.roomId,
        model: device.model,
        status: device.status,
        purchaseDate: device.purchaseDate,
      });
    } else {
      setEditingDevice(null);
      setDeviceForm({
        name: '',
        type: 'projector',
        roomId: rooms[0]?.id || '',
        model: '',
        status: 'normal',
        purchaseDate: new Date().toISOString().split('T')[0],
      });
    }
    setDeviceModalOpen(true);
  };

  const submitDevice = () => {
    if (!deviceForm.name.trim() || !deviceForm.roomId) return;
    if (editingDevice) {
      updateDevice(editingDevice.id, deviceForm);
    } else {
      addDevice(deviceForm);
    }
    setDeviceModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'room') {
      deleteRoom(deleteConfirm.id);
    } else {
      deleteDevice(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  return (
    <div>
      <PageHeader
        title="设备管理"
        description="管理会议室及各类设备信息"
        actions={
          <Button
            onClick={() =>
              tab === 'rooms' ? openRoomModal() : openDeviceModal()
            }
          >
            <Plus size={16} />
            {tab === 'rooms' ? '添加会议室' : '添加设备'}
          </Button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('rooms')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === 'rooms'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Building2 size={14} className="inline mr-2" />
              会议室管理
            </button>
            <button
              onClick={() => setTab('devices')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === 'devices'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <MonitorCog size={14} className="inline mr-2" />
              设备管理
            </button>
          </div>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder={tab === 'rooms' ? '搜索会议室...' : '搜索设备...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-64 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {tab === 'rooms' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    会议室名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    位置
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    容量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    设备数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800">
                        {room.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {room.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {room.capacity} 人
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {devices.filter((d) => d.roomId === room.id).length} 台
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={room.status === 'normal' ? 'success' : 'warning'}>
                        {room.status === 'normal' ? '正常使用' : '维护中'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openRoomModal(room)}
                        >
                          <Edit3 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setDeleteConfirm({
                              type: 'room',
                              id: room.id,
                              name: room.name,
                            })
                          }
                        >
                          <Trash2 size={14} className="text-rose-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRooms.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-slate-500"
                    >
                      暂无会议室数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    设备名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    型号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    所属会议室
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDevices.map((device) => {
                  const IconCmp = deviceTypeIcons[device.type];
                  const room = rooms.find((r) => r.id === device.roomId);
                  return (
                    <tr key={device.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <IconCmp size={16} className="text-slate-600" />
                          </div>
                          <span className="font-medium text-slate-800">
                            {device.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {DEVICE_TYPE_LABELS[device.type]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {device.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {room?.name || '未分配'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={deviceStatusVariant[device.status]}>
                          {DEVICE_STATUS_LABELS[device.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeviceModal(device)}
                          >
                            <Edit3 size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'device',
                                id: device.id,
                                name: device.name,
                              })
                            }
                          >
                            <Trash2 size={14} className="text-rose-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDevices.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-slate-500"
                    >
                      暂无设备数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={roomModalOpen}
        title={editingRoom ? '编辑会议室' : '添加会议室'}
        onClose={() => setRoomModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRoomModalOpen(false)}>
              取消
            </Button>
            <Button onClick={submitRoom}>
              {editingRoom ? '保存修改' : '添加'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              会议室名称
            </label>
            <input
              type="text"
              value={roomForm.name}
              onChange={(e) =>
                setRoomForm({ ...roomForm, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="请输入会议室名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              位置
            </label>
            <input
              type="text"
              value={roomForm.location}
              onChange={(e) =>
                setRoomForm({ ...roomForm, location: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="如：A座3楼301"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              容纳人数
            </label>
            <input
              type="number"
              min="1"
              value={roomForm.capacity}
              onChange={(e) =>
                setRoomForm({
                  ...roomForm,
                  capacity: parseInt(e.target.value) || 1,
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              状态
            </label>
            <select
              value={roomForm.status}
              onChange={(e) =>
                setRoomForm({
                  ...roomForm,
                  status: e.target.value as Room['status'],
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="normal">正常使用</option>
              <option value="maintenance">维护中</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={deviceModalOpen}
        title={editingDevice ? '编辑设备' : '添加设备'}
        onClose={() => setDeviceModalOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeviceModalOpen(false)}
            >
              取消
            </Button>
            <Button onClick={submitDevice}>
              {editingDevice ? '保存修改' : '添加'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              设备名称
            </label>
            <input
              type="text"
              value={deviceForm.name}
              onChange={(e) =>
                setDeviceForm({ ...deviceForm, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="请输入设备名称"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                设备类型
              </label>
              <select
                value={deviceForm.type}
                onChange={(e) =>
                  setDeviceForm({
                    ...deviceForm,
                    type: e.target.value as DeviceType,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {Object.entries(DEVICE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                所属会议室
              </label>
              <select
                value={deviceForm.roomId}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, roomId: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              设备型号
            </label>
            <input
              type="text"
              value={deviceForm.model}
              onChange={(e) =>
                setDeviceForm({ ...deviceForm, model: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="请输入设备型号"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                状态
              </label>
              <select
                value={deviceForm.status}
                onChange={(e) =>
                  setDeviceForm({
                    ...deviceForm,
                    status: e.target.value as Device['status'],
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="normal">正常</option>
                <option value="fault">故障</option>
                <option value="maintenance">维护中</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                采购日期
              </label>
              <input
                type="date"
                value={deviceForm.purchaseDate}
                onChange={(e) =>
                  setDeviceForm({
                    ...deviceForm,
                    purchaseDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteConfirm}
        title="确认删除"
        onClose={() => setDeleteConfirm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          确定要删除
          <span className="font-medium text-slate-800">「{deleteConfirm?.name}」</span>
          吗？此操作不可撤销。
        </p>
      </Modal>
    </div>
  );
}
