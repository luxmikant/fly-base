import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing token on app start
    const token = apiClient.loadToken();
    if (token) {
      // In a real app, you'd validate the token with the server
      // For now, we'll create a mock user
      setUser({
        id: 'user-1',
        email: 'j.smith@flytbase.com',
        name: 'J. Smith',
        role: 'OPERATOR',
        orgId: 'org-1',
      });
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // For development, use mock authentication
      if (import.meta.env.VITE_ENABLE_MOCK_DATA === 'true') {
        // Mock successful login
        const mockToken = 'mock-jwt-token-' + Date.now();
        apiClient.setToken(mockToken);
        
        setUser({
          id: 'user-1',
          email,
          name: 'J. Smith',
          role: 'OPERATOR',
          orgId: 'org-1',
        });
      } else {
        // Real authentication
        const response = await apiClient.login(email, password);
        setUser(response.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      if (import.meta.env.VITE_ENABLE_MOCK_DATA !== 'true') {
        await apiClient.logout();
      }
      
      apiClient.clearToken();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}