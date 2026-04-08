import { create } from 'zustand';
import { User } from './types';

type ActiveView = 'chu-dau-tu' | 'nha-thau';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  activeView: ActiveView;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setActiveView: (view: ActiveView) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  activeView: 'chu-dau-tu',
  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isLoading: false });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeView');
    set({ token: null, user: null, isLoading: false, activeView: 'chu-dau-tu' });
  },
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setActiveView: (view) => {
    localStorage.setItem('activeView', view);
    set({ activeView: view });
  },
  hydrate: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const savedView = (localStorage.getItem('activeView') as ActiveView) || 'chu-dau-tu';
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user, isLoading: false, activeView: savedView });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
