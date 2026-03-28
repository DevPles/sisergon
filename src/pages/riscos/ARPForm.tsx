import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ARPFormFields from './components/ARPFormFields';

const ARPForm = () => {
  const { id } = useParams();
  const isEdit = !!id && id !== 'nova';
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? 'Editar ARP' : 'Nova Avaliação Psicossocial'}</h1>
          <p className="text-muted-foreground">Fatores psicossociais e organizacionais</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/riscos-psicossociais')}>Voltar</Button>
      </div>
      <ARPFormFields
        assessmentId={isEdit ? id : undefined}
        onSaved={() => navigate('/riscos-psicossociais')}
        onCancel={() => navigate('/riscos-psicossociais')}
      />
    </div>
  );
};

export default ARPForm;
