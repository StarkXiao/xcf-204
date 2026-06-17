import { useEffect, useState } from 'react';
import { worldviewAPI, characterAPI, eventAPI, missionAPI } from '../api';
import { Worldview, Character, Event, Mission } from '../types';
import Badge from '../components/Badge';

const HomePage = () => {
  const [worldview, setWorldview] = useState<Worldview | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      worldviewAPI.get(),
      characterAPI.getAll(),
      eventAPI.getAll(),
      missionAPI.getAll(),
    ]).then(([w, c, e, m]) => {
      setWorldview(w);
      setCharacters(c);
      setEvents(e);
      setMissions(m);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const getLast7Days = () => {
    const days: { date: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      days.push({ date: dateStr, label });
    }
    return days;
  };

  const last7Days = getLast7Days();
  const eventTrendData = last7Days.map(({ date, label }) => {
    const count = events.filter((e) => {
      const eventDate = new Date(e.date).toISOString().split('T')[0];
      return eventDate === date;
    }).length;
    const missionCount = missions.filter((m) => {
      const missionDate = new Date(m.createdAt).toISOString().split('T')[0];
      return missionDate === date;
    }).length;
    return { label, events: count, missions: missionCount, total: count + missionCount };
  });
  const maxTrendValue = Math.max(...eventTrendData.map((d) => d.total), 1);

  const characterActivity = characters
    .map((char) => {
      const eventCount = (char.events || []).length;
      const missionCount = (char.missions || []).length;
      const activeMissions = (char.missions || []).filter((m) => m.mission.status === '进行中').length;
      return {
        ...char,
        eventCount,
        missionCount,
        activeMissions,
        totalActivity: eventCount + missionCount,
      };
    })
    .sort((a, b) => b.totalActivity - a.totalActivity)
    .slice(0, 5);
  const maxActivity = Math.max(...characterActivity.map((c) => c.totalActivity), 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);

  const urgentMissions = missions.filter((m) => {
    if (m.status === '已完成') return false;
    const due = new Date(m.dueDate);
    return due <= in3Days;
  });

  const pendingHighLevelEvents = events.filter((e) => {
    if (e.disposalStatus === '已完成' || e.disposalStatus === '已取消') return false;
    return ['S级', 'A级'].includes(e.level);
  });

  const idleActiveCharacters = characters.filter((c) => {
    if (c.status !== '活跃') return false;
    const missionCount = (c.missions || []).filter((m) => m.mission.status === '进行中').length;
    return missionCount === 0;
  });

  const todoWarnings = [
    ...urgentMissions.map((m) => ({
      type: 'mission' as const,
      id: `mission-${m.id}`,
      title: m.title,
      priority: m.priority,
      level: null,
      status: m.status,
      dueDate: m.dueDate,
      message: `任务截止日期临近`,
    })),
    ...pendingHighLevelEvents.map((e) => ({
      type: 'event' as const,
      id: `event-${e.id}`,
      title: e.title,
      priority: null,
      level: e.level,
      status: e.disposalStatus,
      dueDate: e.date,
      message: `${e.level}事件待处置`,
    })),
    ...idleActiveCharacters.map((c) => ({
      type: 'character' as const,
      id: `character-${c.id}`,
      title: c.name,
      priority: null,
      level: c.level,
      status: c.status,
      dueDate: null,
      message: '活跃角色暂无任务分配',
    })),
  ].sort((a, b) => {
    const levelOrder: Record<string, number> = { S级: 0, 'A级': 1, 'B级': 2, 'C级': 3, 'D级': 4 };
    const priorityOrder: Record<string, number> = { 高: 0, 中: 1, 低: 2 };
    if (a.level && b.level) return levelOrder[a.level] - levelOrder[b.level];
    if (a.priority && b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
    return 0;
  });

  const stats = [
    { label: '注册异能者', value: characters.length, icon: '👤', color: 'purple' as const },
    { label: '事件记录', value: events.length, icon: '📋', color: 'blue' as const },
    { label: '进行中任务', value: missions.filter(m => m.status === '进行中').length, icon: '📅', color: 'yellow' as const },
    { label: '活跃角色', value: characters.filter(c => c.status === '活跃').length, icon: '⚡', color: 'green' as const },
  ];

  const disposalStats = [
    { label: '待处置', value: events.filter(e => e.disposalStatus === '待处置').length, color: 'gray' as const },
    { label: '处置中', value: events.filter(e => e.disposalStatus === '处置中').length, color: 'blue' as const },
    { label: '已完成', value: events.filter(e => e.disposalStatus === '已完成').length, color: 'green' as const },
    { label: '已取消', value: events.filter(e => e.disposalStatus === '已取消').length, color: 'gray' as const },
  ];

  const levelColors: Record<string, 'purple' | 'red' | 'yellow' | 'blue' | 'gray'> = {
    'S级': 'purple',
    'A级': 'red',
    'B级': 'yellow',
    'C级': 'blue',
    'D级': 'gray',
  };

  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
          {worldview?.title}
        </h1>
        <div className="max-w-3xl mx-auto text-[var(--text-secondary)] leading-relaxed whitespace-pre-line bg-[var(--bg-secondary)] p-8 rounded-2xl border border-[var(--border)]">
          {worldview?.setting}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent-primary)] transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">{stat.icon}</span>
              <Badge color={stat.color}>{stat.label}</Badge>
            </div>
            <p className="text-4xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span>📊</span> 事件处置状态统计
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {disposalStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-[var(--bg-tertiary)] rounded-xl p-4 text-center hover:bg-[var(--border)] transition-colors"
            >
              <Badge color={stat.color} className="mb-3">{stat.label}</Badge>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span>📈</span> 近七天事件趋势
        </h2>
        <div className="flex items-end justify-between gap-3 h-48 mb-4 px-2">
          {eventTrendData.map((data, idx) => {
            const totalHeight = (data.total / maxTrendValue) * 100;
            const eventHeight = data.total > 0 ? (data.events / data.total) * 100 : 0;
            const missionHeight = data.total > 0 ? (data.missions / data.total) * 100 : 0;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs text-[var(--text-secondary)] font-medium">{data.total}</div>
                <div className="w-full flex flex-col justify-end gap-0.5 h-40">
                  {data.missions > 0 && (
                    <div
                      className="w-full rounded-t-md transition-all duration-500"
                      style={{
                        height: `${missionHeight}%`,
                        backgroundColor: 'var(--accent-secondary)',
                        minHeight: data.missions > 0 ? '4px' : '0',
                      }}
                      title={`任务: ${data.missions}`}
                    />
                  )}
                  {data.events > 0 && (
                    <div
                      className="w-full rounded-b-md transition-all duration-500"
                      style={{
                        height: `${eventHeight}%`,
                        backgroundColor: 'var(--accent-primary)',
                        minHeight: data.events > 0 ? '4px' : '0',
                      }}
                      title={`事件: ${data.events}`}
                    />
                  )}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">{data.label}</div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-6 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--accent-primary)' }} />
            <span className="text-sm text-[var(--text-secondary)]">事件</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--accent-secondary)' }} />
            <span className="text-sm text-[var(--text-secondary)]">任务</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span>🏆</span> 活跃角色排行
          </h2>
          <div className="space-y-4">
            {characterActivity.map((char, idx) => {
              const progressPercent = (char.totalActivity / maxActivity) * 100;
              const rankColors = ['#fbbf24', '#a1a1aa', '#d97706'];
              return (
                <div
                  key={char.id}
                  className="p-4 bg-[var(--bg-tertiary)] rounded-xl hover:bg-[var(--border)] transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: idx < 3 ? rankColors[idx] : 'var(--bg-tertiary)',
                        color: idx < 3 ? '#000' : 'var(--text-secondary)',
                        border: idx >= 3 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-xl">
                      {char.avatar || '👤'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{char.name}</p>
                        {char.codeName && (
                          <span className="text-xs text-[var(--text-secondary)]">「{char.codeName}」</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[var(--text-secondary)]">
                          📋 {char.eventCount} 事件
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          📅 {char.missionCount} 任务
                        </span>
                      </div>
                    </div>
                    <Badge color={levelColors[char.level] || 'gray'}>{char.level}</Badge>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {characterActivity.length === 0 && (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                暂无活跃角色数据
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span>⚠️</span> 待办预警
            {todoWarnings.length > 0 && (
              <Badge color="red">{todoWarnings.length} 项待处理</Badge>
            )}
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {todoWarnings.map((item) => {
              const typeIcon = item.type === 'mission' ? '📅' : item.type === 'event' ? '📋' : '👤';
              const typeLabel = item.type === 'mission' ? '任务' : item.type === 'event' ? '事件' : '角色';
              const urgencyColor =
                item.level === 'S级' || item.priority === '高'
                  ? 'var(--danger)'
                  : item.level === 'A级' || item.priority === '中'
                  ? 'var(--warning)'
                  : 'var(--accent-primary)';
              return (
                <div
                  key={item.id}
                  className="p-4 bg-[var(--bg-tertiary)] rounded-xl hover:bg-[var(--border)] transition-colors border-l-4"
                  style={{ borderLeftColor: urgencyColor }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{typeIcon}</span>
                      <Badge color={item.type === 'mission' ? 'yellow' : item.type === 'event' ? 'blue' : 'purple'}>
                        {typeLabel}
                      </Badge>
                      {item.level && (
                        <Badge color={levelColors[item.level] || 'gray'}>{item.level}</Badge>
                      )}
                      {item.priority && (
                        <Badge color={item.priority === '高' ? 'red' : item.priority === '中' ? 'yellow' : 'blue'}>
                          {item.priority}优先级
                        </Badge>
                      )}
                    </div>
                    {item.status && (
                      <Badge color={
                        item.status === '进行中' || item.status === '处置中' ? 'green' :
                        item.status === '已完成' ? 'purple' : 'gray'
                      }>
                        {item.status}
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium mb-1">{item.title}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{item.message}</span>
                    {item.dueDate && (
                      <span className="text-[var(--text-secondary)]">
                        {item.type === 'mission' ? '截止' : '发生'}: {new Date(item.dueDate).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {todoWarnings.length === 0 && (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                <span className="text-4xl block mb-2">✅</span>
                暂无待办预警，一切正常
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span>👤</span> 异能者档案
          </h2>
          <div className="space-y-4">
            {characters.slice(0, 5).map((char) => (
              <div
                key={char.id}
                className="flex items-center gap-4 p-4 bg-[var(--bg-tertiary)] rounded-xl hover:bg-[var(--border)] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-2xl">
                  {char.avatar || '👤'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{char.name}</p>
                    {char.codeName && (
                      <span className="text-xs text-[var(--text-secondary)]">「{char.codeName}」</span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{char.ability}</p>
                </div>
                <Badge color={levelColors[char.level] || 'gray'}>{char.level}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span>📅</span> 近期任务
          </h2>
          <div className="space-y-4">
            {missions.slice(0, 5).map((mission) => (
              <div
                key={mission.id}
                className="p-4 bg-[var(--bg-tertiary)] rounded-xl hover:bg-[var(--border)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="font-medium flex-1">{mission.title}</p>
                  <Badge color={mission.priority === '高' ? 'red' : mission.priority === '中' ? 'yellow' : 'blue'}>
                    {mission.priority}优先级
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">
                    截止: {new Date(mission.dueDate).toLocaleDateString('zh-CN')}
                  </span>
                  <Badge color={mission.status === '进行中' ? 'green' : mission.status === '已完成' ? 'purple' : 'gray'}>
                    {mission.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
