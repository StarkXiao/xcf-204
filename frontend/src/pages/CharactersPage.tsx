import { useEffect, useState } from 'react';
import { characterAPI } from '../api';
import { Character } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { Button, InputField, SelectField, TextareaField } from '../components/FormField';
import Badge from '../components/Badge';

const CharactersPage = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    codeName: '',
    ability: '',
    level: 'C级',
    status: '待命',
    description: '',
    avatar: '',
  });
  const { isAdmin } = useAuth();

  const loadData = () => {
    characterAPI.getAll().then((data) => {
      setCharacters(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (char?: Character) => {
    if (char) {
      setEditingChar(char);
      setFormData({
        name: char.name,
        codeName: char.codeName || '',
        ability: char.ability,
        level: char.level,
        status: char.status,
        description: char.description || '',
        avatar: char.avatar || '',
      });
    } else {
      setEditingChar(null);
      setFormData({
        name: '',
        codeName: '',
        ability: '',
        level: 'C级',
        status: '待命',
        description: '',
        avatar: '',
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingChar) {
        await characterAPI.update(editingChar.id, formData);
      } else {
        await characterAPI.create(formData);
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个角色吗？')) {
      await characterAPI.delete(id);
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

  const statusColors: Record<string, 'green' | 'yellow' | 'gray'> = {
    '活跃': 'green',
    '待命': 'yellow',
    '离线': 'gray',
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
          <h1 className="text-3xl font-bold mb-2">👤 角色管理</h1>
          <p className="text-[var(--text-secondary)]">管理所有注册异能者的档案信息</p>
        </div>
        {isAdmin && (
          <Button onClick={() => openModal()}>+ 添加角色</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {characters.map((char) => (
          <div
            key={char.id}
            className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent-primary)] transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-3xl">
                  {char.avatar || '👤'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{char.name}</h3>
                    {char.codeName && (
                      <span className="text-sm text-[var(--text-secondary)]">「{char.codeName}」</span>
                    )}
                  </div>
                  <p className="text-[var(--text-secondary)]">{char.ability}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Badge color={levelColors[char.level] || 'gray'}>{char.level}</Badge>
              <Badge color={statusColors[char.status] || 'gray'}>{char.status}</Badge>
            </div>

            {char.description && (
              <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">{char.description}</p>
            )}

            <div className="text-xs text-[var(--text-secondary)] mb-4">
              <p>参与事件: {char.events?.length || 0} 次</p>
              <p>执行任务: {char.missions?.length || 0} 个</p>
            </div>

            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 text-sm py-2" onClick={() => openModal(char)}>
                  编辑
                </Button>
                <Button variant="danger" className="flex-1 text-sm py-2" onClick={() => handleDelete(char.id)}>
                  删除
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingChar ? '编辑角色' : '添加角色'}
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="姓名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <InputField
              label="代号"
              value={formData.codeName}
              onChange={(e) => setFormData({ ...formData, codeName: e.target.value })}
            />
          </div>
          <InputField
            label="异能"
            value={formData.ability}
            onChange={(e) => setFormData({ ...formData, ability: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="等级"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              options={[
                { value: 'D级', label: 'D级' },
                { value: 'C级', label: 'C级' },
                { value: 'B级', label: 'B级' },
                { value: 'A级', label: 'A级' },
                { value: 'S级', label: 'S级' },
                { value: 'SS级', label: 'SS级' },
              ]}
            />
            <SelectField
              label="状态"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: '活跃', label: '活跃' },
                { value: '待命', label: '待命' },
                { value: '离线', label: '离线' },
                { value: '重伤', label: '重伤' },
              ]}
            />
          </div>
          <InputField
            label="头像 (emoji)"
            value={formData.avatar}
            onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
            placeholder="如: 🌙, 🔥, 💨"
          />
          <TextareaField
            label="描述"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="flex gap-4 mt-6">
            <Button type="submit" className="flex-1">
              {editingChar ? '保存修改' : '创建角色'}
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

export default CharactersPage;
