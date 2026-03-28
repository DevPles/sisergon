import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  description: string;
}

const Placeholder = ({ title, description }: Props) => {
  const navigate = useNavigate();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>Voltar</Button>
      </div>
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-lg text-muted-foreground">Este módulo será implementado nas próximas fases.</p>
          <p className="text-sm text-muted-foreground mt-2">A estrutura de banco de dados já está preparada para receber os dados.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Placeholder;
