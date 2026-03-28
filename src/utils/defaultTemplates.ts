/**
 * Default question structures for AEP, AET, and Psicossocial forms.
 * Used both by the TemplatesTab "Carregar Padrão" button and as fallback in form pages.
 */

export interface DefaultOption { texto: string; peso: number; }
export interface DefaultQuestion { pergunta: string; obrigatoria: boolean; eliminatoria: boolean; opcoes: DefaultOption[]; }
export interface DefaultStage { titulo: string; descricao: string; perguntas: DefaultQuestion[]; }

const SCORE_OPTIONS: DefaultOption[] = [
  { texto: '0 — Adequado', peso: 0 },
  { texto: '1 — Leve', peso: 1 },
  { texto: '2 — Moderado', peso: 2 },
  { texto: '3 — Alto', peso: 3 },
];

export const AEP_DEFAULT_STAGES: DefaultStage[] = [
  {
    titulo: 'Bloco A — Posturas e alcances',
    descricao: 'Peso: 25%',
    perguntas: [
      'Tronco inclinado/rotacionado por períodos significativos',
      'Pescoço em flexão/extensão sustentada',
      'Ombros elevados/braços acima do ombro frequentes',
      'Alcances longos ou trabalho fora da "zona confortável"',
      'Punhos em desvio/pegas desconfortáveis',
    ].map(q => ({ pergunta: q, obrigatoria: true, eliminatoria: false, opcoes: [...SCORE_OPTIONS] })),
  },
  {
    titulo: 'Bloco B — Força/carga',
    descricao: 'Peso: 20%',
    perguntas: [
      'Empurrar/puxar com esforço perceptível',
      'Levantar/transportar cargas com frequência relevante',
      'Preensão forte/pinça fina prolongada (ferramentas/peças)',
      'Contato mecânico (bordas/pressão localizada) em mãos/antebraço',
      'Vibração (ferramenta/veículo) significativa',
    ].map(q => ({ pergunta: q, obrigatoria: true, eliminatoria: false, opcoes: [...SCORE_OPTIONS] })),
  },
  {
    titulo: 'Bloco C — Repetitividade e ritmo',
    descricao: 'Peso: 15%',
    perguntas: [
      'Ciclos curtos com alta repetição do mesmo gesto',
      'Metas/ritmo rígido com baixa autonomia',
      'Pausas insuficientes (micro e macro) para recuperação',
      'Picos de demanda sem ajuste de recursos',
      'Pressão temporal constante (urgência permanente)',
    ].map(q => ({ pergunta: q, obrigatoria: true, eliminatoria: false, opcoes: [...SCORE_OPTIONS] })),
  },
  {
    titulo: 'Bloco D — Posto, mobiliário e ferramentas',
    descricao: 'Peso: 10%',
    perguntas: [
      'Altura do plano de trabalho inadequada (muito alto/baixo)',
      'Cadeira/mesa sem ajustes mínimos (quando aplicável)',
      'Layout obriga torções/alcances/deslocamentos evitáveis',
      'Ferramentas inadequadas ou sem manutenção',
      'Tela/teclado/mouse mal posicionados (quando aplicável)',
    ].map(q => ({ pergunta: q, obrigatoria: true, eliminatoria: false, opcoes: [...SCORE_OPTIONS] })),
  },
  {
    titulo: 'Bloco E — Ambiente e conforto',
    descricao: 'Peso: 5%',
    perguntas: [
      'Iluminação insuficiente/ofuscamento',
      'Ruído interfere na tarefa/comunicação',
      'Calor/frio desconfortável sem controle',
      'Espaço restrito/obstáculos',
      'Organização/limpeza afeta segurança e eficiência',
    ].map(q => ({ pergunta: q, obrigatoria: true, eliminatoria: false, opcoes: [...SCORE_OPTIONS] })),
  },
  {
    titulo: 'Bloco F — Organização do trabalho',
    descricao: 'Peso: 15%',
    perguntas: [
      'Normas de produção exigem velocidade incompatível com recuperação',
      'Variabilidade alta sem treinamento/margem de manobra',
      'Rodízio inadequado (quando necessário)',
      'Jornada/turnos aumentam fadiga sem mitigação',
      'Comunicação operacional falha (mudança, prioridade, exceções)',
    ].map(q => ({ pergunta: q, obrigatoria: true, eliminatoria: false, opcoes: [...SCORE_OPTIONS] })),
  },
  {
    titulo: 'Bloco G — Psicossociais (ARP)',
    descricao: 'Peso: 10%',
    perguntas: [
      'Baixa clareza de papel/função',
      'Falta de suporte/apoio (liderança/equipe)',
      'Baixo reconhecimento/recompensas desproporcionais',
      'Má gestão de mudanças organizacionais',
      'Comunicação difícil/isolamento (inclui remoto)',
      'Indícios de assédio/violência/ameaça (qualquer natureza)',
    ].map(q => ({ pergunta: q, obrigatoria: true, eliminatoria: false, opcoes: [...SCORE_OPTIONS] })),
  },
];

export const AET_DEFAULT_STAGES: DefaultStage[] = [
  {
    titulo: '1. Demanda e Contextualização',
    descricao: 'Origem da demanda, contexto organizacional e reformulação do problema (NR-17 item 17.1.2)',
    perguntas: [
      { pergunta: 'Origem da demanda', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Contexto organizacional', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Reformulação do problema', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'População-alvo', obrigatoria: true, eliminatoria: false, opcoes: [] },
    ],
  },
  {
    titulo: '2. Análise da Atividade de Trabalho',
    descricao: 'Análise do trabalho real, organização, conteúdo das tarefas e exigências (NR-17 item 17.1.1)',
    perguntas: [
      { pergunta: 'Tarefa prescrita vs. trabalho real', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Organização do trabalho (NR-17 item 17.6)', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Mobiliário e equipamentos (NR-17 item 17.3)', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Condições ambientais (NR-17 item 17.5)', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Exigências físicas e biomecânicas', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Exigências cognitivas e psíquicas', obrigatoria: true, eliminatoria: false, opcoes: [] },
    ],
  },
  {
    titulo: '3. Métodos e Técnicas Utilizadas',
    descricao: 'Justificativa metodológica da análise ergonômica (NR-17 item 17.1.1.1)',
    perguntas: [
      { pergunta: 'Abordagem metodológica', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Técnicas de coleta de dados', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Instrumentos e ferramentas', obrigatoria: false, eliminatoria: false, opcoes: [] },
      { pergunta: 'Período e duração da análise', obrigatoria: true, eliminatoria: false, opcoes: [] },
    ],
  },
  {
    titulo: '4. Diagnóstico Ergonômico',
    descricao: 'Síntese dos determinantes, fatores de risco e suas inter-relações',
    perguntas: [
      { pergunta: 'Síntese dos resultados', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Fatores de risco identificados', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Relação com a saúde dos trabalhadores', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Pontos positivos identificados', obrigatoria: false, eliminatoria: false, opcoes: [] },
    ],
  },
  {
    titulo: '5. Recomendações e Plano de Ação',
    descricao: 'Soluções técnicas com hierarquia de controle e cronograma',
    perguntas: [
      { pergunta: 'Ações imediatas (0–30 dias)', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Ações de curto prazo (30–90 dias)', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Ações de médio/longo prazo (90+ dias)', obrigatoria: false, eliminatoria: false, opcoes: [] },
      { pergunta: 'Hierarquia de controle aplicada', obrigatoria: true, eliminatoria: false, opcoes: [] },
    ],
  },
  {
    titulo: '6. Restituição e Validação',
    descricao: 'Participação dos trabalhadores e validação social dos resultados (NR-17 item 17.3.3)',
    perguntas: [
      { pergunta: 'Participação dos trabalhadores', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Validação dos resultados', obrigatoria: true, eliminatoria: false, opcoes: [] },
      { pergunta: 'Plano de acompanhamento', obrigatoria: true, eliminatoria: false, opcoes: [] },
    ],
  },
];

export const PSICOSSOCIAL_DEFAULT_STAGES: DefaultStage[] = [
  {
    titulo: 'Fatores Psicossociais',
    descricao: 'Avaliação de Riscos Psicossociais — fatores organizacionais e interpessoais',
    perguntas: [
      'Baixa clareza de papel/função',
      'Falta de suporte/apoio da liderança',
      'Falta de suporte/apoio da equipe',
      'Baixo reconhecimento / recompensas desproporcionais',
      'Pressão excessiva por metas',
      'Excesso de demanda / sobrecarga',
      'Baixa autonomia sobre o próprio trabalho',
      'Comunicação falha ou insuficiente',
      'Conflito interpessoal recorrente',
      'Indícios de assédio moral',
      'Ameaça ou violência (qualquer natureza)',
      'Isolamento (inclui trabalho remoto)',
      'Sobrecarga emocional',
      'Má gestão de mudanças organizacionais',
    ].map(q => ({ pergunta: q, obrigatoria: true, eliminatoria: false, opcoes: [...SCORE_OPTIONS] })),
  },
];

export const getDefaultStagesForType = (tipo: string): DefaultStage[] => {
  switch (tipo) {
    case 'aep': return AEP_DEFAULT_STAGES;
    case 'aet': return AET_DEFAULT_STAGES;
    case 'psicossocial': return PSICOSSOCIAL_DEFAULT_STAGES;
    default: return [];
  }
};
