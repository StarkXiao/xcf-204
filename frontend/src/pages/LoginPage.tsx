import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, InputField } from '../components/FormField';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
        navigate('/');
      } else {
        await register(username, password);
        setIsLogin(true);
        setError('注册成功，请登录');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚡</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] bg-clip-text text-transparent mb-2">
            异能者管理局
          </h1>
          <p className="text-[var(--text-secondary)]">华夏区第7分局 · 协作系统</p>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl">
          <div className="flex mb-6 bg-[var(--bg-tertiary)] rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-md font-medium transition-all ${
                isLogin ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)]'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-md font-medium transition-all ${
                !isLogin ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)]'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <InputField
              label="用户名"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
            <InputField
              label="密码"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '处理中...' : isLogin ? '登 录' : '注 册'}
            </Button>
          </form>

          {isLogin && (
            <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              <p>默认管理员账号: admin / admin123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
