import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: '🏠 世界观', exact: true },
    { to: '/characters', label: '👤 角色管理' },
    { to: '/events', label: '📋 事件记录' },
    { to: '/missions', label: '📅 任务日历' },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border)] p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
            ⚡ 异能者管理局
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">华夏区第7分局</p>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-glow)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] pt-4">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white font-bold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{user?.username}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {isAdmin ? '⚔️ 管理员' : '👁️ 观察员'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-[var(--danger)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          >
            🚪 退出登录
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
