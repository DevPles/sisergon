import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const priorityConfig = {
  info: { label: 'ℹ', className: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  warning: { label: '⚠', className: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  critical: { label: '!', className: 'text-destructive', bg: 'bg-red-50 dark:bg-red-950/30' },
};

const NotificationItem = ({ notification, onRead, onNavigate }: {
  notification: Notification;
  onRead: (id: string) => void;
  onNavigate: (link: string) => void;
}) => {
  const config = priorityConfig[notification.priority];

  const isPending = notification.status === 'pending';

  return (
    <div
      className={cn('p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors', isPending && config.bg)}
      onClick={() => {
        if (isPending) onRead(notification.id);
        if (notification.action_link) onNavigate(notification.action_link);
      }}
    >
      <div className="flex items-start gap-2">
        <span className={cn('text-sm mt-0.5 shrink-0 font-bold', config.className)}>{config.label}</span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm', isPending ? 'font-semibold' : 'font-normal')}>{notification.title}</p>
          {notification.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.description}</p>}
          <p className="text-[10px] text-muted-foreground mt-1">
            {new Date(notification.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {isPending && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}>
            ✓
          </Button>
        )}
      </div>
    </div>
  );
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen(!open)}>
🔔
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="text-sm font-semibold">Notificações</span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => markAllAsRead.mutate()}>
                Marcar todas como lidas
              </Button>
            )}
          </div>
          <ScrollArea className="max-h-80">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem notificações</p>
            ) : (
              notifications.slice(0, 20).map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={(id) => markAsRead.mutate(id)}
                  onNavigate={(link) => { setOpen(false); navigate(link); }}
                />
              ))
            )}
          </ScrollArea>
          <div className="p-2 border-t">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setOpen(false); navigate('/notificacoes'); }}>
              Ver todas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
