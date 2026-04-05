import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import logoErgon from '@/assets/logo-ergon.png';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check the URL hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'A senha deve ter no mínimo 6 caracteres', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Senha redefinida com sucesso!' });
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err: any) {
      toast({ title: 'Erro ao redefinir senha', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#dde2e8' }}>
        <div
          className="w-full max-w-sm p-8 rounded-[22px] text-center"
          style={{ background: '#dde2e8', boxShadow: '12px 12px 24px #a4afc2, -12px -12px 24px #ffffff' }}
        >
          <img src={logoErgon} alt="Ergon" className="h-16 mx-auto mb-4" />
          <p className="text-sm mb-4" style={{ color: '#4c5563' }}>
            Verificando link de recuperação...
          </p>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-medium hover:underline"
            style={{ color: '#4c5563' }}
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#dde2e8' }}>
      <div
        className="w-full max-w-sm p-8 rounded-[22px] text-center relative"
        style={{ background: '#dde2e8', boxShadow: '12px 12px 24px #a4afc2, -12px -12px 24px #ffffff' }}
      >
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="absolute top-4 left-4 p-2 rounded-full transition-all duration-200 hover:scale-105"
          style={{ boxShadow: '4px 4px 8px #a4afc2, -4px -4px 8px #ffffff' }}
          title="Voltar ao login"
        >
          <ArrowLeft size={16} color="#4c5563" />
        </button>

        <img src={logoErgon} alt="Ergon" className="h-16 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk', color: '#4c5563' }}>
          Redefinir Senha
        </h2>
        <p className="text-sm mb-6" style={{ color: '#8896a8' }}>
          Digite sua nova senha abaixo
        </p>

        <form onSubmit={handleReset} className="space-y-5">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Nova senha (mín. 6 caracteres)"
              className="w-full px-4 py-3 pr-12 text-sm rounded-[22px] border-none outline-none"
              style={{
                background: '#dde2e8',
                boxShadow: 'inset 9px 9px 18px #a4afc2, inset -9px -9px 18px #ffffff',
                color: '#4c5563',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/30 transition-colors"
            >
              {showPassword ? <EyeOff size={16} color="#8896a8" /> : <Eye size={16} color="#8896a8" />}
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirmar nova senha"
            className="w-full px-4 py-3 text-sm rounded-[22px] border-none outline-none"
            style={{
              background: '#dde2e8',
              boxShadow: 'inset 9px 9px 18px #a4afc2, inset -9px -9px 18px #ffffff',
              color: '#4c5563',
            }}
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-[22px] border-none cursor-pointer text-sm font-medium transition-all duration-200 disabled:opacity-50"
            style={{
              background: '#dde2e8',
              boxShadow: '9px 9px 18px #a4afc2, -9px -9px 18px #ffffff',
              color: '#4c5563',
            }}
          >
            {submitting ? 'Redefinindo...' : 'Redefinir Senha'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
