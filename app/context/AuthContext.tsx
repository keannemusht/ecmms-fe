'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api';

export type Role = 'ADMIN' | 'MANAGEMENT' | 'USER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId?: string | null;
  employee?: {
    id: string;
    nik: string;
    name: string;
    department: string;
    position: string;
    employmentType: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day

function setUserCookie(user: User) {
  document.cookie = `ecmms_user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${USER_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearUserCookie() {
  document.cookie = 'ecmms_user=; path=/; max-age=0; SameSite=Lax';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    api
      .get('/auth/me')
      .then((res) => {
        if (cancelled) return;
        setUser(res.data);
        setToken(res.data.token ?? null);
        setUserCookie(res.data);
      })
      .catch(() => {
        // 401 is handled by the api interceptor; stay logged out.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;

    setToken(newToken);
    setUser(newUser);
    setUserCookie(newUser);
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    setToken(null);
    setUser(null);
    clearUserCookie();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
