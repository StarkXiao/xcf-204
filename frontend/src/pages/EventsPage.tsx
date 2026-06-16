import { useEffect, useState } from 'react';
import { eventAPI, characterAPI } from '../api';
import { Event, Character } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { Button, InputField, SelectField, TextareaField } from '../components/FormField';
import Badge from '../components/Badge';

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: '战斗',
    level: 'C级',
    date: '',
    location: '',
    description: '',
    result: '',
    characterIds: [] as number[],
  });
  const { isAdmin } = useAuth();

  const loadData = () => {
    Promise.all([eventAPI.getAll(), characterAPI.getAll()]).then(([e, c]) => {
      setEvents(e);
      setCharacters(c);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        type: event.type,
        level: event.level,
        date: new Date(event.date).toISOString().split('T')[0],
        location: event.location,
        description: event.description,
        result: event.result || '',
        characterIds: event.characters?.map((ec) => ec.characterId) || [],
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        type: '战斗',
        level: 'C级',
        date: new Date().toISOString().split('T')[0],
        location: '',
        description: '',
        result: '',
        characterIds: [],
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await eventAPI.update(editingEvent.id, formData);
      } else {
        await eventAPI.create(formData);
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个事件吗？')) {
      await eventAPI.delete(id);
      loadData();
    }
  };

  const levelColors: Record<string, 'purple' | 'red' | 'yellow' | 'blue' | 'gray'> = {
    'S级': 'purple',
    'A级': 'red',
    'B级': 'yellow',
    'C级': 'blue',
    'D级': 'gray',
  };

  const typeColors: Record<string, 'red' | 'yellow' | 'blue' | 'green' | 'purple'> = {
    '战斗': 'red',
    '救援': 'green',
    '侦察': 'blue',
    '谈判': 'yellow',
    '其他': 'purple',
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
          <h1 className="text-3xl font-bold mb-2">📋 事件记录</h1>
          <p className="text-[var(--text-secondary)]">查看和管理所有异能事件记录</p>
        </div>
        {isAdmin && (
          <Button onClick={() => openModal()}>+ 添加事件</Button>
        )}
      </div>

      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent-primary)] transition-colors"
          >
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl font-bold">{event.title}</h3>
                  <Badge color={typeColors[event.type] || 'gray'}>{event.type}</Badge>
                  <Badge color={levelColors[event.level] || 'gray'}>{event.level}</Badge>
                  {event.result && (
                    <Badge color={event.result === '成功' ? 'green' : 'red'}>{event.result}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)] mb-4">
                  <span>📅 {new Date(event.date).toLocaleDateString('zh-CN')}</span>
                  <span>📍 {event.location}</span>
                </div>
                <p className="text-[var(--text-secondary)] mb-4">{event.description}</p>
                {event.characters && event.characters.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-[var(--text-secondary)]">参与人员:</span>
                    {event.characters.map((ec) => (
                      <Badge key={ec.characterId} color="purple">
                        {ec.character.avatar} {ec.character.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="flex flex-col gap-2">
                  <Button variant="secondary" className="text-sm py-2 px-4" onClick={() => openModal(event)}>
                    编辑
                  </Button>
                  <Button variant="danger" className="text-sm py-2 px-4" onClick={() => handleDelete(event.id)}>
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
        title={editingEvent ? '编辑事件' : '添加事件'}
      >
        <form onSubmit={handleSubmit}>
          <InputField
            label="事件标题"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="事件类型"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={[
                { value: '战斗', label: '战斗' },
                { value: '救援', label: '救援' },
                { value: '侦察', label: '侦察' },
                { value: '谈判', label: '谈判' },
                { value: '其他', label: '其他' },
              ]}
            />
            <SelectField
              label="危险等级"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              options={[
                { value: 'D级', label: 'D级 - 安全' },
                { value: 'C级', label: 'C级 - 一般' },
                { value: 'B级', label: 'B级 - 危险' },
                { value: 'A级', label: 'A级 - 极危' },
                { value: 'S级', label: 'S级 - 灾难' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="日期"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <InputField
              label="地点"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>
          <TextareaField
            label="事件描述"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
          <SelectField
            label="处理结果"
            value={formData.result}
            onChange={(e) => setFormData({ ...formData, result: e.target.value })}
            options={[
              { value: '', label: '未处理' },
              { value: '成功', label: '成功' },
              { value: '失败', label: '失败' },
              { value: '处理中', label: '处理中' },
            ]}
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">参与角色</label>
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
              {editingEvent ? '保存修改' : '创建事件'}
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

export default EventsPage;
