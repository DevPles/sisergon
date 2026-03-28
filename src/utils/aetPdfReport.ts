import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadPdfFromDoc, loadBrandLogo, loadImageAsBase64, resizeImage } from '@/utils/pdfDownload';

/* ── Cores ─────────────────────────────────────────────────────────────── */
const C = {
  navy:   [22, 45, 80]   as [number, number, number],
  blue:   [30, 90, 160]  as [number, number, number],
  green:  [34, 139, 34]  as [number, number, number],
  red:    [200, 30, 50]  as [number, number, number],
  bg:     [245, 247, 250] as [number, number, number],
  hdr:    [240, 243, 248] as [number, number, number],
  white:  [255, 255, 255] as [number, number, number],
  text:   [30, 30, 30]   as [number, number, number],
  muted:  [120, 130, 140] as [number, number, number],
};

/* ── Tipos ─────────────────────────────────────────────────────────────── */
export interface AetReportData {
  title: string;
  empresa: string;
  companyLogoUrl?: string;
  cnpj?: string;
  cnae?: string;
  grauRisco?: number;
  unidade?: string;
  setor?: string;
  cargo?: string;
  cbo?: string;
  colaborador?: string;
  evaluator?: string;
  date: string;
  finalizedAt?: string;
  completionPercent?: number;
  sectionEntries: { title: string; content: string }[];
  checklist: { label: string; checked: boolean }[];
}

export interface PdfGenerationOptions { autoDownload?: boolean; }

/* ── Helpers ───────────────────────────────────────────────────────────── */
const M = 15; // margem

function needsNewPage(doc: jsPDF, y: number, need: number) {
  if (y + need > doc.internal.pageSize.getHeight() - 25) {
    doc.addPage();
    return 20;
  }
  return y;
}

function header(doc: jsPDF, brand: string | null, company: string | null) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pw, 3, 'F');
  let logoX = M;
  if (brand) { try { doc.addImage(brand, 'PNG', M, 6, 40, 16); logoX = M + 44; } catch { /* */ } }
  if (company) { try { doc.addImage(company, 'PNG', logoX, 7, 22, 14); } catch { /* */ } }
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
  doc.text('ERGON — Sistema de Gestao Ergonomica', pw - M, 10, { align: 'right' });
  doc.text(`Emitido: ${new Date().toLocaleDateString('pt-BR')}`, pw - M, 14, { align: 'right' });
  doc.setDrawColor(...C.navy); doc.setLineWidth(0.4); doc.line(M, 24, pw - M, 24);
  doc.setTextColor(...C.text);
  return 28;
}

function footer(doc: jsPDF, pg: number, total: number) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...C.muted); doc.setLineWidth(0.15); doc.line(M, ph - 14, pw - M, ph - 14);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
  doc.text('ERGON — Laudo Tecnico AET — Documento confidencial', M, ph - 9);
  doc.text(`Pagina ${pg} de ${total}`, pw - M, ph - 9, { align: 'right' });
  doc.setTextColor(...C.text);
}

function secTitle(doc: jsPDF, label: string, y: number) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.navy);
  doc.roundedRect(M, y, pw - M * 2, 7, 1, 1, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
  doc.text(label, M + 3, y + 5);
  doc.setTextColor(...C.text);
  return y + 10;
}

/* ── Gerador principal ─────────────────────────────────────────────────── */
export async function generateAetPdf(data: AetReportData, options: PdfGenerationOptions = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();

  // Logos
  const [brandLogo, companyLogo] = await Promise.all([
    loadBrandLogo(),
    data.companyLogoUrl ? loadImageAsBase64(data.companyLogoUrl).then(r => r ? resizeImage(r, 220, 120) : null) : Promise.resolve(null),
  ]);

  let y = header(doc, brandLogo, companyLogo);

  // Titulo
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.navy);
  doc.text('LAUDO DE ANALISE ERGONOMICA DO TRABALHO (AET)', pw / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
  doc.text('Conforme NR-17 item 17.3.3 — Portaria MTP n. 423/2021', pw / 2, y, { align: 'center' });
  doc.setTextColor(...C.text);
  y += 7;

  // ── 1. IDENTIFICACAO ──
  y = secTitle(doc, '1. IDENTIFICACAO DA SITUACAO DE TRABALHO', y);
  const idRows = [
    ['Titulo da AET', data.title],
    ['Empresa / Razao Social', data.empresa],
    ['CNPJ', data.cnpj || '—'],
    ['CNAE', data.cnae || '—'],
    ['Grau de Risco (NR-4)', data.grauRisco ? String(data.grauRisco) : '—'],
    ['Unidade / Estabelecimento', data.unidade || '—'],
    ['Setor / Departamento', data.setor || '—'],
    ['Cargo / Funcao', data.cargo || '—'],
    ['CBO', data.cbo || '—'],
    ['Colaborador de Referencia', data.colaborador || '—'],
    ['Avaliador Responsavel', data.evaluator || '—'],
    ['Data de Realizacao', data.date],
    ['Data de Finalizacao', data.finalizedAt || '—'],
    ['Preenchimento', data.completionPercent != null ? `${data.completionPercent}%` : '—'],
  ];
  autoTable(doc, {
    startY: y, body: idRows, theme: 'plain',
    styles: { fontSize: 8, cellPadding: { top: 1.2, bottom: 1.2, left: 3, right: 3 } },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: C.hdr }, 1: { cellWidth: 'auto' } },
    alternateRowStyles: { fillColor: [252, 252, 255] },
    margin: { left: M, right: M }, tableLineColor: [200, 210, 220], tableLineWidth: 0.15,
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // ── 2. CONTEUDO TECNICO (seções narrativas) ──
  y = needsNewPage(doc, y, 20);
  y = secTitle(doc, '2. CONTEUDO TECNICO DA ANALISE', y);

  const entries = data.sectionEntries.length > 0
    ? data.sectionEntries
    : [{ title: 'Descricao geral', content: 'Nenhuma secao narrativa foi registrada.' }];

  // Agrupar por seção principal (1. Demanda, 2. Análise, etc.)
  const sectionGroups: Record<string, { title: string; content: string }[]> = {};
  for (const entry of entries) {
    // Try to determine the group from the title
    let group = 'Geral';
    const lowerTitle = entry.title.toLowerCase();
    if (lowerTitle.includes('demanda') || lowerTitle.includes('origem') || lowerTitle.includes('contexto') || lowerTitle.includes('reformula') || lowerTitle.includes('popula')) group = '2.1 Demanda e Contextualizacao';
    else if (lowerTitle.includes('tarefa') || lowerTitle.includes('organizac') || lowerTitle.includes('mobiliari') || lowerTitle.includes('condicoes') || lowerTitle.includes('exigenc')) group = '2.2 Analise da Atividade';
    else if (lowerTitle.includes('abordagem') || lowerTitle.includes('tecnica') || lowerTitle.includes('instrumento') || lowerTitle.includes('periodo')) group = '2.3 Metodos e Tecnicas';
    else if (lowerTitle.includes('sintese') || lowerTitle.includes('fatores') || lowerTitle.includes('relac') || lowerTitle.includes('ponto')) group = '2.4 Diagnostico Ergonomico';
    else if (lowerTitle.includes('imediata') || lowerTitle.includes('curto') || lowerTitle.includes('medio') || lowerTitle.includes('hierarquia')) group = '2.5 Recomendacoes';
    else if (lowerTitle.includes('participa') || lowerTitle.includes('validac') || lowerTitle.includes('acompanha')) group = '2.6 Restituicao e Validacao';

    if (!sectionGroups[group]) sectionGroups[group] = [];
    sectionGroups[group].push(entry);
  }

  for (const [groupName, groupEntries] of Object.entries(sectionGroups)) {
    y = needsNewPage(doc, y, 20);

    // Sub-header
    doc.setFillColor(...C.bg);
    doc.roundedRect(M, y, pw - M * 2, 6, 0.5, 0.5, 'F');
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.navy);
    doc.text(groupName, M + 3, y + 4.2);
    doc.setTextColor(...C.text);
    y += 8;

    for (const entry of groupEntries) {
      y = needsNewPage(doc, y, 15);
      doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text(entry.title + ':', M + 2, y);
      y += 3.5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      const lines = doc.splitTextToSize(entry.content || 'Nao preenchido', pw - M * 2 - 6);
      for (const line of lines) {
        y = needsNewPage(doc, y, 4);
        doc.text(line, M + 4, y);
        y += 3.2;
      }
      y += 2;
    }
  }

  // ── 3. CHECKLIST NR-17 ──
  y = needsNewPage(doc, y, 25);
  y += 3;
  y = secTitle(doc, '3. CHECKLIST DE CONFORMIDADE NR-17', y);

  const ckRows = data.checklist.length > 0
    ? data.checklist.map(c => [c.label, c.checked ? 'CONFORME' : 'PENDENTE'])
    : [['Nenhum item registrado', '—']];

  autoTable(doc, {
    startY: y, head: [['Item avaliado', 'Status']], body: ckRows, theme: 'grid',
    headStyles: { fillColor: C.navy, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 28, halign: 'center', fontStyle: 'bold' } },
    didParseCell: (h: any) => {
      if (h.section === 'body' && h.column.index === 1) {
        h.cell.styles.textColor = h.cell.raw === 'CONFORME' ? C.green : C.red;
      }
    },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // Indice de conformidade
  const conformes = data.checklist.filter(c => c.checked).length;
  const total = data.checklist.length || 1;
  const pct = Math.round((conformes / total) * 100);
  y = needsNewPage(doc, y, 16);
  doc.setFillColor(...C.bg);
  doc.roundedRect(M, y, pw - M * 2, 12, 1, 1, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.navy);
  doc.text(`INDICE DE CONFORMIDADE NR-17: ${pct}%  (${conformes} de ${data.checklist.length} itens)`, M + 3, y + 7.5);
  doc.setTextColor(...C.text);
  y += 18;

  // ── 4. FUNDAMENTACAO LEGAL ──
  y = needsNewPage(doc, y, 40);
  y = secTitle(doc, '4. FUNDAMENTACAO LEGAL E ENCAMINHAMENTOS', y);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  const legal = [
    '- A presente AET foi desenvolvida conforme NR-17, item 17.3.3 (Portaria MTP n. 423/2021).',
    '- Os resultados subsidiam o plano de acao ergonomico e integram o PGR (NR-1).',
    '- Recomenda-se monitoramento continuo e reavaliacao apos implementacao das medidas.',
    '- Este documento constitui evidencia tecnica para auditorias e fiscalizacoes.',
    '- A participacao dos trabalhadores na analise e validacao e requisito da NR-17 item 17.3.3.',
  ];
  for (const l of legal) {
    y = needsNewPage(doc, y, 5);
    doc.text(l, M + 2, y); y += 3.8;
  }

  // ── 5. ASSINATURAS ──
  y = needsNewPage(doc, y, 30);
  y += 12;
  doc.setDrawColor(...C.navy); doc.setLineWidth(0.3);
  doc.line(M, y, M + 65, y);
  doc.line(pw - M - 65, y, pw - M, y);
  y += 3;
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text('Avaliador Responsavel', M, y);
  doc.text('Responsavel pela Empresa', pw - M - 65, y);
  y += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.evaluator || '_______________', M, y);

  // Footers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); footer(doc, i, pages); }

  // Download
  const fn = `Laudo_AET_${(data.empresa || 'empresa').replace(/\s+/g, '_')}_${data.date.replace(/\//g, '-')}.pdf`;
  if (options.autoDownload !== false) downloadPdfFromDoc(doc, fn);
}

