import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';

export interface User {
  id: number;
  username: string;
  full_name: string;
  avatar: string | null;
  about: string;
  wallet: string;
  role: string;
  roles: string[];
  squad_id: number | null;
  team_id: number | null;
  squad_name?: string;
  team_name?: string;
  is_active: number;
  created_at: string;
}

// Parse comma-separated role string into array
function parseRoles(role: string): string[] {
  return role ? role.split(',').map(r => r.trim()).filter(Boolean) : [];
}

// Check if user has at least one of the given roles
export function hasRole(user: User | null, ...roles: string[]): boolean {
  if (!user) return false;
  return roles.some(r => user.roles.includes(r));
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  async function login(username: string, password: string) {
    const data = await api.post<{ token: string; user: User }>('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    const userData = { ...data.user, roles: parseRoles(data.user.role) };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  async function refreshUser() {
    try {
      const data = await api.get<User>('/auth/me');
      const userData = { ...data, roles: parseRoles(data.role) };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch {
      logout();
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
