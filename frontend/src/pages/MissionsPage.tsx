import { useEffect, useState } from 'react';
import { missionAPI, characterAPI } from '../api';
import { Mission, Character } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { Button, InputField, SelectField, TextareaField } from '../components/FormField';
import Badge from '../components/Badge';

const MissionsPage = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: '中',
    status: '待处理',
    dueDate: '',
    characterIds: [] as number[],
  });
  const { isAdmin } = useAuth();

  const loadData = () => {
    Promise.all([missionAPI.getAll(), characterAPI.getAll()]).then(([m, c]) => {
      setMissions(m);
      setCharacters(c);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (mission?: Mission) => {
    if (mission) {
      setEditingMission(mission);
      setFormData({
        title: mission.title,
        description: mission.description,
        priority: mission.priority,
        status: mission.status,
        dueDate: new Date(mission.dueDate).toISOString().split('T')[0],
        characterIds: mission.characters?.map((mc) => mc.characterId) || [],
      });
    } else {
      setEditingMission(null);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setFormData({
        title: '',
        description: '',
        priority: '中',
        status: '待处理',
        dueDate: nextWeek.toISOString().split('T')[0],
        characterIds: [],
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMission) {
        await missionAPI.update(editingMission.id, formData);
      } else {
        await missionAPI.create(formData);
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个任务吗？')) {
      await missionAPI.delete(id);
      loadData();
    }
  };

  const priorityColors: Record<string, 'red' | 'yellow' | 'blue'> = {
    '高': 'red',
    '中': 'yellow',
    '低': 'blue',
  };

  const statusColors: Record<string, 'yellow' | 'green' | 'purple' | 'gray'> = {
    '待处理': 'gray',
    '进行中': 'green',
    '已完成': 'purple',
    '已取消': 'gray',
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getMissionsForDay = (day: number | null) => {
    if (!day) return [];
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return missions.filter((m) => new Date(m.dueDate).toISOString().split('T')[0] === dateStr);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">📅 任务日历</h1>
          <p className="text-[var(--text-secondary)]">查看和管理所有任务安排</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-[var(--bg-secondary)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)]'}`}
            >
              列表
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)]'}`}
            >
              日历
            </button>
          </div>
          {isAdmin && (
            <Button onClick={() => openModal()}>+ 添加任务</Button>
          )}
        </div>
      </div>

      {viewMode === 'calendar' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="text-2xl hover:text-[var(--accent-primary)] transition-colors">
              ←
            </button>
            <h2 className="text-xl font-bold">
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </h2>
            <button onClick={nextMonth} className="text-2xl hover:text-[var(--accent-primary)] transition-colors">
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-[var(--text-secondary)] py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {getDaysInMonth(currentMonth).map((day, idx) => {
              const dayMissions = getMissionsForDay(day);
              const isToday = day && new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();
              return (
                <div
                  key={idx}
                  className={`min-h-24 p-2 rounded-lg border transition-colors ${
                    day
                      ? isToday
                        ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]'
                        : 'bg-[var(--bg-tertiary)] border-[var(--border)] hover:border-[var(--accent-primary)]'
                      : 'bg-transparent border-transparent'
                  }`}
                >
                  {day && (
                    <>
                      <span className={`text-sm font-medium ${isToday ? 'text-[var(--accent-primary)]' : ''}`}>
                        {day}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayMissions.slice(0, 2).map((mission) => (
                          <div
                            key={mission.id}
                            className="text-xs p-1 rounded truncate bg-[var(--accent-primary)]/30"
                            title={mission.title}
                          >
                            {mission.title}
                          </div>
                        ))}
                        {dayMissions.length > 2 && (
                          <div className="text-xs text-[var(--text-secondary)]">+{dayMissions.length - 2} 更多</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {missions.map((mission) => (
          <div
            key={mission.id}
            className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent-primary)] transition-colors"
          >
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl font-bold">{mission.title}</h3>
                  <Badge color={priorityColors[mission.priority] || 'gray'}>
                    {mission.priority}优先级
                  </Badge>
                  <Badge color={statusColors[mission.status] || 'gray'}>
                    {mission.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)] mb-4">
                  <span>📅 截止: {new Date(mission.dueDate).toLocaleDateString('zh-CN')}</span>
                </div>
                <p className="text-[var(--text-secondary)] mb-4">{mission.description}</p>
                {mission.characters && mission.characters.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-[var(--text-secondary)]">执行人员:</span>
                    {mission.characters.map((mc) => (
                      <Badge key={mc.characterId} color="purple">
                        {mc.character.avatar} {mc.character.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="flex flex-col gap-2">
                  <Button variant="secondary" className="text-sm py-2 px-4" onClick={() => openModal(mission)}>
                    编辑
                  </Button>
                  <Button variant="danger" className="text-sm py-2 px-4" onClick={() => handleDelete(mission.id)}>
                    删除
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMission ? '编辑任务' : '添加任务'}
      >
        <form onSubmit={handleSubmit}>
          <InputField
            label="任务标题"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="优先级"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              options={[
                { value: '高', label: '高优先级' },
                { value: '中', label: '中优先级' },
                { value: '低', label: '低优先级' },
              ]}
            />
            <SelectField
              label="状态"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: '待处理', label: '待处理' },
                { value: '进行中', label: '进行中' },
                { value: '已完成', label: '已完成' },
                { value: '已取消', label: '已取消' },
              ]}
            />
          </div>
          <InputField
            label="截止日期"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
          />
          <TextareaField
            label="任务描述"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">分配角色</label>
            <div className="flex flex-wrap gap-2">
              {characters.map((char) => (
                <label
                  key={char.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    formData.characterIds.includes(char.id)
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.characterIds.includes(char.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, characterIds: [...formData.characterIds, char.id] });
                      } else {
                        setFormData({
                          ...formData,
                          characterIds: formData.characterIds.filter((id) => id !== char.id),
                        });
                      }
                    }}
                    className="hidden"
                  />
                  <span>{char.avatar}</span>
                  <span className="text-sm">{char.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <Button type="submit" className="flex-1">
              {editingMission ? '保存修改' : '创建任务'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setModalOpen(false)}
            >
              取消
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MissionsPage;
