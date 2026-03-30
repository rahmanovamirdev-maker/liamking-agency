import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

const POLL_INTERVAL = 15000; // 15 seconds

// Generate a pleasant two-tone notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 587.33; // D5
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second tone (higher, after short pause)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 880; // A5
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.5);
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
