import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import logoErgon from '@/assets/logo-ergon.png';
import logoPrs from '@/assets/logo-prs.png'; // PRS Systems
import heroImg1 from '@/assets/landing-hero-1.jpg';
import heroImg2 from '@/assets/landing-hero-2.jpg';
import heroImg3 from '@/assets/landing-hero-3.jpg';

/* ── Animated text block ── */
function ScrollText({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  once = false,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'left' | 'right' | 'scale';
  delay?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-80px' });

  const variants: Record<string, { opacity: number; y?: number; x?: number; scale?: number }> = {
    up: { opacity: 0, y: 40 },
    left: { opacity: 0, x: -40 },
    right: { opacity: 0, x: 40 },
    scale: { opacity: 0, scale: 0.9 },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={variants[direction]}
      animate={inView ? { opacity: 1, y: 0, x: 0, scale: 1 } : variants[direction]}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
    >
      {children}
    </motion.div>
  );
}

/* ── Parallax background (image or video) ── */
function ParallaxBg({ src, speed = 0.3, overlay, isVideo = false }: { src: string; speed?: number; overlay: string; isVideo?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${speed * 100}%`, `${speed * 100}%`]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-gray-900">
      {isVideo ? (
        <div className="absolute inset-0 bg-gray-900">
          <video
            key={src}
            src={src}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className={`absolute inset-0 ${overlay}`} />
        </div>
      ) : (
        <motion.div style={{ y }} className="absolute inset-0 h-[130%] -top-[15%]">
          <div
            style={{ backgroundImage: `url(${src})` }}
            className="absolute inset-0 bg-cover bg-center"
          />
          <div className={`absolute inset-0 ${overlay}`} />
        </motion.div>
      )}
    </div>
  );
}

/* ── Rotating typewriter text ── */
const ROTATING_WORDS = ['sua empresa', 'seu funcionário', 'sua equipe', 'seu negócio'];

function RotatingText() {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = ROTATING_WORDS[index];
    const speed = isDeleting ? 40 : 70;

    if (!isDeleting && displayed === word) {
      const pause = setTimeout(() => setIsDeleting(true), 1800);
      return () => clearTimeout(pause);
    }

    if (isDeleting && displayed === '') {
      setIsDeleting(false);
      setIndex((i) => (i + 1) % ROTATING_WORDS.length);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayed(isDeleting ? word.slice(0, displayed.length - 1) : word.slice(0, displayed.length + 1));
    }, speed);

    return () => clearTimeout(timer);
  }, [displayed, isDeleting, index]);

  return (
    <span className="relative">
      <span className="text-teal-400">{displayed}</span>
      <motion.span
        className="inline-block w-[3px] h-[1em] bg-teal-400 ml-0.5 align-middle"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
      />
    </span>
  );
}

/* ── QUOTE SIMULATOR DATA ── */
const MARKUP = 1.20;

interface ServiceOption {
  id: string;
  label: string;
  description: string;
  basePrice: number;
  category: 'essential' | 'advanced' | 'premium';
  avgLawsuitCost: number;
  riskReduction: number;
  riskContext: string;
  jurisprudencia: string;
}

const services: ServiceOption[] = [
  { id: 'aep', label: 'Avaliação Ergonômica Preliminar (AEP)', description: 'Identificação inicial de riscos ergonômicos no ambiente de trabalho', basePrice: 800, category: 'essential', avgLawsuitCost: 60000, riskReduction: 0.60, riskContext: 'Condenações por LER/DORT no TST chegam a R$ 60 mil por caso.', jurisprudencia: 'https://jurisprudencia.tst.jus.br/jurisprudencia/decisoes?query=ergonomia%20NR-17%20LER%20DORT&periodicidade=MENSAL' },
  { id: 'aet', label: 'Análise Ergonômica do Trabalho (AET)', description: 'Análise aprofundada com recomendações técnicas detalhadas', basePrice: 1500, category: 'essential', avgLawsuitCost: 80000, riskReduction: 0.75, riskContext: 'Perícias sem laudo técnico geram condenações entre R$ 50 mil e R$ 100 mil.', jurisprudencia: 'https://jurisprudencia.tst.jus.br/jurisprudencia/decisoes?query=an%C3%A1lise%20ergon%C3%B4mica%20laudo%20pericial%20condena%C3%A7%C3%A3o' },
  { id: 'pcmso', label: 'Gestão PCMSO Integrada', description: 'Controle de exames médicos, ASOs e cronogramas de saúde', basePrice: 1200, category: 'essential', avgLawsuitCost: 25000, riskReduction: 0.70, riskContext: 'Empresas autuadas por SST pagaram em média R$ 18,4 mil em multas em 2025.', jurisprudencia: 'https://jurisprudencia.tst.jus.br/jurisprudencia/decisoes?query=PCMSO%20exame%20m%C3%A9dico%20ocupa cional%20multa%20NR-7' },
  { id: 'psicossocial', label: 'Avaliação de Riscos Psicossociais', description: 'Mapeamento de fatores como estresse, assédio e carga mental', basePrice: 2000, category: 'advanced', avgLawsuitCost: 100000, riskReduction: 0.65, riskContext: 'Ações por burnout cresceram 14,5% e somam R$ 3,75 bilhões em impacto.', jurisprudencia: 'https://jurisprudencia.tst.jus.br/jurisprudencia/decisoes?query=burnout%20ass%C3%A9dio%20moral%20risco%20psicossocial%20indeniza%C3%A7%C3%A3o' },
  { id: 'dashboard', label: 'Dashboard Executivo e Indicadores', description: 'Painel visual com KPIs, tendências e relatórios para gestão', basePrice: 900, category: 'advanced', avgLawsuitCost: 25000, riskReduction: 0.50, riskContext: 'Grandes empresas reincidentes pagam até R$ 25 mil por autuação.', jurisprudencia: 'https://jurisprudencia.tst.jus.br/jurisprudencia/decisoes?query=fiscaliza%C3%A7%C3%A3o%20reincid%C3%AAncia%20seguran%C3%A7a%20trabalho%20autua%C3%A7%C3%A3o' },
  { id: 'alertas', label: 'Alertas e Notificações Inteligentes', description: 'Avisos automáticos de vencimentos, prazos e ações pendentes', basePrice: 600, category: 'advanced', avgLawsuitCost: 18000, riskReduction: 0.55, riskContext: 'Multas por documentos vencidos chegam a R$ 12,6 mil para grandes empresas.', jurisprudencia: 'https://jurisprudencia.tst.jus.br/jurisprudencia/decisoes?query=descumprimento%20prazo%20NR%20documento%20vencido%20multa' },
  { id: 'planos_acao', label: 'Planos de Ação Automatizados', description: 'Geração automática de planos corretivos com rastreabilidade', basePrice: 1100, category: 'premium', avgLawsuitCost: 50000, riskReduction: 0.70, riskContext: 'PGR sem plano de ação gera multa de até R$ 12,6 mil, dobrando em reincidência.', jurisprudencia: 'https://jurisprudencia.tst.jus.br/jurisprudencia/decisoes?query=PGR%20plano%20a%C3%A7%C3%A3o%20GRO%20NR-1%20multa' },
  { id: 'multiempresa', label: 'Gestão Multi-empresa', description: 'Gerencie diversas empresas em um único painel centralizado', basePrice: 1800, category: 'premium', avgLawsuitCost: 80000, riskReduction: 0.60, riskContext: 'Cada filial é fiscalizada independentemente. Multas multiplicam a exposição.', jurisprudencia: 'https://jurisprudencia.tst.jus.br/jurisprudencia/decisoes?query=filial%20grupo%20econ%C3%B4mico%20responsabilidade%20solid%C3%A1ria%20seguran%C3%A7a%20trabalho' },
  { id: 'suporte', label: 'Suporte Prioritário e Personalização', description: 'Atendimento dedicado, treinamentos e configurações sob medida', basePrice: 1500, category: 'premium', avgLawsuitCost: 25000, riskReduction: 0.45, riskContext: 'Treinamentos obrigatórios não realizados geram autuações.', jurisprudencia: 'https://jurisprudencia.tst.jus.br/jurisprudencia/decisoes?query=treinamento%20obrigat%C3%B3rio%20NR%20capacita%C3%A7%C3%A3o%20autua%C3%A7%C3%A3o' },
];

const categoryLabels: Record<string, { label: string; description: string; step: number }> = {
  essential: { label: 'Proteção Essencial', description: 'Base de conformidade legal obrigatória para toda empresa com CLT', step: 1 },
  advanced: { label: 'Monitoramento Avançado', description: 'Gestão proativa de riscos com indicadores e automação', step: 2 },
  premium: { label: 'Cobertura Total', description: 'Proteção jurídica completa com rastreabilidade máxima', step: 3 },
};

const protectionBenefits = [
  'Proteção contra autuações do MTE e fiscalizações',
  'Redução de passivos trabalhistas com evidência contínua',
  'Conformidade total com NR-1, NR-7 e NR-17',
  'Rastreabilidade completa para auditorias e perícias',
];

const premiumBenefit = 'Laudos com validade jurídica assinados pelo colaborador — a prova que seu advogado precisa para vencer processos trabalhistas';

const contractOptions = [
  { months: 1, discount: 0, label: 'Mensal', tag: '' },
  { months: 6, discount: 0.05, label: 'Semestral', tag: '' },
  { months: 12, discount: 0.10, label: 'Anual', tag: 'Mais escolhido' },
  { months: 24, discount: 0.20, label: 'Bienal', tag: 'Melhor custo-benefício' },
];

interface IndustryProfile {
  label: string;
  riskMultiplier: number;
  topRisks: string[];
  avgCondemnation: number;
  fiscalizationRate: string;
  commonNRs: string[];
  insight: string;
}

const industryProfiles: Record<string, IndustryProfile> = {
  industria: { label: 'Indústria / Manufatura', riskMultiplier: 1.4, topRisks: ['LER/DORT por movimentos repetitivos', 'Exposição a ruído e agentes químicos', 'Acidentes com máquinas'], avgCondemnation: 95000, fiscalizationRate: '32% das fiscalizações do MTE em 2024', commonNRs: ['NR-12', 'NR-15', 'NR-17', 'NR-1'], insight: 'Indústrias representam o maior volume de condenações trabalhistas por doenças ocupacionais.' },
  comercio: { label: 'Comércio / Varejo', riskMultiplier: 1.0, topRisks: ['Sobrecarga postural em caixas e estoques', 'Jornadas extensas e banco de horas irregular', 'Assédio moral e metas abusivas'], avgCondemnation: 45000, fiscalizationRate: '18% das fiscalizações do MTE em 2024', commonNRs: ['NR-17', 'NR-1', 'NR-7'], insight: 'O varejo lidera em ações por assédio moral e jornada irregular.' },
  saude: { label: 'Saúde / Hospitalar', riskMultiplier: 1.5, topRisks: ['Exposição a agentes biológicos', 'Sobrecarga ergonômica em enfermagem', 'Burnout e riscos psicossociais'], avgCondemnation: 120000, fiscalizationRate: '15% das fiscalizações do MTE em 2024', commonNRs: ['NR-32', 'NR-17', 'NR-7', 'NR-1'], insight: 'Profissionais de saúde têm 3x mais afastamentos por transtornos mentais.' },
  construcao: { label: 'Construção Civil', riskMultiplier: 1.6, topRisks: ['Quedas de altura e soterramento', 'Exposição solar e esforço físico extremo', 'Falta de EPI e treinamento'], avgCondemnation: 150000, fiscalizationRate: '25% das fiscalizações do MTE em 2024', commonNRs: ['NR-18', 'NR-35', 'NR-6', 'NR-1'], insight: 'Construção civil tem a maior taxa de mortalidade e condenações mais altas.' },
  tecnologia: { label: 'Tecnologia / Escritórios', riskMultiplier: 0.9, topRisks: ['LER/DORT por uso prolongado de computador', 'Burnout e sobrecarga mental', 'Problemas posturais e sedentarismo'], avgCondemnation: 55000, fiscalizationRate: '8% das fiscalizações do MTE em 2024', commonNRs: ['NR-17', 'NR-1', 'NR-7'], insight: 'Ações por burnout em tech cresceram 40% desde 2022.' },
  logistica: { label: 'Logística / Transporte', riskMultiplier: 1.3, topRisks: ['Lombalgia por carga e descarga manual', 'Acidentes de trânsito e jornada excessiva', 'Vibração e exposição a ruído'], avgCondemnation: 85000, fiscalizationRate: '12% das fiscalizações do MTE em 2024', commonNRs: ['NR-11', 'NR-17', 'NR-1', 'NR-7'], insight: 'Motoristas e operadores de empilhadeira lideram afastamentos por coluna.' },
  alimentacao: { label: 'Alimentação / Restaurantes', riskMultiplier: 1.1, topRisks: ['Queimaduras e cortes', 'Jornada excessiva e banco de horas', 'Posturas inadequadas e calor excessivo'], avgCondemnation: 35000, fiscalizationRate: '10% das fiscalizações do MTE em 2024', commonNRs: ['NR-17', 'NR-1', 'NR-7', 'NR-24'], insight: 'Restaurantes têm alta rotatividade e pouca documentação.' },
  educacao: { label: 'Educação', riskMultiplier: 0.8, topRisks: ['Disfonia e problemas vocais', 'Burnout e sobrecarga emocional', 'Problemas posturais'], avgCondemnation: 40000, fiscalizationRate: '5% das fiscalizações do MTE em 2024', commonNRs: ['NR-17', 'NR-1', 'NR-7'], insight: 'Professores são a segunda categoria com mais afastamentos por transtornos mentais.' },
  outros: { label: 'Outros', riskMultiplier: 1.0, topRisks: ['Riscos ergonômicos gerais', 'Falta de documentação SST', 'Riscos psicossociais não mapeados'], avgCondemnation: 60000, fiscalizationRate: 'Variável por segmento', commonNRs: ['NR-1', 'NR-7', 'NR-17'], insight: 'Toda empresa com CLT é obrigada a cumprir as NRs.' },
};

const companyTypes = [
  { value: 'mei', label: 'MEI' },
  { value: 'me', label: 'ME (Microempresa)' },
  { value: 'epp', label: 'EPP (Empresa de Pequeno Porte)' },
  { value: 'medio', label: 'Médio Porte' },
  { value: 'grande', label: 'Grande Porte' },
];

const painPoints = [
  { title: 'Risco invisível', text: 'Riscos ergonômicos e psicossociais que ninguém documenta. Até virar processo.' },
  { title: 'Falta de controle', text: 'Dados dispersos, planilhas desatualizadas, histórico perdido entre trocas de equipe.' },
  { title: 'Exposição jurídica', text: 'Sem evidência estruturada, qualquer fiscalização ou ação trabalhista encontra brecha.' },
];

const solutionSteps = [
  { num: '01', title: 'Coleta estruturada', text: 'AEP, AET, exames, checklists e dados organizados desde a origem.' },
  { num: '02', title: 'Processamento inteligente', text: 'Análise de risco automática, score calculado, identificação de falhas em tempo real.' },
  { num: '03', title: 'Evidência contínua', text: 'Histórico completo, rastreabilidade total, documentação auditável.' },
  { num: '04', title: 'Ação e prevenção', text: 'Planos de ação automáticos, alertas inteligentes, reavaliação programada.' },
];

/* ══════════════════════════════════════════════════════════════
   QUOTE MODAL
══════════════════════════════════════════════════════════════ */
function QuoteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [colaboradores, setColaboradores] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set(['aep', 'pcmso']));
  const [selectedContract, setSelectedContract] = useState(12);
  const [contactForm, setContactForm] = useState({ nome: '', empresa: '', email: '', telefone: '' });
  const [submitted, setSubmitted] = useState(false);
  const [cnpj, setCnpj] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [industry, setIndustry] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [cnpjSearched, setCnpjSearched] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjData, setCnpjData] = useState<any>(null);
  const [cnpjError, setCnpjError] = useState('');
  const [activeCat, setActiveCat] = useState<'essential' | 'advanced' | 'premium'>('essential');

  const industryProfile = industryProfiles[industry] || null;

  const formatCnpj = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 14);
    return nums.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
      .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})/, '$1.$2.$3/$4')
      .replace(/^(\d{2})(\d{3})(\d{3})/, '$1.$2.$3')
      .replace(/^(\d{2})(\d{3})/, '$1.$2');
  };

  const detectIndustry = (cnae: number, descricao: string): string => {
    const desc = descricao.toLowerCase();
    if ((cnae >= 10000 && cnae < 34000) || desc.includes('indústria') || desc.includes('fabricação')) return 'industria';
    if ((cnae >= 45000 && cnae < 48000) || desc.includes('comércio') || desc.includes('varejo')) return 'comercio';
    if ((cnae >= 86000 && cnae < 87000) || desc.includes('saúde') || desc.includes('hospital')) return 'saude';
    if ((cnae >= 41000 && cnae < 44000) || desc.includes('construção')) return 'construcao';
    if ((cnae >= 62000 && cnae < 64000) || desc.includes('tecnologia') || desc.includes('software')) return 'tecnologia';
    if ((cnae >= 49000 && cnae < 54000) || desc.includes('transporte') || desc.includes('logística')) return 'logistica';
    if ((cnae >= 56000 && cnae < 57000) || desc.includes('alimentação') || desc.includes('restaurante')) return 'alimentacao';
    if ((cnae >= 85000 && cnae < 86000) || desc.includes('educação') || desc.includes('ensino')) return 'educacao';
    return 'outros';
  };

  const detectPorte = (porte: string): string => {
    const p = porte.toLowerCase();
    if (p.includes('mei')) return 'mei';
    if (p.includes('micro')) return 'me';
    if (p.includes('pequeno')) return 'epp';
    if (p.includes('demais')) return 'grande';
    return 'medio';
  };

  const handleCnpjSearch = async () => {
    const nums = cnpj.replace(/\D/g, '');
    if (nums.length !== 14) return;
    setCnpjLoading(true);
    setCnpjError('');
    setCnpjData(null);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${nums}`);
      if (!res.ok) throw new Error('CNPJ não encontrado');
      const data = await res.json();
      setCnpjData(data);
      setCompanyName(data.nome_fantasia || data.razao_social);
      setCnpjSearched(true);
      setIndustry(detectIndustry(data.cnae_fiscal, data.cnae_fiscal_descricao || ''));
      setCompanyType(detectPorte(data.porte || ''));
      setContactForm(f => ({ ...f, empresa: data.nome_fantasia || data.razao_social }));
    } catch {
      setCnpjError('CNPJ não encontrado. Verifique o número e tente novamente.');
      setCnpjSearched(false);
    }
    setCnpjLoading(false);
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedServices = services.filter(s => selected.has(s.id));
  const baseTotal = selectedServices.reduce((sum, s) => sum + s.basePrice, 0);
  const contractOption = contractOptions.find(c => c.months === selectedContract) || contractOptions[2];
  const monthlyWithMarkup = Math.ceil(baseTotal * MARKUP);
  const monthlyWithDiscount = Math.ceil(monthlyWithMarkup * (1 - contractOption.discount));
  const totalContract = monthlyWithDiscount * contractOption.months;

  const riskMult = industryProfile?.riskMultiplier || 1.0;
  const totalRiskExposure = selectedServices.reduce((sum, s) => sum + Math.round(s.avgLawsuitCost * riskMult), 0);
  const avgReduction = selectedServices.length > 0 ? selectedServices.reduce((sum, s) => sum + s.riskReduction, 0) / selectedServices.length : 0;
  const potentialSavings = Math.round(totalRiskExposure * avgReduction);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setSubmitted(true); };

  const reset = () => {
    setStep(1); setSubmitted(false); setSelected(new Set(['aep', 'pcmso']));
    setContactForm({ nome: '', empresa: '', email: '', telefone: '' });
    setColaboradores(50); setSelectedContract(12);
    setCnpj(''); setCompanyType(''); setIndustry(''); setCompanyName('');
    setCnpjSearched(false); setCnpjData(null); setCnpjError('');
    onClose();
  };

  const canAdvanceStep1 = industry !== '' && companyType !== '';
  const inputClasses = "w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-300/30 transition-all bg-white placeholder:text-gray-400";

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[6px]" onClick={reset} />
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col border border-gray-100"
        >
          {/* Header */}
          <div className="px-7 pt-6 pb-5 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 tracking-[-0.01em]" style={{ fontFamily: 'Space Grotesk' }}>
                {step === 1 && 'Identifique sua empresa'}
                {step === 2 && 'Monte seu plano de proteção'}
                {step === 3 && 'Escolha o período'}
                {step === 4 && 'Finalizar contratação'}
              </h2>
              <p className="text-[13px] text-gray-500 mt-0.5">
                {step === 1 && 'Vamos analisar os riscos do seu segmento'}
                {step === 2 && (industryProfile ? `Serviços recomendados para ${industryProfile.label}` : 'Selecione os serviços')}
                {step === 3 && 'Quanto maior o período, menor o investimento'}
                {step === 4 && 'Preencha seus dados para a proposta'}
              </p>
            </div>
            <button onClick={reset} className="p-1.5 -mr-1.5 -mt-1 rounded-lg hover:bg-gray-100 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>


          {/* Content */}
          <div className="flex-1 overflow-y-auto px-7 pb-6">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">CNPJ (opcional)</label>
                  <div className="flex gap-2">
                    <input
                      value={cnpj}
                      onChange={e => { setCnpj(formatCnpj(e.target.value)); setCnpjSearched(false); }}
                      className={inputClasses}
                      placeholder="00.000.000/0000-00"
                    />
                    <button
                      onClick={handleCnpjSearch}
                      disabled={cnpj.replace(/\D/g, '').length !== 14 || cnpjLoading}
                      className="px-5 py-3 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-40 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      {cnpjLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                      Buscar
                    </button>
                  </div>
                  {cnpjError && <p className="text-sm text-red-500 mt-2">{cnpjError}</p>}
                {cnpjSearched && cnpjData && (
                    <div className="mt-3 p-4 bg-gray-50/80 rounded-lg border border-gray-150 space-y-2">
                      <span className="font-semibold text-gray-900 text-sm">{cnpjData.nome_fantasia || cnpjData.razao_social}</span>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div><span className="font-medium">CNAE:</span> {cnpjData.cnae_fiscal_descricao}</div>
                        <div><span className="font-medium">Porte:</span> {cnpjData.porte}</div>
                        <div><span className="font-medium">Local:</span> {cnpjData.municipio}/{cnpjData.uf}</div>
                      </div>
                      <p className="text-xs text-gray-500">Porte e ramo preenchidos automaticamente</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Porte da empresa *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {companyTypes.map(ct => (
                      <button
                        key={ct.value}
                        onClick={() => setCompanyType(ct.value)}
                        className={`p-3 rounded-lg border text-sm font-medium text-center transition-all duration-150 min-h-[56px] flex items-center justify-center ${companyType === ct.value ? 'border-gray-800 bg-gray-800/[0.04] text-gray-900 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
                      >
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Ramo de atuação *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(industryProfiles).map(([key, prof]) => (
                      <button
                        key={key}
                        onClick={() => setIndustry(key)}
                        className={`p-3 rounded-lg border text-sm font-medium text-center transition-all duration-150 min-h-[56px] flex items-center justify-center ${industry === key ? 'border-gray-800 bg-gray-800/[0.04] text-gray-900 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
                      >
                        {prof.label}
                      </button>
                    ))}
                  </div>
                </div>

                {industryProfile && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-gray-50/80 rounded-lg border border-gray-200">
                    <span className="font-semibold text-gray-900 text-sm">Análise de risco: {industryProfile.label}</span>
                    <p className="text-sm text-gray-600 mt-1 mb-3">{industryProfile.insight}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Condenação média</p>
                        <p className="text-lg font-bold text-gray-900">R$ {industryProfile.avgCondemnation.toLocaleString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Fiscalização</p>
                        <p className="text-sm font-medium text-gray-900">{industryProfile.fiscalizationRate}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-600 mb-1">Principais riscos</p>
                      {industryProfile.topRisks.map(r => (
                        <p key={r} className="text-xs text-gray-600">● {r}</p>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-1 flex-wrap">
                      {industryProfile.commonNRs.map(nr => (
                        <span key={nr} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">{nr}</span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-4">
                {industryProfile && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900 leading-snug">
                      Empresas de {industryProfile.label} têm condenação média de R$ {industryProfile.avgCondemnation.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Selecione os serviços para reduzir sua exposição</p>
                  </div>
                )}

                {/* Category stepper */}
                <div className="flex items-center gap-0">
                  {(['essential', 'advanced', 'premium'] as const).map((cat, i) => {
                    const cats = ['essential', 'advanced', 'premium'] as const;
                    const currentIdx = cats.indexOf(activeCat);
                    const isDone = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    const catServices = services.filter(s => s.category === cat);
                    const selectedCount = catServices.filter(s => selected.has(s.id)).length;
                    return (
                      <div key={cat} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isCurrent ? 'bg-gray-800 text-white ring-2 ring-gray-800/20' : isDone ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {isDone ? '✓' : i + 1}
                          </div>
                          <p className={`text-[10px] mt-1 text-center leading-tight font-medium ${isCurrent ? 'text-gray-900' : isDone ? 'text-gray-600' : 'text-gray-400'}`}>
                            {categoryLabels[cat].label}
                          </p>
                          {selectedCount > 0 && (
                            <span className="text-[9px] text-gray-500 mt-0.5">{selectedCount} selecionado{selectedCount > 1 ? 's' : ''}</span>
                          )}
                        </div>
                        {i < 2 && <div className={`h-px flex-1 mx-1 mt-[-16px] ${i < currentIdx ? 'bg-gray-800' : 'bg-gray-200'}`} />}
                      </div>
                    );
                  })}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Nº de colaboradores</label>
                    <span className="text-sm font-bold text-gray-900">{colaboradores}</span>
                  </div>
                  <input
                    type="range" min={1} max={500} value={colaboradores}
                    onChange={e => setColaboradores(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none bg-gray-200 accent-gray-700 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1</span><span>100</span><span>250</span><span>500</span>
                  </div>
                </div>

                {/* Active category services */}
                <motion.div
                  key={activeCat}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="rounded-lg border border-gray-200 overflow-hidden"
                >
                  <div className={`p-4 ${activeCat === 'essential' ? 'bg-blue-50/50 border-b border-blue-100' : activeCat === 'advanced' ? 'bg-amber-50/50 border-b border-amber-100' : 'bg-emerald-50/50 border-b border-emerald-100'}`}>
                    <p className="text-sm font-bold text-gray-900">{categoryLabels[activeCat].label}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{categoryLabels[activeCat].description}</p>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {services.filter(s => s.category === activeCat).map(service => {
                      const isSelected = selected.has(service.id);
                      return (
                        <div key={service.id} className="p-4">
                          <button
                            onClick={() => toggle(service.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 pr-3">
                                <p className="font-medium text-gray-900 text-sm">{service.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{service.description}</p>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-gray-700 bg-gray-700' : 'border-gray-300'}`}>
                                {isSelected && <span className="text-white text-xs">✓</span>}
                              </div>
                            </div>
                          </button>
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                  <p className="text-xs text-gray-600">{service.riskContext}</p>
                                  <div className="flex gap-4 mt-2">
                                    <div>
                                      <p className="text-[10px] text-gray-400">Custo médio{industryProfile ? ' no setor' : ''}</p>
                                      <p className="text-sm font-bold text-gray-800">R$ {Math.round(service.avgLawsuitCost * riskMult).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-gray-400">Redução com Ergon</p>
                                      <p className="text-sm font-bold text-gray-800">até {Math.round(service.riskReduction * 100)}%</p>
                                    </div>
                                  </div>
                                  <a
                                    href={service.jurisprudencia}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-[10px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                  >
                                    Ver jurisprudência e base legal →
                                  </a>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Legal report badge — only on last category */}
                {activeCat === 'premium' && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900">Relatório Jurídico Incluso</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Em caso de processo judicial, fornecemos relatório técnico-jurídico completo com toda a documentação e evidências coletadas pelo sistema como parte da defesa da empresa.
                    </p>
                  </div>
                )}

                {selectedServices.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-semibold text-gray-900 mb-2">Impacto da sua proteção</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Exposição total sem sistema</p>
                        <p className="text-base font-bold text-gray-900">R$ {totalRiskExposure.toLocaleString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Economia potencial com Ergon</p>
                        <p className="text-base font-bold text-gray-900">R$ {potentialSavings.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Com {selectedServices.length} {selectedServices.length === 1 ? 'serviço' : 'serviços'}, redução média de {Math.round(avgReduction * 100)}% dos riscos.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700">{selectedServices.length} serviços · {colaboradores} colaboradores</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedServices.map(s => (
                      <span key={s.id} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{s.label}</span>
                    ))}
                  </div>
                </div>

                <p className="text-sm font-medium text-gray-700">Escolha o período</p>
                <div className="space-y-3">
                  {contractOptions.map(opt => {
                    const monthly = Math.ceil(monthlyWithMarkup * (1 - opt.discount));
                    const total = monthly * opt.months;
                    const isActive = selectedContract === opt.months;
                    return (
                      <button
                        key={opt.months}
                        onClick={() => setSelectedContract(opt.months)}
                        className={`w-full p-5 rounded-2xl border text-left transition-all relative ${isActive ? 'border-gray-400 bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                      >
                        {opt.tag && (
                          <span className="absolute -top-2.5 right-4 px-3 py-0.5 bg-gray-700 text-white text-[10px] font-bold rounded-full">{opt.tag}</span>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{opt.label}</p>
                            <p className="text-xs text-gray-500">{opt.months === 1 ? 'Sem fidelidade' : `${opt.months} meses`}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              R$ {monthly.toLocaleString('pt-BR')}<span className="text-xs font-normal text-gray-500">/mês</span>
                            </p>
                            {opt.discount > 0 && (
                              <p className="text-xs text-gray-500">Economia de R$ {((monthlyWithMarkup - monthly) * opt.months).toLocaleString('pt-BR')}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Total: R$ {total.toLocaleString('pt-BR')}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Sua empresa terá</p>
                  {protectionBenefits.map(b => (
                    <p key={b} className="text-xs text-gray-600 flex items-start gap-2 mb-1">
                      <span className="text-gray-400 mt-0.5">✓</span>{b}
                    </p>
                  ))}
                  {selectedServices.some(s => s.category === 'premium') ? (
                    <p className="text-xs text-gray-600 flex items-start gap-2 mb-1">
                      <span className="text-gray-400 mt-0.5">✓</span>{premiumBenefit}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 flex items-start gap-2 mb-1">
                      <span className="mt-0.5">✗</span>Laudos com validade jurídica — disponível na Cobertura Total
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="space-y-6">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl text-gray-700">✓</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Proposta enviada com sucesso</h3>
                    <p className="text-sm text-gray-500 mb-6">Nossa equipe entrará em contato em até 24h.</p>

                    <div className="text-left p-4 bg-gray-50 rounded-xl space-y-2">
                      <p className="text-sm font-medium text-gray-700">Resumo</p>
                      <p className="text-xs text-gray-600">{selectedServices.length} serviços · {colaboradores} colaboradores</p>
                      <p className="text-xs text-gray-600">{contractOption.label} — R$ {monthlyWithDiscount.toLocaleString('pt-BR')}/mês</p>
                      <p className="text-xs text-gray-600">Total: R$ {totalContract.toLocaleString('pt-BR')}</p>
                    </div>

                    <button onClick={reset} className="mt-6 px-6 py-3 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
                      Fechar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900">Resumo do plano</p>
                        <p className="text-lg font-bold text-gray-900">R$ {monthlyWithDiscount.toLocaleString('pt-BR')}/mês</p>
                      </div>
                      <p className="text-xs text-gray-500">{selectedServices.length} serviços · {contractOption.label} · {colaboradores} colaboradores</p>
                      <p className="text-xs text-gray-500">Total do contrato: R$ {totalContract.toLocaleString('pt-BR')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Nome completo *</label>
                        <input
                          value={contactForm.nome}
                          onChange={e => setContactForm(f => ({ ...f, nome: e.target.value }))}
                          className={inputClasses}
                          required
                          placeholder="Seu nome"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Empresa *</label>
                        <input
                          value={contactForm.empresa}
                          onChange={e => setContactForm(f => ({ ...f, empresa: e.target.value }))}
                          className={inputClasses}
                          required
                          placeholder="Nome da empresa"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">E-mail *</label>
                        <input
                          type="email"
                          value={contactForm.email}
                          onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                          className={inputClasses}
                          required
                          placeholder="seu@email.com"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Telefone</label>
                        <input
                          value={contactForm.telefone}
                          onChange={e => setContactForm(f => ({ ...f, telefone: e.target.value }))}
                          className={inputClasses}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button type="submit" className="flex-1 py-3 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors">
                          Enviar proposta
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const { generatePropostaPdf } = await import('@/utils/propostaPdfReport');
                            generatePropostaPdf({
                              empresa: contactForm.empresa,
                              contato: contactForm.nome,
                              email: contactForm.email,
                              telefone: contactForm.telefone,
                              porte: companyType ? (services.length ? companyType : companyType) : '',
                              ramo: industryProfile?.label || '',
                              servicosDetalhados: selectedServices.map(s => ({
                                label: s.label,
                                description: s.description,
                                riskContext: s.riskContext,
                                riskReduction: s.riskReduction,
                                avgLawsuitCost: s.avgLawsuitCost,
                                category: s.category,
                              })),
                              colaboradores,
                              periodo: contractOption.label,
                              valorMensal: monthlyWithDiscount,
                              totalContrato: totalContract,
                              exposicaoSemSistema: totalRiskExposure,
                              economiaPotencial: potentialSavings,
                              avgReduction,
                            });
                          }}
                          className="px-5 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          Gerar PDF
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer navigation */}
          {!submitted && (
            <div className="px-7 py-5 border-t border-gray-100 flex justify-between items-center">
              {step > 1 ? (
                <button
                  onClick={() => {
                    if (step === 2 && activeCat !== 'essential') {
                      setActiveCat(activeCat === 'premium' ? 'advanced' : 'essential');
                    } else {
                      setStep(s => s - 1);
                      if (step === 3) setActiveCat('premium');
                    }
                  }}
                  className="px-7 py-3 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors"
                >
                  ← Voltar
                </button>
              ) : <div />}
              {step < 4 && (
                <button
                  onClick={() => {
                    if (step === 2 && activeCat !== 'premium') {
                      setActiveCat(activeCat === 'essential' ? 'advanced' : 'premium');
                    } else {
                      setStep(s => s + 1);
                    }
                  }}
                  disabled={step === 1 && !canAdvanceStep1}
                  className="px-6 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900 disabled:opacity-40 transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                >
                  {step === 2 && activeCat !== 'premium' ? (
                    <>Próxima etapa <span className="text-white/70">→</span></>
                  ) : (
                    <>Próximo <span className="text-white/70">→</span></>
                  )}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════════════════════════ */
const LandingPage = () => {
  const navigate = useNavigate();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const heroVideos = ['/videos/hero-1.mp4', '/__l5e/assets-v1/c8c03f81-afc2-400c-a7b3-541886969034/hero-2-v2.mp4', '/__l5e/assets-v1/e81fd03a-cff6-4eda-a502-0c04c4dcd1e6/hero-3-v3.mp4']; // video carousel
  const [heroIdx, setHeroIdx] = useState(0);

  // Auto-rotate hero every 5 seconds
  useEffect(() => {
    const id = setInterval(() => setHeroIdx(i => (i + 1) % 3), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src={logoErgon} alt="Ergon" className="h-8 w-auto object-contain" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 bg-[hsl(216,61%,18%)] text-white rounded-full text-sm font-medium hover:bg-[hsl(216,61%,25%)] hover:scale-105 active:scale-[0.97] transition-all duration-200"
            >
              Entrar
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <ParallaxBg src={heroVideos[heroIdx]} speed={0.2} overlay="bg-gradient-to-r from-gray-900/85 via-gray-900/60 to-transparent" isVideo />
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24">
          <ScrollText direction="up" className="max-w-xl">
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight" style={{ fontFamily: 'Space Grotesk', textWrap: 'balance' as any }}>
              Proteja <RotatingText />.<br />Documente tudo.
            </h1>
            <p className="mt-6 text-lg text-gray-300 leading-relaxed max-w-md" style={{ textWrap: 'pretty' as any }}>
              Gestão ergonômica, saúde ocupacional e riscos psicossociais — com evidência jurídica contínua.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button
                onClick={() => setQuoteOpen(true)}
                className="px-8 py-4 bg-teal-500 text-white rounded-full text-base font-semibold hover:bg-teal-600 shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-105 active:scale-[0.97] transition-all duration-200"
              >
                Simular orçamento <span className="inline ml-1">→</span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 border border-white/30 text-white rounded-full text-base font-medium hover:bg-white/10 hover:scale-105 active:scale-[0.97] transition-all duration-200"
              >
                Acessar sistema
              </button>
            </div>
          </ScrollText>
        </div>
        {/* Hero image dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {heroVideos.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIdx(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === heroIdx ? 'bg-teal-400 scale-125' : 'bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
      </section>

      {/* Pain points */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <ScrollText className="text-center mb-16">
            <h2 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk', textWrap: 'balance' as any }}>
              A maioria das empresas só percebe quando é tarde
            </h2>
          </ScrollText>
          <div className="grid md:grid-cols-3 gap-8">
            {painPoints.map((p, i) => (
              <ScrollText key={p.title} delay={i * 0.1}>
                <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full flex flex-col min-h-[180px]">
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Space Grotesk' }}>{p.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">{p.text}</p>
                </div>
              </ScrollText>
            ))}
          </div>
        </div>
      </section>

      {/* Solution steps */}
      <section className="relative py-24 px-6">
        <ParallaxBg src={heroImg2} speed={0.15} overlay="bg-gray-900/90" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <ScrollText className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'Space Grotesk', textWrap: 'balance' as any }}>
              Como o Ergon protege sua empresa
            </h2>
          </ScrollText>
          <div className="grid sm:grid-cols-2 gap-6">
            {solutionSteps.map((s, i) => (
              <ScrollText key={s.num} delay={i * 0.1} direction={i % 2 === 0 ? 'left' : 'right'}>
                <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/15 transition-all duration-300 h-full flex flex-col min-h-[180px]">
                  <span className="text-teal-400 text-2xl font-bold">{s.num}</span>
                  <h3 className="text-lg font-semibold text-white mt-2 mb-2" style={{ fontFamily: 'Space Grotesk' }}>{s.title}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed flex-1">{s.text}</p>
                </div>
              </ScrollText>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <ScrollText className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk' }}>
            Comece a proteger sua empresa agora
          </h2>
          <p className="text-gray-500 mb-10 max-w-lg mx-auto">
            Monte seu plano personalizado em minutos. Simule o orçamento e veja o impacto financeiro da proteção Ergon.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => setQuoteOpen(true)}
              className="px-10 py-4 bg-teal-500 text-white rounded-full text-base font-semibold hover:bg-teal-600 shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-105 active:scale-[0.97] transition-all duration-200"
            >
              Simular orçamento
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-10 py-4 border border-gray-200 rounded-full text-base font-medium text-gray-700 hover:bg-gray-50 hover:scale-105 active:scale-[0.97] transition-all duration-200"
            >
              Já sou cliente
            </button>
          </div>
        </ScrollText>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logoErgon} alt="Ergon" className="h-8 w-auto object-contain" />
          <p className="text-xs text-gray-400">© 2024 Ergon — sisergon.com</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Desenvolvido por</span>
            <img src={logoPrs} alt="Sistemas PRS" className="h-7" />
          </div>
        </div>
      </footer>

      {/* Quote Modal */}
      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </div>
  );
};

export default LandingPage;