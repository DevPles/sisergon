import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { C, M, needsNewPage, drawHeader, drawFooter, sectionTitle } from './pdfShared';
import { downloadPdfFromDoc, loadBrandLogo, loadImageAsBase64 } from './pdfDownload';
import { fetchCompanyBranding } from './reportBranding';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmt = (d: string | null) => d ? format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

/* ═══════════════════════════════════════════
   RELATÓRIO INDIVIDUAL DO COLABORADOR
   ═══════════════════════════════════════════ */
export async function generateColaboradorDossiePdf(colaboradorId: string) {
  const [colabRes, assessRes, atestRes, checkRes, plansRes, pcmsoRes, testRes] = await Promise.all([
    supabase.from('colaboradores').select('*, empresas(razao_social, nome_fantasia, cnpj, logo_url), cargos(nome), setores(nome), unidades(nome)').eq('id', colaboradorId).single(),
    supabase.from('assessments').select('*').eq('colaborador_id', colaboradorId).order('created_at', { ascending: false }),
    supabase.from('atestados').select('*').eq('colaborador_id', colaboradorId).order('data_inicio', { ascending: false }),
    supabase.from('checklists').select('*').eq('colaborador_id', colaboradorId).order('created_at', { ascending: false }),
    supabase.from('action_plans').select('*').eq('empresa_id', '').or(`created_by.eq.${colaboradorId}`),
    supabase.from('pcmso_eventos').select('*').eq('colaborador_id', colaboradorId).order('data_prevista', { ascending: false }),
    supabase.from('employee_test_results').select('*, test_templates(nome, tipo)').eq('colaborador_id', colaboradorId).order('created_at', { ascending: false }),
  ]);

  const colab = colabRes.data as any;
  if (!colab) throw new Error('Colaborador não encontrado');

  const empresa = colab.empresas as any;
  const assessments = (assessRes.data ?? []) as any[];
  const atestados = (atestRes.data ?? []) as any[];
  const checklists = (checkRes.data ?? []) as any[];
  const pcmsoEventos = (pcmsoRes.data ?? []) as any[];
  const testResults = (testRes.data ?? []) as any[];

  // Also fetch action plans for the colaborador's empresa
  let actionPlans: any[] = [];
  if (colab.empresa_id) {
    const { data } = await supabase.from('action_plans').select('*').eq('empresa_id', colab.empresa_id).order('created_at', { ascending: false });
    actionPlans = data ?? [];
  }

  const brandLogo = await loadBrandLogo();
  let companyLogo: string | null = null;
  if (empresa?.logo_url) companyLogo = await loadImageAsBase64(empresa.logo_url);

  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();

  let y = drawHeader(doc, brandLogo, companyLogo);

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text('DOSSIÊ DO COLABORADOR', pw / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pw / 2, y, { align: 'center' });
  y += 10;

  // ── Dados Pessoais ──
  y = sectionTitle(doc, 'Dados do Colaborador', y);
  const infoData = [
    ['Nome Completo', colab.nome_completo || '—'],
    ['CPF', colab.cpf || '—'],
    ['Matrícula', colab.matricula || '—'],
    ['Data de Nascimento', fmt(colab.data_nascimento)],
    ['Sexo', colab.sexo || '—'],
    ['Status', colab.status || '—'],
    ['Empresa', empresa?.razao_social || '—'],
    ['Unidade', (colab.unidades as any)?.nome || '—'],
    ['Setor', (colab.setores as any)?.nome || '—'],
    ['Cargo', (colab.cargos as any)?.nome || '—'],
    ['Data Admissão', fmt(colab.data_admissao)],
    ['Jornada', colab.jornada || '—'],
    ['Turno', colab.turno || '—'],
    ['Gestor Responsável', colab.gestor_responsavel || '—'],
  ];

  autoTable(doc, {
    startY: y,
    body: infoData,
    theme: 'plain',
    margin: { left: M, right: M },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, textColor: C.navy },
      1: { textColor: C.text },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Avaliações ──
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, `Avaliações (${assessments.length})`, y);

  if (assessments.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'Título', 'Data', 'Status', 'Classificação Risco', 'Score']],
      body: assessments.map((a: any) => [
        (a.type || '').toUpperCase(),
        a.title || '—',
        fmt(a.created_at),
        a.status || '—',
        a.risk_classification || '—',
        a.score_total != null ? String(a.score_total) : '—',
      ]),
      theme: 'grid',
      margin: { left: M, right: M },
      headStyles: { fillColor: C.navy, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [250, 251, 254] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(8); doc.setTextColor(...C.muted);
    doc.text('Nenhuma avaliação registrada.', M + 4, y + 4); y += 10;
  }

  // ── Atestados ──
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, `Atestados (${atestados.length})`, y);

  if (atestados.length > 0) {
    const totalDias = atestados.reduce((s: number, a: any) => s + (a.dias || 0), 0);
    doc.setFontSize(8); doc.setTextColor(...C.navy); doc.setFont('helvetica', 'bold');
    doc.text(`Total de dias de afastamento: ${totalDias}`, M + 4, y + 2); y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'CID', 'Início', 'Fim', 'Dias', 'Observações']],
      body: atestados.map((a: any) => [
        a.tipo || '—', a.cid || '—', fmt(a.data_inicio), fmt(a.data_fim), String(a.dias || 0), a.observacoes || '—',
      ]),
      theme: 'grid', margin: { left: M, right: M },
      headStyles: { fillColor: C.navy, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [250, 251, 254] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(8); doc.setTextColor(...C.muted);
    doc.text('Nenhum atestado registrado.', M + 4, y + 4); y += 10;
  }

  // ── PCMSO - Eventos de Saúde Ocupacional ──
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, `Eventos PCMSO (${pcmsoEventos.length})`, y);

  if (pcmsoEventos.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'Subtipo', 'Data Prevista', 'Data Realizada', 'Aptidão', 'Status', 'Observações']],
      body: pcmsoEventos.map((e: any) => [
        e.tipo || '—', e.subtipo || '—', fmt(e.data_prevista), fmt(e.data_realizada),
        e.aptidao || '—', e.status || '—', e.observacoes || '—',
      ]),
      theme: 'grid', margin: { left: M, right: M },
      headStyles: { fillColor: C.navy, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [250, 251, 254] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(8); doc.setTextColor(...C.muted);
    doc.text('Nenhum evento PCMSO registrado.', M + 4, y + 4); y += 10;
  }

  // ── Testes Comportamentais ──
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, `Testes Comportamentais (${testResults.length})`, y);

  if (testResults.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Teste', 'Tipo', 'Data Aplicação', 'Perfil Predominante', 'Status']],
      body: testResults.map((t: any) => [
        (t.test_templates as any)?.nome || '—',
        (t.test_templates as any)?.tipo || '—',
        fmt(t.applied_at || t.created_at),
        t.perfil_predominante || '—',
        t.status || '—',
      ]),
      theme: 'grid', margin: { left: M, right: M },
      headStyles: { fillColor: C.navy, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [250, 251, 254] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(8); doc.setTextColor(...C.muted);
    doc.text('Nenhum teste comportamental registrado.', M + 4, y + 4); y += 10;
  }

  // ── Checklists ──
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, `Checklists (${checklists.length})`, y);

  if (checklists.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Mês/Ano', 'Score', 'Confirmado']],
      body: checklists.map((ch: any) => [
        fmt(ch.created_at),
        ch.month && ch.year ? `${String(ch.month).padStart(2, '0')}/${ch.year}` : '—',
        ch.score != null ? String(ch.score) : '—',
        ch.confirmed_at ? 'Sim' : 'Não',
      ]),
      theme: 'grid', margin: { left: M, right: M },
      headStyles: { fillColor: C.navy, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [250, 251, 254] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(8); doc.setTextColor(...C.muted);
    doc.text('Nenhum checklist registrado.', M + 4, y + 4); y += 10;
  }

  // ── Planos de Ação ──
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, `Planos de Ação (${actionPlans.length})`, y);

  if (actionPlans.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Ação', 'Responsável', 'Prioridade', 'Prazo', 'Status']],
      body: actionPlans.slice(0, 50).map((p: any) => [
        p.action || '—', p.responsible || '—', p.priority || '—', fmt(p.due_date), p.status || '—',
      ]),
      theme: 'grid', margin: { left: M, right: M },
      headStyles: { fillColor: C.navy, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [250, 251, 254] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    doc.setFontSize(8); doc.setTextColor(...C.muted);
    doc.text('Nenhum plano de ação registrado.', M + 4, y + 4); y += 10;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages, 'Dossiê do Colaborador');
  }

  downloadPdfFromDoc(doc, `Dossie_${colab.nome_completo.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

/* ═══════════════════════════════════════════
   RELATÓRIO GERAL DA EMPRESA
   ═══════════════════════════════════════════ */
export async function generateEmpresaDossiePdf(empresaId: string) {
  const branding = await fetchCompanyBranding(empresaId);
  if (!branding) throw new Error('Empresa não encontrada');

  const [colabsRes, assessRes, atestRes, checksRes, plansRes, pagRes, pcmsoRes, testRes] = await Promise.all([
    supabase.from('colaboradores').select('*, cargos(nome), setores(nome)').eq('empresa_id', empresaId).order('nome_completo'),
    supabase.from('assessments').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
    supabase.from('atestados').select('*, colaboradores(nome_completo)').eq('empresa_id', empresaId).order('data_inicio', { ascending: false }),
    supabase.from('checklists').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
    supabase.from('action_plans').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
    supabase.from('empresa_pagamentos').select('*').eq('empresa_id', empresaId).order('data_vencimento', { ascending: false }),
    supabase.from('pcmso_eventos').select('*, colaboradores(nome_completo)').eq('empresa_id', empresaId).order('data_prevista', { ascending: false }),
    supabase.from('employee_test_results').select('*, colaboradores(nome_completo), test_templates(nome)').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
  ]);

  const colabs = (colabsRes.data ?? []) as any[];
  const assessments = (assessRes.data ?? []) as any[];
  const atestados = (atestRes.data ?? []) as any[];
  const checklists = (checksRes.data ?? []) as any[];
  const plans = (plansRes.data ?? []) as any[];
  const pagamentos = (pagRes.data ?? []) as any[];
  const pcmsoEventos = (pcmsoRes.data ?? []) as any[];
  const testResults = (testRes.data ?? []) as any[];

  const brandLogo = await loadBrandLogo();
  let companyLogo: string | null = null;
  if (branding.logo_url) companyLogo = await loadImageAsBase64(branding.logo_url);

  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();

  let y = drawHeader(doc, brandLogo, companyLogo);

  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.navy);
  doc.text('RELATÓRIO GERAL DA EMPRESA', pw / 2, y, { align: 'center' }); y += 8;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pw / 2, y, { align: 'center' }); y += 10;

  // ── Dados da Empresa ──
  y = sectionTitle(doc, 'Dados da Empresa', y);
  const empresaInfo = [
    ['Razão Social', branding.razao_social || '—'],
    ['Nome Fantasia', branding.nome_fantasia || '—'],
    ['CNPJ', branding.cnpj || '—'],
    ['Endereço', [branding.endereco_logradouro, branding.endereco_numero, branding.endereco_bairro, branding.endereco_cidade, branding.endereco_uf].filter(Boolean).join(', ') || '—'],
    ['CEP', branding.endereco_cep || '—'],
    ['Telefone', branding.responsavel_telefone || '—'],
    ['E-mail', branding.responsavel_email || '—'],
  ];

  autoTable(doc, {
    startY: y, body: empresaInfo, theme: 'plain', margin: { left: M, right: M },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40, textColor: C.navy }, 1: { textColor: C.text } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Resumo ──
  y = needsNewPage(doc, y, 25);
  y = sectionTitle(doc, 'Resumo Geral', y);

  const totalDiasAfast = atestados.reduce((s: number, a: any) => s + (a.dias || 0), 0);
  const riscoCritico = assessments.filter((a: any) => a.risk_classification === 'critico').length;
  const riscoAlto = assessments.filter((a: any) => a.risk_classification === 'alto').length;

  autoTable(doc, {
    startY: y,
    body: [
      ['Total Colaboradores', String(colabs.length), 'Total Avaliações', String(assessments.length)],
      ['Riscos Críticos', String(riscoCritico), 'Riscos Altos', String(riscoAlto)],
      ['Total Atestados', String(atestados.length), 'Dias Afastamento', String(totalDiasAfast)],
      ['Checklists', String(checklists.length), 'Planos de Ação', String(plans.length)],
      ['Eventos PCMSO', String(pcmsoEventos.length), 'Testes Aplicados', String(testResults.length)],
    ],
    theme: 'grid', margin: { left: M, right: M },
    styles: { fontSize: 8, cellPadding: 3, halign: 'center' },
    columnStyles: { 0: { fontStyle: 'bold', textColor: C.navy, halign: 'left' }, 2: { fontStyle: 'bold', textColor: C.navy, halign: 'left' } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Colaboradores ──
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, `Colaboradores (${colabs.length})`, y);
  if (colabs.length > 0) {
    autoTable(doc, {
      startY: y, head: [['Nome', 'Matrícula', 'Cargo', 'Setor', 'Status']],
      body: colabs.map((c: any) => [c.nome_completo, c.matricula || '—', (c.cargos as any)?.nome || '—', (c.setores as any)?.nome || '—', c.status]),
      theme: 'grid', margin: { left: M, right: M },
      headStyles: { fillColor: C.navy, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 }, alternateRowStyles: { fillColor: [250, 251, 254] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Avaliações ──
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, `Avaliações (${assessments.length})`, y);
  if (assessments.length > 0) {
    autoTable(doc, {
      startY: y, head: [['Tipo', 'Título', 'Data', 'Status', 'Risco', 'Score']],
      body: assessments.slice(0, 50).map((a: any) => [(a.type || '').toUpperCase(), a.title || '—', fmt(a.created_at), a.status || '—', a.risk_classification || '—', a.score_total != null ? String(a.score_total) : '—']),
      theme: 'grid', margin: { left: M, right: M },
      headStyles: { fillColor: C.navy, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 }, alternateRowStyles: { fillColor: [250, 251, 254] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── PCMSO ──
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, `Eventos PCMSO (${pcmsoEventos.length})`, y);
  if (pcmsoEventos.length > 0) {
    autoTable(doc, {
      startY: y, head: [['Colaborador', 'Tipo', 'Subtipo', 'Data Prevista', 'Aptidão', 'Status']],
      body: pcmsoEventos.slice(0, 50).map((e: any) => [(e.colaboradores as any)?.nome_completo || '—', e.tipo || '—', e.subtipo || '—', fmt(e.data_prevista), e.aptidao || '—', e.status || '—']),
      theme: 'grid', margin: { left: M, right: M },
      headStyles: { fillColor: C.navy, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 }, alternateRowStyles: { fillColor: [250, 251, 254] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Testes ──
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, `Testes Comportamentais (${testResults.length})`, y);
  if (testResults.length > 0) {
    autoTable(doc, {
      startY: y, head: [['Colaborador', 'Teste', 'Data', 'Perfil', 'Status']],
      body: testResults.slice(0, 50).map((t: any) => [(t.colaboradores as any)?.nome_completo || '—', (t.test_templates as any)?.nome || '—', fmt(t.applied_at || t.created_at), t.perfil_predominante || '—', t.status || '—']),
      theme: 'grid', margin: { left: M, right: M },
      headStyles: { fillColor: C.navy, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 }, alternateRowStyles: { fillColor: [250, 251, 254] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Planos de Ação ──
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, `Planos de Ação (${plans.length})`, y);
  if (plans.length > 0) {
    autoTable(doc, {
      startY: y, head: [['Ação', 'Responsável', 'Prioridade', 'Prazo', 'Status']],
      body: plans.slice(0, 50).map((p: any) => [p.action || '—', p.responsible || '—', p.priority || '—', fmt(p.due_date), p.status || '—']),
      theme: 'grid', margin: { left: M, right: M },
      headStyles: { fillColor: C.navy, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 }, alternateRowStyles: { fillColor: [250, 251, 254] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Atestados ──
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, `Atestados (${atestados.length})`, y);
  if (atestados.length > 0) {
    autoTable(doc, {
      startY: y, head: [['Colaborador', 'Tipo', 'CID', 'Início', 'Fim', 'Dias']],
      body: atestados.slice(0, 50).map((a: any) => [(a.colaboradores as any)?.nome_completo || '—', a.tipo || '—', a.cid || '—', fmt(a.data_inicio), fmt(a.data_fim), String(a.dias || 0)]),
      theme: 'grid', margin: { left: M, right: M },
      headStyles: { fillColor: C.navy, fontSize: 7.5, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2.5 }, alternateRowStyles: { fillColor: [250, 251, 254] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages, 'Relatório da Empresa');
  }

  const nomeArquivo = (branding.nome_fantasia || branding.razao_social || 'Empresa').replace(/\s+/g, '_');
  downloadPdfFromDoc(doc, `Relatorio_${nomeArquivo}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
