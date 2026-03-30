import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api/client';

interface NotificationContextType {
  unreadCount: number;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextType>({ unreadCount: 0, refresh: () => {} });

export function useNotifications() {
  return useContext(NotificationContext);
}

const POLL_INTERVAL = 10000; // 10 seconds

// Shared AudioContext — created once on first user interaction
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Initialize AudioContext on first user click/touch
function initAudioOnInteraction() {
  const handler = () => {
    getAudioContext();
    document.removeEventListener('click', handler);
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('click', handler);
  document.addEventListener('touchstart', handler);
  document.addEventListener('keydown', handler);
}

function playNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.frequency.value = 587.33;
  osc1.type = 'sine';
  gain1.gain.setValueAtTime(0.35, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
  osc1.start(now);
  osc1.stop(now + 0.25);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.frequency.value = 880;
  osc2.type = 'sine';
  gain2.gain.setValueAtTime(0.35, now + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.5);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCountRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get<{ count: number }>('/notifications/unread-count');
      setUnreadCount(data.count);
      if (lastCountRef.current !== null && data.count > lastCountRef.current) {
        playNotificationSound();
      }
      lastCountRef.current = data.count;
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      lastCountRef.current = null;
      return;
    }

    initAudioOnInteraction();
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [user, refresh]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}
