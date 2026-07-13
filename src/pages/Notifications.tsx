import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, CircleDot } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import { emitStoreUpdate, STORE_UPDATED_EVENT } from "@/hooks/use-live-data";
import { store, AppNotification } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import {
  apiGetNotifications,
  apiMarkAllNotificationsRead,
  apiMarkNotificationRead,
  ApiNotificationItem,
} from "@/lib/api";

const formatTime = (value: string) => {
  const date = new Date(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const typeTone = (type: AppNotification["type"]) => {
  if (type === "success") return "text-emerald-600";
  if (type === "warning") return "text-amber-600";
  return "text-sky-600";
};

const toAppNotification = (item: ApiNotificationItem, idx: number): AppNotification => {
  const normalizedType: AppNotification["type"] =
    item.type === "success" || item.type === "warning" ? item.type : "info";
  const createdAt = item.createdAt || item.created_at || new Date().toISOString();
  const read = Boolean(item.read || item.is_read || item.read_at);

  return {
    id: String(item.id ?? `api-${idx}-${createdAt}`),
    title: item.title?.trim() || "Notification",
    message: item.message?.trim() || item.body?.trim() || "No details provided.",
    createdAt,
    type: normalizedType,
    read,
  };
};

const mergeNotifications = (local: AppNotification[], remote: AppNotification[]): AppNotification[] => {
  const map = new Map<string, AppNotification>();
  [...local, ...remote].forEach((item) => {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      return;
    }
    map.set(item.id, {
      ...existing,
      ...item,
      read: existing.read && item.read,
    });
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

const Notifications = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const list = await apiGetNotifications();
        const mapped = list.map(toAppNotification);
        const merged = mergeNotifications(store.getNotifications(), mapped);
        setItems(merged);
        setSelectedId((prev) => prev || merged[0]?.id || "");
        store.saveNotifications(merged);
        emitStoreUpdate();
      } catch {
        const local = store.getNotifications();
        setItems(local);
        setSelectedId((prev) => prev || local[0]?.id || "");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleStoreUpdate = () => {
      const local = store.getNotifications();
      setItems(local);
      setSelectedId((prev) => prev || local[0]?.id || "");
    };

    window.addEventListener(STORE_UPDATED_EVENT, handleStoreUpdate);
    return () => window.removeEventListener(STORE_UPDATED_EVENT, handleStoreUpdate);
  }, []);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0],
    [items, selectedId],
  );

  const unreadCount = items.filter((item) => !item.read).length;

  const persist = (next: AppNotification[]) => {
    setItems(next);
    store.saveNotifications(next);
    emitStoreUpdate();
  };

  const markAsRead = (id: string) => {
    const next = items.map((item) => (item.id === id ? { ...item, read: true } : item));
    persist(next);
    if (store.getBusinessProfile().isOnline) {
      apiMarkNotificationRead(id).catch(() => {
        // local update already applied; backend sync can retry later
      });
    }
  };

  const markAllAsRead = () => {
    const next = items.map((item) => ({ ...item, read: true }));
    persist(next);
    if (store.getBusinessProfile().isOnline) {
      apiMarkAllNotificationsRead().catch(() => {
        // local update already applied; backend sync can retry later
      });
    }
    toast({ title: "Notifications Updated", description: "All notifications marked as read." });
  };

  return (
    <div className="min-h-screen bg-background pb-nav">
      <PageHeader
        title="Notifications"
        rightAction={
          <button
            onClick={markAllAsRead}
            className="text-xs font-semibold text-primary flex items-center gap-1"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <p className="font-semibold">Notification Center</p>
              <p className="text-xs text-muted-foreground">{unreadCount} unread message(s)</p>
            </div>
          </div>
        </div>

        {selected && (
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="font-bold text-sm">Preview</p>
              <span className={`text-xs font-medium ${typeTone(selected.type)}`}>{selected.type.toUpperCase()}</span>
            </div>
            <p className="font-semibold text-base leading-tight">{selected.title}</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{selected.message}</p>
            <p className="text-xs text-muted-foreground mt-3">{formatTime(selected.createdAt)}</p>
          </div>
        )}

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading && (
            <div className="p-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-3 h-3 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              Fetching real-time notifications...
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="p-5 text-sm text-muted-foreground text-center">
              <p>No new notifications.</p>
              <p className="text-xs mt-1">Notifications will appear here in real-time.</p>
            </div>
          )}

          {items.map((item) => {
            const active = selected?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id);
                  if (!item.read) markAsRead(item.id);
                }}
                className={`w-full p-4 border-b border-border last:border-0 text-left transition-colors ${
                  active ? "bg-muted/60" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <CircleDot size={14} className={`mt-1 ${item.read ? "text-muted-foreground" : "text-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-sm truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground whitespace-nowrap">{formatTime(item.createdAt)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.message}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;