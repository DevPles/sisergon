import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface Notification {
  id: string;
  type: string;
  title: string;
  description: string | null;
  user_id: string;
  company_id: string | null;
  entity_id: string | null;
  entity_type: string | null;
  priority: 'info' | 'warning' | 'critical';
  status: 'pending' | 'viewed' | 'resolved';
  action_link: string | null;
  created_at: string;
  read_at: string | null;
}

type NotificationChannelEntry = {
  channel: ReturnType<typeof supabase.channel>;
  subscribers: number;
};

const notificationChannelRegistry = new Map<string, NotificationChannelEntry>();

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Notification[];
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter(n => n.status === 'pending').length;

  useEffect(() => {
    if (!userId) return;

    const channelName = `notifications-realtime-${userId}`;
    const existingEntry = notificationChannelRegistry.get(channelName);

    if (existingEntry) {
      existingEntry.subscribers += 1;
    } else {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
          }
        )
        .subscribe();

      notificationChannelRegistry.set(channelName, {
        channel,
        subscribers: 1,
      });
    }

    return () => {
      const entry = notificationChannelRegistry.get(channelName);

      if (!entry) return;

      if (entry.subscribers === 1) {
        notificationChannelRegistry.delete(channelName);
        void supabase.removeChannel(entry.channel);
        return;
      }

      entry.subscribers -= 1;
    };
  }, [queryClient, userId]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'viewed' as any, read_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const markAsResolved = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'resolved' as any } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'viewed' as any, read_at: new Date().toISOString() } as any)
        .eq('user_id', user.id)
        .eq('status', 'pending' as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  return { notifications, unreadCount, isLoading, markAsRead, markAsResolved, markAllAsRead };
};
