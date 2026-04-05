import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import logoErgon from '@/assets/logo-ergon.png';

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Erro ao entrar', description: error.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: 'Digite seu e-mail', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'E-mail enviado', description: 'Verifique sua caixa de entrada para redefinir a senha.' });
      setIsForgotPassword(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Acesso por convite',
      description: 'O cadastro é feito pelo administrador do sistema. Solicite um convite ao seu gestor.',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#dde2e8' }}>
      <div className="w-full max-w-4xl h-[540px] rounded-[22px] overflow-hidden relative" style={{ background: '#dde2e8', boxShadow: '12px 12px 24px #a4afc2, -12px -12px 24px #ffffff' }}>
        
        {/* ===== FORGOT PASSWORD FORM (left side) ===== */}
        {isForgotPassword && (
          <div
            className="absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center p-8 sm:p-12 z-10 animate-fade-in"
            style={{ background: '#dde2e8' }}
          >
            <div
              className="w-full max-w-sm p-8 rounded-[22px] text-center relative"
              style={{ background: '#dde2e8', boxShadow: '12px 12px 24px #a4afc2, -12px -12px 24px #ffffff' }}
            >
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="absolute top-4 left-4 p-2 rounded-full transition-all duration-200 hover:scale-105"
                style={{ boxShadow: '4px 4px 8px #a4afc2, -4px -4px 8px #ffffff' }}
              >
                <ArrowLeft size={16} color="#4c5563" />
              </button>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk', color: '#4c5563' }}>
                Recuperar Senha
              </h2>
              <p className="text-xs mb-5" style={{ color: '#8896a8' }}>
                Informe seu e-mail para receber o link de redefinição
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="E-mail"
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
                  {submitting ? 'Enviando...' : 'Enviar Link'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ===== SIGN IN FORM (left side) — Neumorphic ===== */}
        <div
          className={`absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center p-8 sm:p-12 transition-all duration-700 ease-in-out ${
            isSignUp || isForgotPassword ? 'opacity-0 pointer-events-none -translate-x-10' : 'opacity-100 translate-x-0'
          }`}
          style={{ background: '#dde2e8' }}
        >
          <div
            className="w-full max-w-sm p-8 rounded-[22px] text-center relative"
            style={{
              background: '#dde2e8',
              boxShadow: '12px 12px 24px #a4afc2, -12px -12px 24px #ffffff',
            }}
          >
            {/* Back to site */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="absolute top-4 left-4 p-2 rounded-full transition-all duration-200 hover:scale-105"
              style={{ boxShadow: '4px 4px 8px #a4afc2, -4px -4px 8px #ffffff' }}
              title="Voltar ao site"
            >
              <ArrowLeft size={16} color="#4c5563" />
            </button>

            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk', color: '#4c5563' }}>
              Ergon Login
            </h2>
            <form onSubmit={handleSignIn} className="space-y-5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="E-mail"
                className="w-full px-4 py-3 text-sm rounded-[22px] border-none outline-none"
                style={{
                  background: '#dde2e8',
                  boxShadow: 'inset 9px 9px 18px #a4afc2, inset -9px -9px 18px #ffffff',
                  color: '#4c5563',
                  fontSize: '14px',
                }}
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Senha"
                  className="w-full px-4 py-3 pr-12 text-sm rounded-[22px] border-none outline-none"
                  style={{
                    background: '#dde2e8',
                    boxShadow: 'inset 9px 9px 18px #a4afc2, inset -9px -9px 18px #ffffff',
                    color: '#4c5563',
                    fontSize: '14px',
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
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 rounded-[22px] border-none cursor-pointer text-sm font-medium transition-all duration-200 active:shadow-none disabled:opacity-50"
                style={{
                  background: '#dde2e8',
                  boxShadow: '9px 9px 18px #a4afc2, -9px -9px 18px #ffffff',
                  color: '#4c5563',
                }}
              >
                {submitting ? 'Entrando...' : 'Sign In'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setIsForgotPassword(true)}
              className="mt-3 text-xs font-medium hover:underline transition-colors"
              style={{ color: '#8896a8' }}
            >
              Esqueci minha senha
            </button>
          </div>
        </div>

        {/* ===== SIGN UP FORM (right side) — Neumorphic ===== */}
        <div
          className={`absolute top-0 right-0 w-1/2 h-full flex flex-col items-center justify-center p-8 sm:p-12 transition-all duration-700 ease-in-out ${
            isSignUp ? 'opacity-100 translate-x-0' : 'opacity-0 pointer-events-none translate-x-10'
          }`}
          style={{ background: '#dde2e8' }}
        >
          <div
            className="w-full max-w-sm p-8 rounded-[22px] text-center"
            style={{
              background: '#dde2e8',
              boxShadow: '12px 12px 24px #a4afc2, -12px -12px 24px #ffffff',
            }}
          >
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk', color: '#4c5563' }}>
              Criar Conta
            </h2>
            <form onSubmit={handleSignUp} className="space-y-5">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Seu nome completo"
                className="w-full px-4 py-3 text-sm rounded-[22px] border-none outline-none"
                style={{
                  background: '#dde2e8',
                  boxShadow: 'inset 9px 9px 18px #a4afc2, inset -9px -9px 18px #ffffff',
                  color: '#4c5563',
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="E-mail"
                className="w-full px-4 py-3 text-sm rounded-[22px] border-none outline-none"
                style={{
                  background: '#dde2e8',
                  boxShadow: 'inset 9px 9px 18px #a4afc2, inset -9px -9px 18px #ffffff',
                  color: '#4c5563',
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Senha"
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
                Solicitar Acesso
              </button>
            </form>
          </div>
        </div>

        {/* ===== SLIDING OVERLAY ===== */}
        <div
          className={`absolute top-0 w-1/2 h-full transition-transform duration-700 ease-in-out z-20 ${
            isSignUp ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ left: 0 }}
        >
          <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex flex-col items-center justify-start pt-10 p-12 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/5" />
            <div className="absolute -bottom-32 -right-20 w-80 h-80 rounded-full bg-white/5" />
            <div className="absolute top-1/4 right-8 w-32 h-32 rounded-full bg-white/5" />

            <div className="relative z-10 text-center">
              <img src={logoErgon} alt="Ergon" className="h-36 mx-auto mb-8 brightness-0 invert" />

              {!isSignUp ? (
                <div className="animate-fade-in">
                  <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>
                    Novo por aqui?
                  </h2>
                  <p className="text-white/80 text-sm leading-relaxed max-w-xs mx-auto mb-8">
                    Solicite acesso ao sistema de gestão ergonômica e saúde ocupacional.
                  </p>
                  <button
                    className="border border-white/40 text-white bg-transparent hover:bg-white/10 h-12 px-8 text-base rounded-[22px] font-medium transition-colors"
                    onClick={() => setIsSignUp(true)}
                  >
                    Cadastrar
                  </button>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>
                    Bem-vindo!
                  </h2>
                  <p className="text-white/80 text-sm leading-relaxed max-w-xs mx-auto mb-8">
                    Acesse o sistema com suas credenciais fornecidas pelo administrador.
                  </p>
                  <button
                    className="border border-white/40 text-white bg-transparent hover:bg-white/10 h-12 px-8 text-base rounded-[22px] font-medium transition-colors"
                    onClick={() => setIsSignUp(false)}
                  >
                    Entrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== MOBILE FALLBACK ===== */}
        <div className="md:hidden absolute inset-0 flex flex-col items-center justify-center p-6 bg-card z-30">
          <img src={logoErgon} alt="Ergon" className="h-12 mx-auto mb-6" />

          {!isSignUp ? (
            <div className="w-full max-w-sm animate-fade-in">
              <h2 className="text-2xl font-bold text-foreground mb-1 text-center" style={{ fontFamily: 'Space Grotesk' }}>Entrar</h2>
              <p className="text-muted-foreground text-sm mb-6 text-center">Acesse sua conta</p>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="m-email">E-mail</Label>
                  <Input id="m-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" className="h-12 rounded-xl bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-password">Senha</Label>
                  <Input id="m-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="h-12 rounded-xl bg-muted/50" />
                </div>
                <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
                  {submitting ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
              <button onClick={() => setIsSignUp(true)} className="w-full text-center mt-6 text-sm text-primary font-medium hover:underline transition-colors">
                Não tem conta? Cadastrar
              </button>
            </div>
          ) : (
            <div className="w-full max-w-sm animate-fade-in">
              <h2 className="text-2xl font-bold text-foreground mb-1 text-center" style={{ fontFamily: 'Space Grotesk' }}>Criar Conta</h2>
              <p className="text-muted-foreground text-sm mb-6 text-center">Solicite acesso ao sistema</p>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="m-name">Nome</Label>
                  <Input id="m-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" className="h-12 rounded-xl bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-email2">E-mail</Label>
                  <Input id="m-email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" className="h-12 rounded-xl bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-pass2">Senha</Label>
                  <Input id="m-pass2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="h-12 rounded-xl bg-muted/50" />
                </div>
                <Button type="submit" className="w-full h-12 text-base">Solicitar Acesso</Button>
              </form>
              <button onClick={() => setIsSignUp(false)} className="w-full text-center mt-6 text-sm text-primary font-medium hover:underline transition-colors">
                Já tem conta? Entrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
