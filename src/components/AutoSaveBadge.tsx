import { Badge } from '@/components/ui/badge';

interface AutoSaveBadgeProps {
  lastSaved: Date | null;
  recovered?: boolean;
}

const AutoSaveBadge = ({ lastSaved, recovered }: AutoSaveBadgeProps) => {
  if (!lastSaved && !recovered) return null;

  return (
    <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-muted animate-fade-in">
      {recovered
        ? '🔄 Rascunho recuperado'
        : `💾 Salvo ${lastSaved?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      }
    </Badge>
  );
};

export default AutoSaveBadge;
