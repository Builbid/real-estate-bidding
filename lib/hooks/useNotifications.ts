'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '../supabase/client';

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  // The live table uses `body`; older code used `message`. Support both.
  message?: string | null;
  body?: string | null;
  project_id?: string | null;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

/** Returns the human-readable text of a notification regardless of schema. */
export function notificationText(n: AppNotification): string {
  return n.message ?? n.body ?? '';
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const userId = user.id;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      setNotifications((data as AppNotification[]) ?? []);
      setLoading(false);

      // Subscribe after we know userId — server-side filter so only this
      // user's rows arrive; no client-side leakage to other users.
      channel = supabase
        .channel(`notifications-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new as AppNotification, ...prev]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === (payload.new as AppNotification).id
                  ? (payload.new as AppNotification)
                  : n
              )
            );
          }
        )
        .subscribe();
    }

    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const markAllRead = useCallback(async () => {
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  const markRead = useCallback(async (id: string) => {
    const supabase = supabaseRef.current;
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, loading, unreadCount, markAllRead, markRead };
}
