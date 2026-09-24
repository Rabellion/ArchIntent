import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader, Wallet } from 'lucide-react';
import axiosInstance from '../../api/axios';

interface NotificationData {
  kind: string;
  title: string;
  message: string;
  action_url?: string;
}

interface AppNotification {
  id: string;
  data: NotificationData;
  read_at: string | null;
  created_at: string;
}

const POLL_INTERVAL_MS = 60_000;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/notifications');
      setItems(res.data?.data?.notifications ?? []);
      setUnread(res.data?.data?.unread_count ?? 0);
      setError('');
    } catch {
      setError('Could not load notifications');
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      await load();
      setLoading(false);
    }
  };

  const openNotification = async (n: AppNotification) => {
    if (!n.read_at) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)));
      setUnread((c) => Math.max(0, c - 1));
      axiosInstance.post(`/notifications/${n.id}/read`).catch(() => load());
    }
    setOpen(false);
    if (n.data.action_url) navigate(n.data.action_url);
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.read_at ? i : { ...i, read_at: now })));
    setUnread(0);
    try {
      await axiosInstance.post('/notifications/read-all');
    } catch {
      load();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
        className={`relative p-3 rounded-2xl transition-all ${open ? 'text-indigo-400 bg-slate-800' : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800'}`}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-2 right-2 min-w-[1rem] h-4 px-1 bg-indigo-600 text-white text-[8px] font-black rounded-md flex items-center justify-center border-2 border-slate-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-[22rem] max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto custom-scrollbar">
            {loading && items.length === 0 ? (
              <div className="flex justify-center py-10">
                <Loader className="w-5 h-5 animate-spin text-slate-500" />
              </div>
            ) : error && items.length === 0 ? (
              <p className="px-5 py-8 text-center text-xs font-bold text-rose-300">{error}</p>
            ) : items.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell className="w-6 h-6 text-slate-600 mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No notifications yet</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  className={`w-full text-left flex gap-3 px-5 py-4 border-b border-slate-800/70 last:border-b-0 transition-colors hover:bg-slate-800/60 ${n.read_at ? '' : 'bg-indigo-950/30'}`}
                >
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-emerald-950/70 border border-emerald-800/50 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-slate-100 truncate">{n.data.title}</p>
                      {!n.read_at && <span className="w-2 h-2 shrink-0 rounded-full bg-indigo-500" aria-label="Unread" />}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">{n.data.message}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
