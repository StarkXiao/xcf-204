import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { missionAPI, characterAPI, eventAPI, missionExtensionAPI } from '../api';
import { Mission, Character, Event, MissionExtensionRequest, isAssignableStatus, MissionChangeLog } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { Button, InputField, SelectField, TextareaField } from '../components/FormField';
import Badge from '../components/Badge';

const MissionsPage = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [levelUpModalOpen, setLevelUpModalOpen] = useState(false);
  const [extensionRequestModalOpen, setExtensionRequestModalOpen] = useState(false);
  const [approveExtensionModalOpen, setApproveExtensionModalOpen] = useState(false);
  const [selectedExtensionRequest, setSelectedExtensionRequest] = useState<MissionExtensionRequest | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [levelUpChar, setLevelUpChar] = useState<Character | null>(null);
  const [selectedMissionIds, setSelectedMissionIds] = useState<Set<number>>(new Set());
  const [batchAssignModalOpen, setBatchAssignModalOpen] = useState(false);
  const [batchPriorityModalOpen, setBatchPriorityModalOpen] = useState(false);
  const [batchDueDateModalOpen, setBatchDueDateModalOpen] = useState(false);
  const [changeLogs, setChangeLogs] = useState<MissionChangeLog[]>([]);
  const [showChangeLogs, setShowChangeLogs] = useState(false);
  const [batchAssignForm, setBatchAssignForm] = useState({
    characterIds: [] as number[],
    replaceExisting: false,
  });
  const [batchPriorityForm, setBatchPriorityForm] = useState({ priority: '中' });
  const [batchDueDateForm, setBatchDueDateForm] = useState({ dueDate: '' });
  const [batchLoading, setBatchLoading] = useState(false);
  const [levelUpForm, setLevelUpForm] = useState({
    newLevel: '',
    reason: '',
    description: '',
  });
  const [extensionRequestForm, setExtensionRequestForm] = useState({
    requestedDueDate: '',
    reason: '',
  });
  const [approveForm, setApproveForm] = useState({
    status: '已批准' as '已批准' | '已拒绝',
    approvalComment: '',
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [filters, setFilters] = useState({
    characterStatus: '',
    eventLevel: '',
    priority: '',
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: '中',
    status: '待处理',
    dueDate: '',
    eventId: undefined as number | undefined,
    characterIds: [] as number[],
  });
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const loadData = () => {
    Promise.all([missionAPI.getAll(), characterAPI.getAll(), eventAPI.getAll()]).then(([m, c, e]) => {
      setMissions(m);
      setCharacters(c);
      setEvents(e);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const missionId = searchParams.get('missionId');
    if (missionId && !loading && missions.length > 0) {
      const mission = missions.find((m) => m.id === Number(missionId));
      if (mission && !detailModalOpen) {
        setSelectedMission(mission);
        setDetailModalOpen(true);
      }
    }
  }, [searchParams, missions, loading, detailModalOpen]);

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedMission(null);
    setShowChangeLogs(false);
    searchParams.delete('missionId');
    setSearchParams(searchParams);
  };

  const toggleMissionSelection = (missionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedMissionIds);
    if (newSet.has(missionId)) {
      newSet.delete(missionId);
    } else {
      newSet.add(missionId);
    }
    setSelectedMissionIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedMissionIds.size === filteredMissions.length) {
      setSelectedMissionIds(new Set());
    } else {
      setSelectedMissionIds(new Set(filteredMissions.map((m) => m.id)));
    }
  };

  const clearSelection = () => {
    setSelectedMissionIds(new Set());
  };

  const openBatchAssignModal = () => {
    setBatchAssignForm({ characterIds: [], replaceExisting: false });
    setBatchAssignModalOpen(true);
  };

  const openBatchPriorityModal = () => {
    setBatchPriorityForm({ priority: '中' });
    setBatchPriorityModalOpen(true);
  };

  const openBatchDueDateModal = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setBatchDueDateForm({ dueDate: nextWeek.toISOString().split('T')[0] });
    setBatchDueDateModalOpen(true);
  };

  const handleBatchAssign = async () => {
    if (batchAssignForm.characterIds.length === 0) {
      alert('请至少选择一个角色');
      return;
    }
    setBatchLoading(true);
    try {
      const result = await missionAPI.batchAssignCharacters({
        missionIds: Array.from(selectedMissionIds),
        characterIds: batchAssignForm.characterIds,
        replaceExisting: batchAssignForm.replaceExisting,
      });
      alert(result.message);
      setBatchAssignModalOpen(false);
      clearSelection();
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || '批量操作失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchPriority = async () => {
    setBatchLoading(true);
    try {
      const result = await missionAPI.batchUpdatePriority({
        missionIds: Array.from(selectedMissionIds),
        priority: batchPriorityForm.priority,
      });
      alert(result.message);
      setBatchPriorityModalOpen(false);
      clearSelection();
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || '批量操作失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchDueDate = async () => {
    if (!batchDueDateForm.dueDate) {
      alert('请选择截止日期');
      return;
    }
    setBatchLoading(true);
    try {
      const result = await missionAPI.batchUpdateDueDate({
        missionIds: Array.from(selectedMissionIds),
        dueDate: batchDueDateForm.dueDate,
      });
      alert(result.message);
      setBatchDueDateModalOpen(false);
      clearSelection();
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || '批量操作失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const loadChangeLogs = async (missionId: number) => {
    try {
      const logs = await missionAPI.getChangeLogs(missionId);
      setChangeLogs(logs);
    } catch (err) {
      console.error('加载变更日志失败', err);
    }
  };

  const toggleShowChangeLogs = async () => {
    if (selectedMission && !showChangeLogs) {
      await loadChangeLogs(selectedMission.id);
    }
    setShowChangeLogs(!showChangeLogs);
  };

  const goToCharacterDetail = (characterId: number) => {
    navigate(`/characters?characterId=${characterId}`);
  };

  const goToEventDetail = (eventId: number) => {
    navigate(`/events?eventId=${eventId}`);
  };

  const openLevelUpModal = (char: Character) => {
    setLevelUpChar(char);
    setLevelUpForm({
      newLevel: char.level,
      reason: '任务表现',
      description: '',
    });
    setLevelUpModalOpen(true);
  };

  const handleLevelUp = async () => {
    if (!levelUpChar || !selectedMission) return;
    try {
      await characterAPI.createLevelHistory(levelUpChar.id, {
        oldLevel: levelUpChar.level,
        newLevel: levelUpForm.newLevel,
        reason: levelUpForm.reason,
        description: levelUpForm.description,
        missionId: selectedMission.id,
      });
      setLevelUpModalOpen(false);
      loadData();
      alert('等级调整成功');
    } catch (err: any) {
      alert(err.response?.data?.message || '操作失败');
    }
  };

  const openModal = (mission?: Mission) => {
    if (mission) {
      setEditingMission(mission);
      setFormData({
        title: mission.title,
        description: mission.description,
        priority: mission.priority,
        status: mission.status,
        dueDate: new Date(mission.dueDate).toISOString().split('T')[0],
        eventId: mission.eventId,
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
        eventId: undefined,
        characterIds: [],
      });
    }
    setModalOpen(true);
  };

  const openDetail = (mission: Mission) => {
    setSelectedMission(mission);
    setDetailModalOpen(true);
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

  const openExtensionRequestModal = () => {
    if (!selectedMission) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setExtensionRequestForm({
      requestedDueDate: tomorrow.toISOString().split('T')[0],
      reason: '',
    });
    setExtensionRequestModalOpen(true);
  };

  const handleSubmitExtensionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMission) return;
    try {
      await missionExtensionAPI.create({
        missionId: selectedMission.id,
        requestedDueDate: extensionRequestForm.requestedDueDate,
        reason: extensionRequestForm.reason,
      });
      setExtensionRequestModalOpen(false);
      loadData();
      alert('延期申请已提交，等待审批');
    } catch (err: any) {
      alert(err.response?.data?.message || '提交申请失败');
    }
  };

  const openApproveExtensionModal = (request: MissionExtensionRequest) => {
    setSelectedExtensionRequest(request);
    setApproveForm({
      status: '已批准',
      approvalComment: '',
    });
    setApproveExtensionModalOpen(true);
  };

  const handleApproveExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExtensionRequest) return;
    try {
      const result = await missionExtensionAPI.approve(selectedExtensionRequest.id, {
        status: approveForm.status,
        approvalComment: approveForm.approvalComment,
      });
      setApproveExtensionModalOpen(false);
      setSelectedExtensionRequest(null);
      loadData();
      alert(approveForm.status === '已批准' ? '延期申请已批准' : '延期申请已拒绝');
    } catch (err: any) {
      alert(err.response?.data?.message || '审批失败');
    }
  };

  const getExtensionStatusColor = (status: string): 'gray' | 'yellow' | 'green' | 'red' => {
    switch (status) {
      case '待审批': return 'yellow';
      case '已批准': return 'green';
      case '已拒绝': return 'red';
      default: return 'gray';
    }
  };

  const getMissionCharacters = (missionId: number) => {
    const mission = missions.find((m) => m.id === missionId);
    return mission?.characters?.map((mc) => mc.character) || [];
  };

  const getMissionEvents = (missionId: number) => {
    const mission = missions.find((m) => m.id === missionId);
    if (mission?.event) {
      return [mission.event];
    }
    const missionCharIds = mission?.characters?.map((mc) => mc.characterId) || [];
    return events.filter((e) =>
      e.characters?.some((ec) => missionCharIds.includes(ec.characterId))
    );
  };

  const filteredMissions = missions.filter((mission) => {
    if (filters.priority && mission.priority !== filters.priority) return false;

    if (filters.characterStatus) {
      const missionChars = mission.characters?.map((mc) => mc.character) || [];
      if (!missionChars.some((c) => c.status === filters.characterStatus)) return false;
    }

    if (filters.eventLevel) {
      const missionEvent = mission.event || events.find((e) => e.id === mission.eventId);
      if (!missionEvent || missionEvent.level !== filters.eventLevel) return false;
    }

    return true;
  });

  const hasActiveFilters = filters.characterStatus !== '' || filters.eventLevel !== '' || filters.priority !== '';

  const clearFilters = () => {
    setFilters({ characterStatus: '', eventLevel: '', priority: '' });
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

  const charLevelColors: Record<string, 'purple' | 'red' | 'yellow' | 'blue' | 'gray'> = {
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

  const eventLevelColors: Record<string, 'purple' | 'red' | 'yellow' | 'blue' | 'gray'> = {
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
    return filteredMissions.filter((m) => new Date(m.dueDate).toISOString().split('T')[0] === dateStr);
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

      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span>🔍</span>
            <span className="font-medium">筛选</span>
          </div>
          <select
            value={filters.characterStatus}
            onChange={(e) => setFilters({ ...filters, characterStatus: e.target.value })}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          >
            <option value="">全部角色状态</option>
            <option value="出勤中">出勤中</option>
            <option value="待命">待命</option>
            <option value="疗养">疗养</option>
            <option value="失联">失联</option>
            <option value="重伤">重伤</option>
            <option value="离线">离线</option>
          </select>
          <select
            value={filters.eventLevel}
            onChange={(e) => setFilters({ ...filters, eventLevel: e.target.value })}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          >
            <option value="">全部事件等级</option>
            <option value="S级">S级</option>
            <option value="A级">A级</option>
            <option value="B级">B级</option>
            <option value="C级">C级</option>
            <option value="D级">D级</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          >
            <option value="">全部优先级</option>
            <option value="高">高优先级</option>
            <option value="中">中优先级</option>
            <option value="低">低优先级</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-[var(--accent-primary)] hover:underline whitespace-nowrap"
            >
              清除筛选
            </button>
          )}
          <div className="ml-auto text-sm text-[var(--text-secondary)]">
            共 {filteredMissions.length} / {missions.length} 条任务
          </div>
        </div>
      </div>

      {isAdmin && viewMode === 'list' && (
        <div className={`border rounded-2xl p-4 mb-6 transition-all ${selectedMissionIds.size > 0 ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]' : 'bg-[var(--bg-secondary)] border-[var(--border)]'}`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedMissionIds.size === filteredMissions.length && filteredMissions.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded accent-[var(--accent-primary)]"
              />
              <span className="text-sm font-medium">
                {selectedMissionIds.size > 0
                  ? `已选择 ${selectedMissionIds.size} 个任务`
                  : '全选'}
              </span>
            </div>
            {selectedMissionIds.size > 0 && (
              <>
                <div className="h-6 w-px bg-[var(--border)]" />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openBatchAssignModal}
                  disabled={batchLoading}
                >
                  👥 批量指派角色
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openBatchPriorityModal}
                  disabled={batchLoading}
                >
                  ⚡ 调整优先级
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openBatchDueDateModal}
                  disabled={batchLoading}
                >
                  📅 修改截止日期
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={clearSelection}
                  disabled={batchLoading}
                >
                  取消选择
                </Button>
              </>
            )}
          </div>
        </div>
      )}

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
                            className="text-xs p-1 rounded truncate bg-[var(--accent-primary)]/30 cursor-pointer hover:bg-[var(--accent-primary)]/50"
                            title={mission.title}
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(mission);
                            }}
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
        {filteredMissions.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-secondary)]">
            <p className="text-4xl mb-4">🔍</p>
            <p>没有符合条件的任务</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-[var(--accent-primary)] hover:underline text-sm"
              >
                清除筛选条件
              </button>
            )}
          </div>
        ) : (
          filteredMissions.map((mission) => (
          <div
            key={mission.id}
            className={`bg-[var(--bg-secondary)] border rounded-2xl p-6 hover:border-[var(--accent-primary)] transition-colors cursor-pointer ${selectedMissionIds.has(mission.id) ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30' : 'border-[var(--border)]'}`}
            onClick={() => openDetail(mission)}
          >
            <div className="flex items-start justify-between gap-6">
              {isAdmin && viewMode === 'list' && (
                <div className="flex-shrink-0 mt-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedMissionIds.has(mission.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedMissionIds);
                      if (e.target.checked) {
                        newSet.add(mission.id);
                      } else {
                        newSet.delete(mission.id);
                      }
                      setSelectedMissionIds(newSet);
                    }}
                    className="w-5 h-5 rounded accent-[var(--accent-primary)] cursor-pointer"
                  />
                </div>
              )}
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
            </div>
          </div>
        ))
        )}
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
          <SelectField
            label="关联事件"
            value={formData.eventId?.toString() || ''}
            onChange={(e) => setFormData({ ...formData, eventId: e.target.value ? Number(e.target.value) : undefined })}
            options={[
              { value: '', label: '不关联' },
              ...events.map((event) => ({ value: event.id.toString(), label: `${event.title} (${event.type})` })),
            ]}
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">分配角色</label>
            <div className="mb-2 text-xs text-[var(--text-secondary)]">
              💡 提示：只有"出勤中"和"待命"状态的角色可被指派任务
            </div>
            <div className="flex flex-wrap gap-2">
              {characters.map((char) => {
                const assignable = isAssignableStatus(char.status);
                return (
                  <label
                    key={char.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      !assignable
                        ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed line-through'
                        : formData.characterIds.includes(char.id)
                        ? 'bg-[var(--accent-primary)] text-white cursor-pointer'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border)] cursor-pointer'
                    }`}
                    title={assignable ? '' : `当前状态：${char.status}，不可指派`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.characterIds.includes(char.id)}
                      disabled={!assignable}
                      onChange={(e) => {
                        if (!assignable) return;
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
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      assignable ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {char.status}
                    </span>
                  </label>
                );
              })}
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

      <Modal
        isOpen={detailModalOpen}
        onClose={closeDetailModal}
        title="任务详情"
      >
        {selectedMission && (
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h2 className="text-2xl font-bold">{selectedMission.title}</h2>
                <Badge color={priorityColors[selectedMission.priority] || 'gray'}>
                  {selectedMission.priority}优先级
                </Badge>
                <Badge color={statusColors[selectedMission.status] || 'gray'}>
                  {selectedMission.status}
                </Badge>
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                📅 截止日期: {new Date(selectedMission.dueDate).toLocaleDateString('zh-CN')}
              </div>
            </div>

            <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
              <h3 className="font-medium mb-2">任务描述</h3>
              <p className="text-[var(--text-secondary)] text-sm">{selectedMission.description}</p>
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span>👤</span> 执行角色 ({getMissionCharacters(selectedMission.id).length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getMissionCharacters(selectedMission.id).length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">暂无执行角色</p>
                ) : (
                  getMissionCharacters(selectedMission.id).map((char) => (
                    <div
                      key={char.id}
                      className="bg-[var(--bg-tertiary)] rounded-lg p-3 hover:bg-[var(--border)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-xl cursor-pointer"
                          onClick={() => goToCharacterDetail(char.id)}
                        >
                          {char.avatar || '👤'}
                        </div>
                        <div className="flex-1 cursor-pointer" onClick={() => goToCharacterDetail(char.id)}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{char.name}</span>
                            {char.codeName && (
                              <span className="text-xs text-[var(--text-secondary)]">「{char.codeName}」</span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {char.ability}
                          </div>
                        </div>
                        <Badge color={charLevelColors[char.level] || 'gray'} className="text-xs">
                          {char.level}
                        </Badge>
                        {isAdmin && (
                          <button
                            className="text-xs px-2 py-1 rounded bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLevelUpModal(char);
                            }}
                          >
                            调整等级
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <span>📋</span> 关联事件 ({getMissionEvents(selectedMission.id).length})
                {selectedMission.event && (
                  <span className="text-xs text-[var(--accent-primary)] font-normal">
                    （直接关联）
                  </span>
                )}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {getMissionEvents(selectedMission.id).length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">暂无关联事件</p>
                ) : (
                  getMissionEvents(selectedMission.id).map((event) => (
                    <div
                      key={event.id}
                      className="bg-[var(--bg-tertiary)] rounded-lg p-3 hover:bg-[var(--border)] transition-colors cursor-pointer"
                      onClick={() => goToEventDetail(event.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{event.title}</span>
                        <div className="flex gap-1 flex-wrap justify-end">
                          <Badge color={typeColors[event.type] || 'gray'} className="text-xs">
                            {event.type}
                          </Badge>
                          <Badge color={eventLevelColors[event.level] || 'gray'} className="text-xs">
                            {event.level}
                          </Badge>
                          <Badge color={disposalStatusColors[event.disposalStatus] || 'gray'} className="text-xs">
                            {event.disposalStatus}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        📅 {new Date(event.date).toLocaleDateString('zh-CN')} · 📍 {event.location}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedMission?.extensionRequests && selectedMission.extensionRequests.length > 0 && (
              <div className="border-t border-[var(--border)] pt-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <span>⏰</span> 延期申请记录 ({selectedMission.extensionRequests.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedMission.extensionRequests.map((req) => (
                    <div key={req.id} className="bg-[var(--bg-tertiary)] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{req.applicant.avatar} {req.applicant.name}</span>
                          <Badge color={getExtensionStatusColor(req.status)} className="text-xs">
                            {req.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {new Date(req.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="text-sm text-[var(--text-secondary)] mb-1">
                        原截止: {new Date(req.originalDueDate).toLocaleDateString('zh-CN')} → 
                        申请延期至: {new Date(req.requestedDueDate).toLocaleDateString('zh-CN')}
                      </div>
                      <div className="text-sm mb-2">
                        <span className="text-[var(--text-secondary)]">申请理由: </span>
                        {req.reason}
                      </div>
                      {req.approver && (
                        <div className="text-sm text-[var(--text-secondary)] border-t border-[var(--border)] pt-2 mt-2">
                          <div>审批人: {req.approver.avatar} {req.approver.name}</div>
                          {req.approvalComment && <div>审批意见: {req.approvalComment}</div>}
                          {req.approvedAt && (
                            <div className="text-xs">审批时间: {new Date(req.approvedAt).toLocaleString('zh-CN')}</div>
                          )}
                        </div>
                      )}
                      {isAdmin && req.status === '待审批' && (
                        <button
                          className="mt-2 text-xs px-3 py-1 rounded bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-secondary)] transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            openApproveExtensionModal(req);
                          }}
                        >
                          审批
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--border)]">
              {selectedMission && !isAdmin && selectedMission.status !== '已完成' && selectedMission.status !== '已取消' && (
                <Button
                  variant="secondary"
                  onClick={openExtensionRequestModal}
                >
                  📅 申请延期
                </Button>
              )}
              <Button
                variant={showChangeLogs ? 'primary' : 'secondary'}
                onClick={toggleShowChangeLogs}
              >
                📋 {showChangeLogs ? '隐藏变更日志' : '查看变更日志'}
              </Button>
              {isAdmin && (
                <>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setDetailModalOpen(false);
                      openModal(selectedMission);
                    }}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => {
                      if (confirm('确定要删除这个任务吗？')) {
                        handleDelete(selectedMission!.id);
                        setDetailModalOpen(false);
                      }
                    }}
                  >
                    删除
                  </Button>
                </>
              )}
            </div>

            {showChangeLogs && (
              <div className="border-t border-[var(--border)] pt-4 mt-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <span>📝</span> 变更操作日志
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {changeLogs.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)] py-4 text-center">暂无变更记录</p>
                  ) : (
                    changeLogs.map((log) => (
                      <div key={log.id} className="bg-[var(--bg-tertiary)] rounded-lg p-3 text-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {log.user?.character?.avatar && (
                              <span>{log.user.character.avatar}</span>
                            )}
                            <span className="font-medium">
                              {log.user?.character?.name || log.user?.username || '系统'}
                            </span>
                            <Badge color={
                              log.actionType.includes('ASSIGN') ? 'purple' :
                              log.actionType.includes('PRIORITY') ? 'yellow' :
                              log.actionType.includes('DUEDATE') ? 'blue' : 'gray'
                            } className="text-xs">
                              {log.actionType.includes('BATCH') ? '批量' : ''}
                              {log.actionType.includes('ASSIGN') ? '指派' :
                               log.actionType.includes('PRIORITY') ? '优先级' :
                               log.actionType.includes('DUEDATE') ? '截止日期' : log.actionType}
                            </Badge>
                          </div>
                          <span className="text-xs text-[var(--text-secondary)]">
                            {new Date(log.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        {log.description && (
                          <p className="text-[var(--text-secondary)]">{log.description}</p>
                        )}
                        {!log.description && log.fieldName && (
                          <p className="text-[var(--text-secondary)]">
                            字段 <code className="bg-[var(--bg-primary)] px-1 rounded">{log.fieldName}</code>: 
                            {log.oldValue && <span className="line-through ml-1">{log.oldValue}</span>}
                            {log.oldValue && log.newValue && <span className="mx-2">→</span>}
                            {log.newValue && <span className="text-[var(--accent-primary)] ml-1">{log.newValue}</span>}
                          </p>
                        )}
                        {log.batchId && (
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            批次ID: {log.batchId}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
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
        {levelUpChar && selectedMission && (
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
              <p className="text-sm text-[var(--text-secondary)] mb-1">关联任务</p>
              <p className="font-medium">{selectedMission.title}</p>
              <div className="flex gap-2 mt-2">
                <Badge color={priorityColors[selectedMission.priority] || 'gray'} className="text-xs">
                  {selectedMission.priority}优先级
                </Badge>
                <Badge color={statusColors[selectedMission.status] || 'gray'} className="text-xs">
                  {selectedMission.status}
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
                { value: '任务完成优异', label: '任务完成优异' },
                { value: '任务中受伤/降级', label: '任务中受伤/降级' },
                { value: '任务表现突出', label: '任务表现突出' },
                { value: '能力觉醒', label: '能力觉醒' },
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
        isOpen={extensionRequestModalOpen}
        onClose={() => setExtensionRequestModalOpen(false)}
        title="申请任务延期"
      >
        {selectedMission && (
          <form onSubmit={handleSubmitExtensionRequest} className="space-y-4">
            <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
              <p className="text-sm text-[var(--text-secondary)] mb-1">关联任务</p>
              <p className="font-medium mb-2">{selectedMission.title}</p>
              <div className="flex flex-wrap gap-2">
                <Badge color={priorityColors[selectedMission.priority] || 'gray'} className="text-xs">
                  {selectedMission.priority}优先级
                </Badge>
                <Badge color={statusColors[selectedMission.status] || 'gray'} className="text-xs">
                  {selectedMission.status}
                </Badge>
              </div>
              <div className="mt-3 text-sm">
                <span className="text-[var(--text-secondary)]">当前截止日期: </span>
                <span className="font-medium">{new Date(selectedMission.dueDate).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>

            <InputField
              label="申请延期至"
              type="date"
              value={extensionRequestForm.requestedDueDate}
              onChange={(e) => setExtensionRequestForm({ ...extensionRequestForm, requestedDueDate: e.target.value })}
              required
            />

            <TextareaField
              label="延期理由"
              value={extensionRequestForm.reason}
              onChange={(e) => setExtensionRequestForm({ ...extensionRequestForm, reason: e.target.value })}
              placeholder="请详细说明需要延期的原因..."
              required
            />

            <div className="flex gap-4 pt-2">
              <Button type="submit" className="flex-1">
                提交申请
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setExtensionRequestModalOpen(false)}
              >
                取消
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={approveExtensionModalOpen}
        onClose={() => setApproveExtensionModalOpen(false)}
        title="审批延期申请"
      >
        {selectedExtensionRequest && (
          <form onSubmit={handleApproveExtension} className="space-y-4">
            <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">任务</p>
                <p className="font-medium">{selectedExtensionRequest.mission?.title || '未知任务'}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-lg">
                  {selectedExtensionRequest.applicant.avatar || '👤'}
                </div>
                <div>
                  <p className="font-medium">{selectedExtensionRequest.applicant.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">申请人</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text-secondary)]">原截止日期</p>
                  <p className="font-medium">{new Date(selectedExtensionRequest.originalDueDate).toLocaleDateString('zh-CN')}</p>
                </div>
                <div>
                  <p className="text-[var(--text-secondary)]">申请延期至</p>
                  <p className="font-medium text-[var(--accent-primary)]">{new Date(selectedExtensionRequest.requestedDueDate).toLocaleDateString('zh-CN')}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">申请理由</p>
                <p className="text-sm bg-[var(--bg-primary)] rounded-lg p-3">{selectedExtensionRequest.reason}</p>
              </div>
            </div>

            <SelectField
              label="审批结果"
              value={approveForm.status}
              onChange={(e) => setApproveForm({ ...approveForm, status: e.target.value as '已批准' | '已拒绝' })}
              options={[
                { value: '已批准', label: '批准延期' },
                { value: '已拒绝', label: '拒绝申请' },
              ]}
            />

            <TextareaField
              label="审批意见（可选）"
              value={approveForm.approvalComment}
              onChange={(e) => setApproveForm({ ...approveForm, approvalComment: e.target.value })}
              placeholder="请输入审批意见..."
            />

            <div className="flex gap-4 pt-2">
              <Button
                type="submit"
                className="flex-1"
              >
                确认{approveForm.status === '已批准' ? '批准' : '拒绝'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setApproveExtensionModalOpen(false)}
              >
                取消
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={batchAssignModalOpen}
        onClose={() => setBatchAssignModalOpen(false)}
        title={`批量指派角色 (${selectedMissionIds.size} 个任务)`}
      >
        <div className="space-y-4">
          <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
            <p className="text-sm text-[var(--text-secondary)] mb-1">将对以下任务进行操作</p>
            <p className="font-medium">
              {missions
                .filter((m) => selectedMissionIds.has(m.id))
                .map((m) => m.title)
                .join('、')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">选择角色</label>
            <div className="mb-2 text-xs text-[var(--text-secondary)]">
              💡 提示：只有"出勤中"和"待命"状态的角色可被指派任务
            </div>
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
              {characters.map((char) => {
                const assignable = isAssignableStatus(char.status);
                return (
                  <label
                    key={char.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      !assignable
                        ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed line-through'
                        : batchAssignForm.characterIds.includes(char.id)
                        ? 'bg-[var(--accent-primary)] text-white cursor-pointer'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border)] cursor-pointer'
                    }`}
                    title={assignable ? '' : `当前状态：${char.status}，不可指派`}
                  >
                    <input
                      type="checkbox"
                      checked={batchAssignForm.characterIds.includes(char.id)}
                      disabled={!assignable}
                      onChange={(e) => {
                        if (!assignable) return;
                        if (e.target.checked) {
                          setBatchAssignForm({
                            ...batchAssignForm,
                            characterIds: [...batchAssignForm.characterIds, char.id],
                          });
                        } else {
                          setBatchAssignForm({
                            ...batchAssignForm,
                            characterIds: batchAssignForm.characterIds.filter((id) => id !== char.id),
                          });
                        }
                      }}
                      className="hidden"
                    />
                    <span>{char.avatar}</span>
                    <span className="text-sm">{char.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      assignable ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {char.status}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <input
              type="checkbox"
              id="replaceExisting"
              checked={batchAssignForm.replaceExisting}
              onChange={(e) => setBatchAssignForm({ ...batchAssignForm, replaceExisting: e.target.checked })}
              className="w-4 h-4 rounded accent-[var(--accent-primary)]"
            />
            <label htmlFor="replaceExisting" className="text-sm cursor-pointer">
              <span className="font-medium">替换现有角色</span>
              <span className="text-[var(--text-secondary)] ml-2">（勾选后将移除任务中所有现有角色，仅保留新选择的角色）</span>
            </label>
          </div>

          <div className="flex gap-4 pt-2">
            <Button
              className="flex-1"
              onClick={handleBatchAssign}
              disabled={batchLoading}
            >
              {batchLoading ? '处理中...' : '确认批量指派'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setBatchAssignModalOpen(false)}
              disabled={batchLoading}
            >
              取消
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={batchPriorityModalOpen}
        onClose={() => setBatchPriorityModalOpen(false)}
        title={`批量调整优先级 (${selectedMissionIds.size} 个任务)`}
      >
        <div className="space-y-4">
          <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
            <p className="text-sm text-[var(--text-secondary)] mb-1">将对以下任务进行操作</p>
            <p className="font-medium">
              {missions
                .filter((m) => selectedMissionIds.has(m.id))
                .map((m) => m.title)
                .join('、')}
            </p>
          </div>

          <SelectField
            label="设置优先级"
            value={batchPriorityForm.priority}
            onChange={(e) => setBatchPriorityForm({ priority: e.target.value })}
            options={[
              { value: '高', label: '高优先级' },
              { value: '中', label: '中优先级' },
              { value: '低', label: '低优先级' },
            ]}
          />

          <div className="flex gap-4 pt-2">
            <Button
              className="flex-1"
              onClick={handleBatchPriority}
              disabled={batchLoading}
            >
              {batchLoading ? '处理中...' : '确认调整优先级'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setBatchPriorityModalOpen(false)}
              disabled={batchLoading}
            >
              取消
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={batchDueDateModalOpen}
        onClose={() => setBatchDueDateModalOpen(false)}
        title={`批量修改截止日期 (${selectedMissionIds.size} 个任务)`}
      >
        <div className="space-y-4">
          <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
            <p className="text-sm text-[var(--text-secondary)] mb-1">将对以下任务进行操作</p>
            <p className="font-medium">
              {missions
                .filter((m) => selectedMissionIds.has(m.id))
                .map((m) => `${m.title} (原: ${new Date(m.dueDate).toLocaleDateString('zh-CN')})`)
                .join('、')}
            </p>
          </div>

          <InputField
            label="新截止日期"
            type="date"
            value={batchDueDateForm.dueDate}
            onChange={(e) => setBatchDueDateForm({ dueDate: e.target.value })}
            required
          />

          <div className="flex gap-4 pt-2">
            <Button
              className="flex-1"
              onClick={handleBatchDueDate}
              disabled={batchLoading}
            >
              {batchLoading ? '处理中...' : '确认修改截止日期'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setBatchDueDateModalOpen(false)}
              disabled={batchLoading}
            >
              取消
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MissionsPage;
