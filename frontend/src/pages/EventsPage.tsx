import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { eventAPI, characterAPI, missionAPI } from '../api';
import { Event, Character, Mission, EventCharacter } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { Button, InputField, SelectField, TextareaField } from '../components/FormField';
import Badge from '../components/Badge';

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [levelUpModalOpen, setLevelUpModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [levelUpChar, setLevelUpChar] = useState<Character | null>(null);
  const [editingRoleChar, setEditingRoleChar] = useState<EventCharacter | null>(null);
  const [levelUpForm, setLevelUpForm] = useState({
    newLevel: '',
    reason: '',
    description: '',
  });
  const [roleForm, setRoleForm] = useState({
    role: '',
    contribution: '',
    missionResult: '',
    collaboration: '',
  });
  const [formData, setFormData] = useState({
    title: '',
    type: '战斗',
    level: 'C级',
    date: '',
    location: '',
    description: '',
    result: '',
    disposalConclusion: '',
    characterIds: [] as number[],
    characterRoles: [] as {
      characterId: number;
      role?: string;
      contribution?: string;
      missionResult?: string;
      collaboration?: string;
    }[],
  });
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const loadData = () => {
    Promise.all([eventAPI.getAll(), characterAPI.getAll(), missionAPI.getAll()]).then(([e, c, m]) => {
      setEvents(e);
      setCharacters(c);
      setMissions(m);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const eventId = searchParams.get('eventId');
    if (eventId && !loading && events.length > 0) {
      const event = events.find((e) => e.id === Number(eventId));
      if (event && !detailModalOpen) {
        setSelectedEvent(event);
        setDetailModalOpen(true);
      }
    }
  }, [searchParams, events, loading, detailModalOpen]);

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedEvent(null);
    searchParams.delete('eventId');
    setSearchParams(searchParams);
  };

  const goToCharacterDetail = (characterId: number) => {
    navigate(`/characters?characterId=${characterId}`);
  };

  const goToMissionDetail = (missionId: number) => {
    navigate(`/missions?missionId=${missionId}`);
  };

  const openLevelUpModal = (char: Character) => {
    setLevelUpChar(char);
    setLevelUpForm({
      newLevel: char.level,
      reason: '事件表现',
      description: '',
    });
    setLevelUpModalOpen(true);
  };

  const handleLevelUp = async () => {
    if (!levelUpChar || !selectedEvent) return;
    try {
      await characterAPI.createLevelHistory(levelUpChar.id, {
        oldLevel: levelUpChar.level,
        newLevel: levelUpForm.newLevel,
        reason: levelUpForm.reason,
        description: levelUpForm.description,
        eventId: selectedEvent.id,
      });
      setLevelUpModalOpen(false);
      loadData();
      alert('等级调整成功');
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失败');
    }
  };

  const openRoleModal = (eventChar: EventCharacter) => {
    setEditingRoleChar(eventChar);
    setRoleForm({
      role: eventChar.role || '',
      contribution: eventChar.contribution || '',
      missionResult: eventChar.missionResult || '',
      collaboration: eventChar.collaboration || '',
    });
    setRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!editingRoleChar || !selectedEvent) return;
    try {
      await eventAPI.updateCharacterRole(selectedEvent.id, editingRoleChar.characterId, roleForm);
      setRoleModalOpen(false);
      loadData();
      alert('角色分工更新成功');
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失败');
    }
  };

  const handleAutoUpdateConclusion = async () => {
    if (!selectedEvent) return;
    try {
      const updatedEvent = await eventAPI.autoUpdateConclusion(selectedEvent.id, true);
      setSelectedEvent(updatedEvent);
      loadData();
      alert('事件处置结论已自动更新');
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失败');
    }
  };

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
        disposalConclusion: event.disposalConclusion || '',
        characterIds: event.characters?.map((ec) => ec.characterId) || [],
        characterRoles: event.characters?.map((ec) => ({
          characterId: ec.characterId,
          role: ec.role,
          contribution: ec.contribution,
          missionResult: ec.missionResult,
          collaboration: ec.collaboration,
        })) || [],
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
        disposalConclusion: '',
        characterIds: [],
        characterRoles: [],
      });
    }
    setModalOpen(true);
  };

  const openDetail = (event: Event) => {
    setSelectedEvent(event);
    setDetailModalOpen(true);
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

  const getEventCharacters = (eventId: number) => {
    const event = events.find((e) => e.id === eventId);
    return event?.characters?.map((ec) => ec.character) || [];
  };

  const getEventMissions = (eventId: number) => {
    const event = events.find((e) => e.id === eventId);
    if (event?.missions && event.missions.length > 0) {
      return event.missions;
    }
    const eventCharIds = event?.characters?.map((ec) => ec.characterId) || [];
    return missions.filter((m) =>
      m.characters?.some((mc) => eventCharIds.includes(mc.characterId))
    );
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

  const charLevelColors: Record<string, 'purple' | 'red' | 'yellow' | 'blue' | 'gray'> = {
    'S级': 'purple',
    'A级': 'red',
    'B级': 'yellow',
    'C级': 'blue',
    'D级': 'gray',
  };

  const disposalStatusColors: Record<string, 'gray' | 'blue' | 'green' | 'purple' | 'red'> = {
    '待处置': 'gray',
    '处置中': 'blue',
    '已完成': 'green',
    '已取消': 'gray',
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
            className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent-primary)] transition-colors cursor-pointer"
            onClick={() => openDetail(event)}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl font-bold">{event.title}</h3>
                  <Badge color={typeColors[event.type] || 'gray'}>{event.type}</Badge>
                  <Badge color={levelColors[event.level] || 'gray'}>{event.level}</Badge>
                  <Badge color={disposalStatusColors[event.disposalStatus] || 'gray'}>
                    {event.disposalStatus}
                  </Badge>
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
          <TextareaField
            label="处置结论"
            value={formData.disposalConclusion}
            onChange={(e) => setFormData({ ...formData, disposalConclusion: e.target.value })}
            placeholder="事件处置的总结结论，可通过自动生成功能填写..."
            rows={4}
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

      <Modal
        isOpen={detailModalOpen}
        onClose={closeDetailModal}
        title="事件详情"
      >
        {selectedEvent && (
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
                <Badge color={typeColors[selectedEvent.type] || 'gray'}>{selectedEvent.type}</Badge>
                <Badge color={levelColors[selectedEvent.level] || 'gray'}>{selectedEvent.level}</Badge>
                <Badge color={disposalStatusColors[selectedEvent.disposalStatus] || 'gray'}>
                  {selectedEvent.disposalStatus}
                </Badge>
                {selectedEvent.result && (
                  <Badge color={selectedEvent.result === '成功' ? 'green' : 'red'}>
                    {selectedEvent.result}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                <span>📅 {new Date(selectedEvent.date).toLocaleDateString('zh-CN')}</span>
                <span>📍 {selectedEvent.location}</span>
              </div>
            </div>

            <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
              <h3 className="font-medium mb-2">事件描述</h3>
              <p className="text-[var(--text-secondary)] text-sm">{selectedEvent.description}</p>
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span>👤</span> 参与角色与分工 ({selectedEvent.characters?.length || 0})
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {!selectedEvent.characters || selectedEvent.characters.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">暂无参与角色</p>
                ) : (
                  selectedEvent.characters.map((ec) => (
                    <div
                      key={ec.characterId}
                      className="bg-[var(--bg-tertiary)] rounded-lg p-4 hover:bg-[var(--border)] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-xl cursor-pointer flex-shrink-0"
                          onClick={() => goToCharacterDetail(ec.characterId)}
                        >
                          {ec.character.avatar || '👤'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium">{ec.character.name}</span>
                            {ec.character.codeName && (
                              <span className="text-xs text-[var(--text-secondary)]">「{ec.character.codeName}」</span>
                            )}
                            {ec.role && (
                              <Badge color="purple" className="text-xs">
                                {ec.role}
                              </Badge>
                            )}
                            {ec.missionResult && (
                              <Badge
                                color={ec.missionResult === '成功' ? 'green' : ec.missionResult === '失败' ? 'red' : 'yellow'}
                                className="text-xs"
                              >
                                {ec.missionResult}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] mb-2">
                            {ec.character.ability}
                          </div>
                          {ec.contribution && (
                            <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded p-2 mb-1">
                              <span className="font-medium">贡献：</span>{ec.contribution}
                            </div>
                          )}
                          {ec.collaboration && (
                            <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] rounded p-2">
                              <span className="font-medium">协作：</span>{ec.collaboration}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <Badge color={charLevelColors[ec.character.level] || 'gray'} className="text-xs">
                            {ec.character.level}
                          </Badge>
                          {isAdmin && (
                            <>
                              <button
                                className="text-xs px-2 py-1 rounded bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLevelUpModal(ec.character);
                                }}
                              >
                                调整等级
                              </button>
                              <button
                                className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRoleModal(ec);
                                }}
                              >
                                编辑分工
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedEvent.disposalConclusion && (
              <div className="border-t border-[var(--border)] pt-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <span>📋</span> 处置结论
                </h3>
                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
                  <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">
                    {selectedEvent.disposalConclusion}
                  </pre>
                </div>
              </div>
            )}

            <div className="border-t border-[var(--border)] pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span>📅</span> 相关任务 ({getEventMissions(selectedEvent.id).length})
                <span className="text-xs text-[var(--text-secondary)] font-normal">
                  （通过共同角色关联）
                </span>
                {getEventMissions(selectedEvent.id).length > 0 && (
                  <span className="text-xs ml-auto">
                    <Badge color="green" className="text-xs">
                      已完成 {getEventMissions(selectedEvent.id).filter((m) => m.status === '已完成').length}
                    </Badge>
                    <Badge color="gray" className="text-xs ml-1">
                      共 {getEventMissions(selectedEvent.id).length}
                    </Badge>
                  </span>
                )}
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getEventMissions(selectedEvent.id).length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">暂无相关任务</p>
                ) : (
                  getEventMissions(selectedEvent.id).map((mission) => (
                    <div
                      key={mission.id}
                      className="bg-[var(--bg-tertiary)] rounded-lg p-3 hover:bg-[var(--border)] transition-colors"
                    >
                      <div className="flex items-start justify-between mb-1 gap-2">
                        <div
                          className="flex-1 cursor-pointer min-w-0"
                          onClick={() => goToMissionDetail(mission.id)}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{mission.title}</span>
                            <Badge color={priorityColors[mission.priority] || 'gray'} className="text-xs">
                              {mission.priority}优先级
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-1">
                            <span>📅 截止: {new Date(mission.dueDate).toLocaleDateString('zh-CN')}</span>
                            <Badge color={missionStatusColors[mission.status] || 'gray'} className="text-xs">
                              {mission.status}
                            </Badge>
                          </div>
                        </div>
                        {isAdmin && mission.status !== '已完成' && (
                          <button
                            className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white transition-colors flex-shrink-0"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await missionAPI.update(mission.id, {
                                  title: mission.title,
                                  description: mission.description,
                                  priority: mission.priority,
                                  status: '已完成',
                                  dueDate: new Date(mission.dueDate).toISOString().split('T')[0],
                                  eventId: mission.eventId,
                                  characterIds: mission.characters?.map((c) => c.characterId) || [],
                                });
                                loadData();
                                alert('任务已标记为完成，事件结论将自动更新');
                              } catch (err: any) {
                                alert(err.response?.data?.message || '操作失败');
                              }
                            }}
                          >
                            ✓ 标记完成
                          </button>
                        )}
                        {isAdmin && mission.status === '已完成' && (
                          <button
                            className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white transition-colors flex-shrink-0"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await missionAPI.update(mission.id, {
                                  title: mission.title,
                                  description: mission.description,
                                  priority: mission.priority,
                                  status: '进行中',
                                  dueDate: new Date(mission.dueDate).toISOString().split('T')[0],
                                  eventId: mission.eventId,
                                  characterIds: mission.characters?.map((c) => c.characterId) || [],
                                });
                                loadData();
                              } catch (err: any) {
                                alert(err.response?.data?.message || '操作失败');
                              }
                            }}
                          >
                            ↺ 重开
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {isAdmin && getEventMissions(selectedEvent.id).length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border)]/50">
                  <p className="text-xs text-[var(--text-secondary)] mb-2">
                    💡 提示：当所有任务标记为"已完成"时，将自动生成事件处置结论
                  </p>
                  {getEventMissions(selectedEvent.id).every((m) => m.status === '已完成') && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-xs text-green-500">
                      ✅ 所有任务已完成！事件处置结论和协作记录已自动回写
                    </div>
                  )}
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--border)]">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDetailModalOpen(false);
                    openModal(selectedEvent);
                  }}
                  className="flex-1 min-w-[100px]"
                >
                  编辑
                </Button>
                <Button
                  className="flex-1 min-w-[120px] bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  onClick={handleAutoUpdateConclusion}
                >
                  ✨ 自动生成结论
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 min-w-[100px]"
                  onClick={() => {
                    if (confirm('确定要删除这个事件吗？')) {
                      handleDelete(selectedEvent.id);
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
        isOpen={levelUpModalOpen}
        onClose={() => setLevelUpModalOpen(false)}
        title="调整角色等级"
      >
        {levelUpChar && selectedEvent && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-2xl">
                  {levelUpChar.avatar || '👤'}
                </div>
                <div>
                  <h3 className="font-bold">{levelUpChar.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{levelUpChar.ability}</p>
                </div>
                <Badge color={charLevelColors[levelUpChar.level] || 'gray'} className="ml-auto">
                  当前: {levelUpChar.level}
                </Badge>
              </div>
            </div>

            <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
              <p className="text-sm text-[var(--text-secondary)] mb-1">关联事件</p>
              <p className="font-medium">{selectedEvent.title}</p>
              <div className="flex gap-2 mt-2">
                <Badge color={typeColors[selectedEvent.type] || 'gray'} className="text-xs">
                  {selectedEvent.type}
                </Badge>
                <Badge color={levelColors[selectedEvent.level] || 'gray'} className="text-xs">
                  {selectedEvent.level}
                </Badge>
              </div>
            </div>

            <SelectField
              label="调整后等级"
              value={levelUpForm.newLevel}
              onChange={(e) => setLevelUpForm({ ...levelUpForm, newLevel: e.target.value })}
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
              label="调整原因"
              value={levelUpForm.reason}
              onChange={(e) => setLevelUpForm({ ...levelUpForm, reason: e.target.value })}
              options={[
                { value: '事件表现优异', label: '事件表现优异' },
                { value: '事件中受伤/降级', label: '事件中受伤/降级' },
                { value: '能力觉醒', label: '能力觉醒' },
                { value: '训练成果', label: '训练成果' },
                { value: '其他原因', label: '其他原因' },
              ]}
            />

            <TextareaField
              label="详细说明"
              value={levelUpForm.description}
              onChange={(e) => setLevelUpForm({ ...levelUpForm, description: e.target.value })}
              placeholder="请输入等级调整的详细说明..."
            />

            <div className="flex gap-4 pt-2">
              <Button
                className="flex-1"
                onClick={handleLevelUp}
              >
                确认调整
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setLevelUpModalOpen(false)}
              >
                取消
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="编辑角色分工"
      >
        {editingRoleChar && selectedEvent && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-2xl">
                  {editingRoleChar.character.avatar || '👤'}
                </div>
                <div>
                  <h3 className="font-bold">{editingRoleChar.character.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{editingRoleChar.character.ability}</p>
                </div>
                <Badge color={charLevelColors[editingRoleChar.character.level] || 'gray'} className="ml-auto">
                  {editingRoleChar.character.level}
                </Badge>
              </div>
            </div>

            <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
              <p className="text-sm text-[var(--text-secondary)] mb-1">关联事件</p>
              <p className="font-medium">{selectedEvent.title}</p>
              <div className="flex gap-2 mt-2">
                <Badge color={typeColors[selectedEvent.type] || 'gray'} className="text-xs">
                  {selectedEvent.type}
                </Badge>
                <Badge color={levelColors[selectedEvent.level] || 'gray'} className="text-xs">
                  {selectedEvent.level}
                </Badge>
              </div>
            </div>

            <InputField
              label="角色分工"
              value={roleForm.role}
              onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}
              placeholder="例如：主攻手、支援、侦察、指挥等"
            />

            <SelectField
              label="任务结果"
              value={roleForm.missionResult}
              onChange={(e) => setRoleForm({ ...roleForm, missionResult: e.target.value })}
              options={[
                { value: '', label: '未填写' },
                { value: '成功', label: '成功' },
                { value: '失败', label: '失败' },
                { value: '进行中', label: '进行中' },
                { value: '部分成功', label: '部分成功' },
              ]}
            />

            <TextareaField
              label="主要贡献"
              value={roleForm.contribution}
              onChange={(e) => setRoleForm({ ...roleForm, contribution: e.target.value })}
              placeholder="描述该角色在事件中的主要贡献和成果..."
              rows={3}
            />

            <TextareaField
              label="协作记录"
              value={roleForm.collaboration}
              onChange={(e) => setRoleForm({ ...roleForm, collaboration: e.target.value })}
              placeholder="描述该角色与其他角色的协作情况..."
              rows={3}
            />

            <div className="flex gap-4 pt-2">
              <Button
                className="flex-1"
                onClick={handleUpdateRole}
              >
                保存分工
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setRoleModalOpen(false)}
              >
                取消
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EventsPage;
