import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

const POLL_INTERVAL = 15000; // 15 seconds

// Generate a simple notification beep using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio not available
  }
}

export function useNotificationSound() {
  const { user } = useAuth();
  const lastCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    let active = true;

    async function check() {
      try {
        const data = await api.get<{ count: number }>('/notifications/unread-count');
        if (!active) return;
        if (lastCountRef.current !== null && data.count > lastCountRef.current) {
          playNotificationSound();
        }
        lastCountRef.current = data.count;
      } catch {
        // ignore
      }
    }

    check();
    const interval = setInterval(check, POLL_INTERVAL);
    return () => { active = false; clearInterval(interval); };
  }, [user]);
}
