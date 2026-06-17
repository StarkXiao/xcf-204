import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { characterAPI, eventAPI, missionAPI } from '../api';
import { Character, Event, Mission, LevelHistory } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { Button, InputField, SelectField, TextareaField } from '../components/FormField';
import Badge from '../components/Badge';

type TimelineItemType = 'level-up' | 'level-down' | 'event' | 'mission';

interface TimelineItem {
  id: string;
  type: TimelineItemType;
  date: string;
  title: string;
  description?: string;
  level?: { old: string; new: string };
  eventId?: number;
  missionId?: number;
  eventType?: string;
  missionStatus?: string;
  missionPriority?: string;
}

const CharactersPage = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [growthModalOpen, setGrowthModalOpen] = useState(false);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [levelHistories, setLevelHistories] = useState<LevelHistory[]>([]);
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const loadData = () => {
    Promise.all([characterAPI.getAll(), eventAPI.getAll(), missionAPI.getAll()]).then(([c, e, m]) => {
      setCharacters(c);
      setEvents(e);
      setMissions(m);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const charId = searchParams.get('characterId');
    if (charId && !loading && characters.length > 0) {
      const char = characters.find((c) => c.id === Number(charId));
      if (char && !detailModalOpen) {
        setSelectedChar(char);
        setDetailModalOpen(true);
      }
    }
  }, [searchParams, characters, loading, detailModalOpen]);

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedChar(null);
    searchParams.delete('characterId');
    setSearchParams(searchParams);
  };

  const goToEventDetail = (eventId: number) => {
    navigate(`/events?eventId=${eventId}`);
  };

  const goToMissionDetail = (missionId: number) => {
    navigate(`/missions?missionId=${missionId}`);
  };

  const openGrowthTrail = async (char: Character) => {
    try {
      const histories = await characterAPI.getLevelHistories(char.id);
      setLevelHistories(histories);
      setGrowthModalOpen(true);
    } catch (err) {
      console.error('获取等级历史失败', err);
      setLevelHistories([]);
      setGrowthModalOpen(true);
    }
  };

  const buildTimeline = (charId: number): TimelineItem[] => {
    const items: TimelineItem[] = [];

    levelHistories.forEach((history) => {
      const isLevelUp = compareLevels(history.newLevel, history.oldLevel) > 0;
      items.push({
        id: `level-${history.id}`,
        type: isLevelUp ? 'level-up' : 'level-down',
        date: history.createdAt,
        title: isLevelUp ? '等级提升' : '等级下降',
        description: history.reason + (history.description ? `：${history.description}` : ''),
        level: { old: history.oldLevel, new: history.newLevel },
        eventId: history.eventId,
        missionId: history.missionId,
      });
    });

    const charEvents = events.filter((e) =>
      e.characters?.some((ec) => ec.characterId === charId)
    );
    charEvents.forEach((event) => {
      items.push({
        id: `event-${event.id}`,
        type: 'event',
        date: event.date,
        title: event.title,
        description: event.description,
        eventId: event.id,
        eventType: event.type,
      });
    });

    const charMissions = missions.filter((m) =>
      m.characters?.some((mc) => mc.characterId === charId)
    );
    charMissions.forEach((mission) => {
      items.push({
        id: `mission-${mission.id}`,
        type: 'mission',
        date: mission.dueDate,
        title: mission.title,
        description: mission.description,
        missionId: mission.id,
        missionStatus: mission.status,
        missionPriority: mission.priority,
      });
    });

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items;
  };

  const compareLevels = (levelA: string, levelB: string): number => {
    const levelOrder = ['D级', 'C级', 'B级', 'A级', 'S级', 'SS级'];
    return levelOrder.indexOf(levelA) - levelOrder.indexOf(levelB);
  };

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

  const openDetail = (char: Character) => {
    setSelectedChar(char);
    setDetailModalOpen(true);
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

  const getCharEvents = (charId: number) => {
    return events.filter((e) => e.characters?.some((ec) => ec.characterId === charId));
  };

  const getCharMissions = (charId: number) => {
    return missions.filter((m) => m.characters?.some((mc) => mc.characterId === charId));
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

  const priorityColors: Record<string, 'red' | 'yellow' | 'blue'> = {
    '高': 'red',
    '中': 'yellow',
    '低': 'blue',
  };

  const missionStatusColors: Record<string, 'yellow' | 'green' | 'purple' | 'gray'> = {
    '待处理': 'gray',
    '进行中': 'green',
    '已完成': 'purple',
    '已取消': 'gray',
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
            className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent-primary)] transition-colors cursor-pointer"
            onClick={() => openDetail(char)}
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

            <div className="text-xs text-[var(--text-secondary)]">
              <p>参与事件: {getCharEvents(char.id).length} 次</p>
              <p>执行任务: {getCharMissions(char.id).length} 个</p>
            </div>
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

      <Modal
        isOpen={detailModalOpen}
        onClose={closeDetailModal}
        title="角色详情"
      >
        {selectedChar && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-4xl shrink-0">
                {selectedChar.avatar || '👤'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold">{selectedChar.name}</h2>
                  {selectedChar.codeName && (
                    <span className="text-[var(--text-secondary)]">「{selectedChar.codeName}」</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge color={levelColors[selectedChar.level] || 'gray'}>{selectedChar.level}</Badge>
                  <Badge color={statusColors[selectedChar.status] || 'gray'}>{selectedChar.status}</Badge>
                </div>
                <p className="text-[var(--text-secondary)]">异能: {selectedChar.ability}</p>
              </div>
            </div>

            {selectedChar.description && (
              <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
                <h3 className="font-medium mb-2">角色简介</h3>
                <p className="text-[var(--text-secondary)] text-sm">{selectedChar.description}</p>
              </div>
            )}

            <div className="border-t border-[var(--border)] pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span>📋</span> 关联事件 ({getCharEvents(selectedChar.id).length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {getCharEvents(selectedChar.id).length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">暂无关联事件</p>
                ) : (
                  getCharEvents(selectedChar.id).map((event) => (
                    <div
                      key={event.id}
                      className="bg-[var(--bg-tertiary)] rounded-lg p-3 hover:bg-[var(--border)] transition-colors cursor-pointer"
                      onClick={() => goToEventDetail(event.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{event.title}</span>
                        <Badge color={typeColors[event.type] || 'gray'} className="text-xs">
                          {event.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        📅 {new Date(event.date).toLocaleDateString('zh-CN')} · 📍 {event.location}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span>📅</span> 待办任务 ({getCharMissions(selectedChar.id).filter((m) => m.status !== '已完成' && m.status !== '已取消').length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {getCharMissions(selectedChar.id).length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">暂无待办任务</p>
                ) : (
                  getCharMissions(selectedChar.id).map((mission) => (
                    <div
                      key={mission.id}
                      className="bg-[var(--bg-tertiary)] rounded-lg p-3 hover:bg-[var(--border)] transition-colors cursor-pointer"
                      onClick={() => goToMissionDetail(mission.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{mission.title}</span>
                        <Badge color={priorityColors[mission.priority] || 'gray'} className="text-xs">
                          {mission.priority}优先级
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span>📅 截止: {new Date(mission.dueDate).toLocaleDateString('zh-CN')}</span>
                        <Badge color={missionStatusColors[mission.status] || 'gray'} className="text-xs">
                          {mission.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  if (selectedChar) {
                    openGrowthTrail(selectedChar);
                  }
                }}
              >
                📈 查看成长轨迹
              </Button>
            </div>

            {isAdmin && (
              <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setDetailModalOpen(false);
                    openModal(selectedChar);
                  }}
                >
                  编辑
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    if (confirm('确定要删除这个角色吗？')) {
                      handleDelete(selectedChar.id);
                      setDetailModalOpen(false);
                    }
                  }}
                >
                  删除
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={growthModalOpen}
        onClose={() => setGrowthModalOpen(false)}
        title="角色成长轨迹"
        size="large"
      >
        {selectedChar && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--border)]">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-3xl shrink-0">
                {selectedChar.avatar || '👤'}
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedChar.name}</h2>
                <p className="text-[var(--text-secondary)]">
                  {selectedChar.ability} · 
                  <Badge color={levelColors[selectedChar.level] || 'gray'} className="ml-2">
                    {selectedChar.level}
                  </Badge>
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {buildTimeline(selectedChar.id).length === 0 ? (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <p className="text-4xl mb-4">📊</p>
                  <p>暂无成长记录</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[var(--border)]"></div>
                  
                  {buildTimeline(selectedChar.id).map((item) => (
                    <div key={item.id} className="relative pl-14 pb-6">
                      <div
                        className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 ${
                          item.type === 'level-up'
                            ? 'bg-green-500/20 border-2 border-green-500'
                            : item.type === 'level-down'
                            ? 'bg-red-500/20 border-2 border-red-500'
                            : item.type === 'event'
                            ? 'bg-blue-500/20 border-2 border-blue-500'
                            : 'bg-yellow-500/20 border-2 border-yellow-500'
                        }`}
                      >
                        {item.type === 'level-up' && '⬆️'}
                        {item.type === 'level-down' && '⬇️'}
                        {item.type === 'event' && '📋'}
                        {item.type === 'mission' && '📅'}
                      </div>

                      <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 hover:bg-[var(--border)] transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{item.title}</h4>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {new Date(item.date).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {item.type === 'level-up' || item.type === 'level-down' ? (
                              <div className="flex items-center gap-2">
                                {item.level && (
                                  <>
                                    <Badge color={levelColors[item.level.old] || 'gray'} className="text-xs">
                                      {item.level.old}
                                    </Badge>
                                    <span className="text-[var(--text-secondary)]">→</span>
                                    <Badge color={levelColors[item.level.new] || 'gray'} className="text-xs">
                                      {item.level.new}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            ) : item.type === 'event' ? (
                              item.eventType && (
                                <Badge color={typeColors[item.eventType] || 'gray'} className="text-xs">
                                  {item.eventType}
                                </Badge>
                              )
                            ) : (
                              item.missionStatus && (
                                <Badge
                                  color={missionStatusColors[item.missionStatus] || 'gray'}
                                  className="text-xs"
                                >
                                  {item.missionStatus}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>

                        {item.description && (
                          <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        {(item.eventId || item.missionId) && (
                          <div className="flex gap-2">
                            {item.eventId && (
                              <button
                                className="text-xs text-[var(--accent-primary)] hover:underline"
                                onClick={() => {
                                  setGrowthModalOpen(false);
                                  goToEventDetail(item.eventId!);
                                }}
                              >
                                查看事件详情 →
                              </button>
                            )}
                            {item.missionId && (
                              <button
                                className="text-xs text-[var(--accent-primary)] hover:underline"
                                onClick={() => {
                                  setGrowthModalOpen(false);
                                  goToMissionDetail(item.missionId!);
                                }}
                              >
                                查看任务详情 →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex flex-wrap gap-4 justify-center text-sm text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>等级提升</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>等级下降</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>参与事件</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>执行任务</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CharactersPage;
