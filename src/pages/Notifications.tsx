import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNotifications } from '../contexts/NotificationContext';
import toast from 'react-hot-toast';
import { Bell, Check, CheckCheck, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { refresh } = useNotifications();

  useEffect(() => { loadNotifications(); }, []);

  async function loadNotifications() {
    try {
      const data = await api.get<any[]>('/notifications');
      setNotifications(data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function markAsRead(id: number) {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      refresh();
    } catch { /* ignore */ }
  }

  async function markAllRead() {
    try {
      await api.put('/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      refresh();
      toast.success('Все прочитано');
    } catch { /* ignore */ }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <div className="text-center py-10 text-dark-400">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="text-primary-400" size={28} />
          <h1 className="text-2xl font-bold text-white">Уведомления</h1>
          {unreadCount > 0 && (
            <span className="badge bg-primary-600/20 text-primary-400">{unreadCount} новых</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary flex items-center gap-2 text-sm">
            <CheckCheck size={16} /> Прочитать все
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card text-center text-dark-400 py-10">Нет уведомлений</div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id}
              className={`card py-3 px-4 flex items-start gap-3 transition ${
                !n.is_read ? 'border-primary-500/30 bg-primary-600/5' : ''
              }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                !n.is_read ? 'bg-primary-600/20 text-primary-400' : 'bg-dark-700 text-dark-400'
              }`}>
                <FileText size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm">{n.title}</p>
                <p className="text-sm text-dark-400 mt-0.5">{n.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-dark-500">{new Date(n.created_at).toLocaleString('ru')}</span>
                  {n.application_id && (
                    <Link to={`/applications/${n.application_id}`} className="text-xs text-primary-400 hover:underline">
                      Открыть анкету
                    </Link>
                  )}
                </div>
              </div>
              {!n.is_read && (
                <button onClick={() => markAsRead(n.id)} className="p-1 text-dark-400 hover:text-primary-400 transition" title="Прочитано">
                  <Check size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
