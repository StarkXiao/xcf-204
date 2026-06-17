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
