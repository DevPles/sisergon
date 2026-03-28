import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadPdfFromDoc, loadBrandLogo, loadImageAsBase64, resizeImage } from '@/utils/pdfDownload';

/* ── Cores ─────────────────────────────────────────────────────────────── */
const C = {
  navy:   [22, 45, 80]   as [number, number, number],
  blue:   [30, 90, 160]  as [number, number, number],
  green:  [34, 139, 34]  as [number, number, number],
  amber:  [210, 140, 0]  as [number, number, number],
  red:    [200, 30, 50]  as [number, number, number],
  darkRed:[139, 0, 0]    as [number, number, number],
  bg:     [245, 247, 250] as [number, number, number],
  hdr:    [240, 243, 248] as [number, number, number],
  white:  [255, 255, 255] as [number, number, number],
  text:   [30, 30, 30]   as [number, number, number],
  muted:  [120, 130, 140] as [number, number, number],
};

const SCORE_MAP: Record<number, string> = { 0: 'Adequado', 1: 'Leve', 2: 'Moderado', 3: 'Alto' };
const classLabel = (c: string) => ({ baixo: 'BAIXO', moderado: 'MODERADO', alto: 'ALTO', critico: 'CRITICO' }[c] || c.toUpperCase());
const classColor = (c: string): [number, number, number] => ({ baixo: C.green, moderado: C.amber, alto: C.red, critico: C.darkRed }[c] || C.text);

/* ── Tipos ─────────────────────────────────────────────────────────────── */
export interface AepReportData {
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
  description?: string;
  evaluator?: string;
  date: string;
  finalizedAt?: string;
  totalScore: number;
  classification: string;
  needsAet: boolean;
  blocks: {
    label: string;
    domain: string;
    weight: number;
    score: number;
    questions: { number: number; text: string; value: number; comment?: string }[];
  }[];
}

export interface PdfGenerationOptions { autoDownload?: boolean; }

/* ── Helpers ───────────────────────────────────────────────────────────── */
const M = 15;

function np(doc: jsPDF, y: number, need: number) {
  if (y + need > doc.internal.pageSize.getHeight() - 25) { doc.addPage(); return 20; }
  return y;
}

function hdr(doc: jsPDF, brand: string | null, company: string | null) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.navy); doc.rect(0, 0, pw, 3, 'F');
  let lx = M;
  if (brand) { try { doc.addImage(brand, 'PNG', M, 6, 40, 16); lx = M + 44; } catch { /* */ } }
  if (company) { try { doc.addImage(company, 'PNG', lx, 7, 22, 14); } catch { /* */ } }
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
  doc.text('ERGON — Sistema de Gestao Ergonomica', pw - M, 10, { align: 'right' });
  doc.text(`Emitido: ${new Date().toLocaleDateString('pt-BR')}`, pw - M, 14, { align: 'right' });
  doc.setDrawColor(...C.navy); doc.setLineWidth(0.4); doc.line(M, 24, pw - M, 24);
  doc.setTextColor(...C.text);
  return 28;
}

function ftr(doc: jsPDF, pg: number, total: number) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...C.muted); doc.setLineWidth(0.15); doc.line(M, ph - 14, pw - M, ph - 14);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
  doc.text('ERGON — Laudo Tecnico AEP — Documento confidencial', M, ph - 9);
  doc.text(`Pagina ${pg} de ${total}`, pw - M, ph - 9, { align: 'right' });
  doc.setTextColor(...C.text);
}

function sec(doc: jsPDF, label: string, y: number) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.navy);
  doc.roundedRect(M, y, pw - M * 2, 7, 1, 1, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white);
  doc.text(label, M + 3, y + 5);
  doc.setTextColor(...C.text);
  return y + 10;
}

/* ── Gerador AEP ──────────────────────────────────────────────────────── */
export async function generateAepPdf(data: AepReportData, options: PdfGenerationOptions = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();

  const [brandLogo, companyLogo] = await Promise.all([
    loadBrandLogo(),
    data.companyLogoUrl ? loadImageAsBase64(data.companyLogoUrl).then(r => r ? resizeImage(r, 220, 120) : null) : Promise.resolve(null),
  ]);

  let y = hdr(doc, brandLogo, companyLogo);

  // Titulo
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.navy);
  doc.text('LAUDO DE AVALIACAO ERGONOMICA PRELIMINAR (AEP)', pw / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
  doc.text('Conforme NR-17 item 17.1.1 — Portaria MTP n. 423/2021', pw / 2, y, { align: 'center' });
  doc.setTextColor(...C.text);
  y += 7;

  // ── 1. IDENTIFICACAO ──
  y = sec(doc, '1. IDENTIFICACAO', y);
  const idRows = [
    ['Titulo', data.title], ['Empresa / Razao Social', data.empresa],
    ['CNPJ', data.cnpj || '—'], ['CNAE', data.cnae || '—'],
    ['Grau de Risco (NR-4)', data.grauRisco ? String(data.grauRisco) : '—'],
    ['Unidade', data.unidade || '—'], ['Setor', data.setor || '—'],
    ['Cargo / Funcao', data.cargo || '—'], ['CBO', data.cbo || '—'],
    ['Avaliador', data.evaluator || '—'],
    ['Data da Avaliacao', data.date], ['Data de Finalizacao', data.finalizedAt || '—'],
  ];
  autoTable(doc, {
    startY: y, body: idRows, theme: 'plain',
    styles: { fontSize: 8, cellPadding: { top: 1.2, bottom: 1.2, left: 3, right: 3 } },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48, fillColor: C.hdr }, 1: { cellWidth: 'auto' } },
    alternateRowStyles: { fillColor: [252, 252, 255] },
    margin: { left: M, right: M }, tableLineColor: [200, 210, 220], tableLineWidth: 0.15,
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // ── 2. DESCRICAO DA ATIVIDADE ──
  if (data.description) {
    y = np(doc, y, 25);
    y = sec(doc, '2. DESCRICAO DA ATIVIDADE', y);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    const dl = doc.splitTextToSize(data.description, pw - M * 2 - 6);
    doc.setFillColor(...C.bg);
    doc.roundedRect(M, y, pw - M * 2, dl.length * 3.2 + 5, 1, 1, 'F');
    doc.text(dl, M + 3, y + 3.5);
    y += dl.length * 3.2 + 8;
  }

  // ── 3. RESULTADO GLOBAL ──
  const sn = data.description ? 3 : 2;
  y = np(doc, y, 40);
  y = sec(doc, `${sn}. RESULTADO GLOBAL`, y);

  const [cr, cg, cb] = classColor(data.classification);
  doc.setFillColor(...C.bg);
  doc.roundedRect(M, y, pw - M * 2, 20, 2, 2, 'F');

  doc.setFontSize(24); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.navy);
  doc.text(data.totalScore.toFixed(1), M + 8, y + 13);
  doc.setFontSize(9); doc.text('/ 100', M + 32, y + 13);

  // Badge classificacao
  doc.setFillColor(cr, cg, cb);
  const ct = classLabel(data.classification);
  const cw = doc.getTextWidth(ct) + 8;
  doc.roundedRect(M + 50, y + 5, cw, 9, 2, 2, 'F');
  doc.setFontSize(9); doc.setTextColor(...C.white);
  doc.text(ct, M + 50 + cw / 2, y + 11, { align: 'center' });
  doc.setTextColor(...C.text);

  if (data.needsAet) {
    doc.setFillColor(...C.red);
    doc.roundedRect(M + 50 + cw + 4, y + 5, 45, 9, 2, 2, 'F');
    doc.setFontSize(7.5); doc.setTextColor(...C.white);
    doc.text('NECESSITA AET', M + 50 + cw + 4 + 22.5, y + 11, { align: 'center' });
    doc.setTextColor(...C.text);
  }
  y += 24;

  // Tabela resumo blocos
  const blockRows = data.blocks.map(b => {
    const lvl = b.score <= (b.weight * 0.33) ? 'Baixo' : b.score <= (b.weight * 0.66) ? 'Moderado' : 'Alto';
    return [b.label, `${b.weight}%`, b.score.toFixed(1), lvl];
  });
  autoTable(doc, {
    startY: y, head: [['Bloco / Dominio', 'Peso', 'Score', 'Nivel']], body: blockRows, theme: 'grid',
    headStyles: { fillColor: C.navy, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    columnStyles: { 1: { halign: 'center', cellWidth: 18 }, 2: { halign: 'center', cellWidth: 18 }, 3: { halign: 'center', cellWidth: 22 } },
    didParseCell: (d: any) => {
      if (d.section === 'body' && d.column.index === 3) {
        const v = d.cell.raw as string;
        d.cell.styles.textColor = v === 'Alto' ? C.red : v === 'Moderado' ? C.amber : C.green;
        d.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── 4. DETALHAMENTO POR BLOCO ──
  const ds = sn + 1;
  data.blocks.forEach((block, bi) => {
    y = np(doc, y, 25);
    y = sec(doc, `${ds}.${bi + 1} ${block.label}`, y);

    const qRows = block.questions.map(q => [
      `${q.number}) ${q.text}`,
      SCORE_MAP[q.value] ?? String(q.value),
      q.comment || '—',
    ]);
    autoTable(doc, {
      startY: y, head: [['Pergunta', 'Resposta', 'Observacao']], body: qRows, theme: 'grid',
      headStyles: { fillColor: C.blue, textColor: 255, fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 1.3 },
      columnStyles: { 0: { cellWidth: 75 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 'auto' } },
      didParseCell: (d: any) => {
        if (d.section === 'body' && d.column.index === 1) {
          const v = d.cell.raw as string;
          if (v === 'Alto') d.cell.styles.textColor = C.red;
          else if (v === 'Moderado') d.cell.styles.textColor = C.amber;
        }
      },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // Interpretacao tecnica do bloco
    y = np(doc, y, 12);
    const lvl = block.score <= (block.weight * 0.33) ? 'baixo' : block.score <= (block.weight * 0.66) ? 'moderado' : 'alto';
    const interp = lvl === 'baixo'
      ? `O dominio "${block.label}" apresenta condicoes adequadas (score ${block.score.toFixed(1)}/${block.weight}). Manter monitoramento periodico.`
      : lvl === 'moderado'
        ? `O dominio "${block.label}" apresenta risco moderado (score ${block.score.toFixed(1)}/${block.weight}). Recomenda-se intervencoes corretivas em ate 90 dias.`
        : `O dominio "${block.label}" apresenta risco alto (score ${block.score.toFixed(1)}/${block.weight}). Acoes imediatas sao necessarias. Considerar AET especifica.`;

    doc.setFillColor(...C.bg);
    const interpLines = doc.splitTextToSize(interp, pw - M * 2 - 8);
    doc.roundedRect(M, y, pw - M * 2, interpLines.length * 3.2 + 4, 0.5, 0.5, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'italic');
    doc.text(interpLines, M + 4, y + 3);
    doc.setFont('helvetica', 'normal');
    y += interpLines.length * 3.2 + 7;
  });

  // ── 5. FUNDAMENTACAO LEGAL ──
  y = np(doc, y, 45);
  const ls = ds + 1;
  y = sec(doc, `${ls}. FUNDAMENTACAO LEGAL`, y);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  const legal = [
    'Este laudo foi elaborado em conformidade com:',
    '',
    '- NR-17 — Ergonomia (Portaria MTP n. 423, de 07 de outubro de 2021)',
    '- Item 17.1.1 — A organizacao deve realizar AEP das situacoes de trabalho.',
    '- Item 17.1.1.1 — A AEP pode ser realizada por abordagens qualitativas, semiquantitativas,',
    '  quantitativas ou combinacao dessas.',
    '- Item 17.1.2 — Quando indicado pela AEP, deve ser realizada AET.',
    '- NR-1 — Disposicoes Gerais e Gerenciamento de Riscos Ocupacionais (GRO/PGR)',
    '',
    'Criterios de classificacao:',
    '  Baixo (0-33): situacao adequada, monitoramento periodico',
    '  Moderado (34-66): acoes corretivas necessarias em ate 90 dias',
    '  Alto (67-100): intervencao imediata, necessidade de AET',
  ];
  for (const l of legal) { y = np(doc, y, 4); doc.text(l, M + 2, y); y += 3.3; }
  y += 3;

  // ── 6. RECOMENDACOES ──
  y = np(doc, y, 35);
  const rs = ls + 1;
  y = sec(doc, `${rs}. RECOMENDACOES TECNICAS`, y);
  doc.setFontSize(7.5);
  const recs = data.classification === 'baixo'
    ? ['- Manter condicoes atuais com monitoramento periodico.', '- Reavaliacao conforme periodicidade do PGR.', '- Manter programa de conscientizacao em ergonomia.']
    : data.classification === 'moderado'
      ? ['- Implementar plano de acao corretivo nos dominios com maior pontuacao.', '- Reavaliacao em prazo maximo de 90 dias.', '- Melhorias no posto de trabalho, mobiliario e organizacao.', '- Treinamento especifico em ergonomia.', '- Registrar acoes no Plano de Acao do PGR.']
      : ['- ACAO IMEDIATA: Realizar AET conforme NR-17 item 17.1.2.', '- Medidas emergenciais para reducao de exposicao ao risco.', '- Avaliar rodizio, pausas e reorganizacao da atividade.', '- Considerar redesenho do posto de trabalho.', '- Reavaliacao em prazo maximo de 30 dias.', '- Comunicar SESMT e CIPA sobre os riscos identificados.', '- Registrar todas as acoes no PGR com prazos definidos.'];
  for (const r of recs) { y = np(doc, y, 5); doc.text(r, M + 2, y); y += 3.8; }

  // ── Assinaturas ──
  y = np(doc, y, 28);
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
  for (let i = 1; i <= pages; i++) { doc.setPage(i); ftr(doc, i, pages); }

  // Download
  const fn = `Laudo_AEP_${(data.empresa || 'empresa').replace(/\s+/g, '_')}_${data.date.replace(/\//g, '-')}.pdf`;
  if (options.autoDownload !== false) downloadPdfFromDoc(doc, fn);
}
