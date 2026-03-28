import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const priorityConfig = {
  info: { label: 'Informativo', badgeClass: 'bg-blue-100 text-blue-700' },
  warning: { label: 'Atenção', badgeClass: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Crítico', badgeClass: 'bg-red-100 text-red-700' },
};
const statusLabels: Record<string, string> = { pending: 'Pendente', viewed: 'Lida', resolved: 'Resolvida' };

const NotificacoesPage = () => {
  const { notifications, unreadCount, markAsRead, markAsResolved, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const filtered = notifications.filter(n => {
    if (filterStatus !== 'all' && n.status !== filterStatus) return false;
    if (filterPriority !== 'all' && n.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notificações</h1>
          <Badge>{unreadCount} não lidas</Badge>
        </div>
        {unreadCount > 0 && <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>Marcar todas como lidas</Button>}
      </div>
      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pending">Pendentes</SelectItem><SelectItem value="viewed">Lidas</SelectItem><SelectItem value="resolved">Resolvidas</SelectItem></SelectContent></Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="info">Informativo</SelectItem><SelectItem value="warning">Atenção</SelectItem><SelectItem value="critical">Crítico</SelectItem></SelectContent></Select>
      </div>
      {filtered.length === 0 ? <p className="text-center text-muted-foreground py-12">Nenhuma notificação encontrada</p> : filtered.map(n => {
        const config = priorityConfig[n.priority];
        return (
          <Card key={n.id} className={cn(n.status === 'pending' && 'border-primary/30')}>
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={config.badgeClass}>{config.label}</Badge>
                  <Badge variant="outline">{statusLabels[n.status]}</Badge>
                </div>
                <p className="font-medium text-sm">{n.title}</p>
                {n.description && <p className="text-xs text-muted-foreground mt-1">{n.description}</p>}
                <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <div className="flex gap-1">
                {n.status === 'pending' && <Button size="sm" variant="outline" onClick={() => markAsRead.mutate(n.id)}>Marcar lida</Button>}
                {n.status !== 'resolved' && <Button size="sm" variant="outline" onClick={() => markAsResolved.mutate(n.id)}>Resolver</Button>}
                {n.action_link && <Button size="sm" onClick={() => navigate(n.action_link!)}>Ir</Button>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
export default NotificacoesPage;
