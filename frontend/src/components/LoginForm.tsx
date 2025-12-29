import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function LoginForm() {
  const [email, setEmail] = useState('operator@flytbase.com');
  const [password, setPassword] = useState('password123');
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1D23] flex items-center justify-center">
      <div className="bg-[#2A2D35] p-8 rounded-lg border border-white/10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">DRONE COMMAND</h1>
          <p className="text-[#A0AEC0]">Mission Control System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#A0AEC0] mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1D23] border border-white/20 rounded text-white placeholder-[#A0AEC0] focus:outline-none focus:border-[#00FF88] focus:ring-1 focus:ring-[#00FF88]"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#A0AEC0] mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#1A1D23] border border-white/20 rounded text-white placeholder-[#A0AEC0] focus:outline-none focus:border-[#00FF88] focus:ring-1 focus:ring-[#00FF88]"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-[#00FF88] text-black font-medium rounded hover:bg-[#00FF88]/90 focus:outline-none focus:ring-2 focus:ring-[#00FF88] focus:ring-offset-2 focus:ring-offset-[#2A2D35] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-[#A0AEC0]">
            Development Mode: Use any email/password combination
          </p>
        </div>
      </div>
    </div>
  );
}