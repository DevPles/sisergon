import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadPdfFromDoc, loadBrandLogo, loadImageAsBase64, resizeImage } from '@/utils/pdfDownload';

const C = {
  navy:   [22, 45, 80]   as [number, number, number],
  blue:   [30, 90, 160]  as [number, number, number],
  green:  [34, 139, 34]  as [number, number, number],
  amber:  [210, 140, 0]  as [number, number, number],
  red:    [200, 30, 50]  as [number, number, number],
  bg:     [245, 247, 250] as [number, number, number],
  hdr:    [240, 243, 248] as [number, number, number],
  white:  [255, 255, 255] as [number, number, number],
  text:   [30, 30, 30]   as [number, number, number],
  muted:  [120, 130, 140] as [number, number, number],
};

const SCORE_MAP: Record<number, string> = { 0: 'Adequado', 1: 'Leve', 2: 'Moderado', 3: 'Alto' };
const classLabel = (c: string) => ({ baixo: 'BAIXO', moderado: 'MODERADO', alto: 'ALTO', critico: 'CRITICO' }[c] || c.toUpperCase());
const classColor = (c: string): [number, number, number] => ({ baixo: C.green, moderado: C.amber, alto: C.red, critico: C.red }[c] || C.text);

export interface ArpReportData {
  title: string;
  empresa: string;
  companyLogoUrl?: string;
  cnpj?: string;
  cnae?: string;
  grauRisco?: number;
  setor?: string;
  evaluator?: string;
  date: string;
  finalizedAt?: string;
  description?: string;
  totalScore: number;
  classification: string;
  hasCritical: boolean;
  questions: { number: number; text: string; value: number; comment?: string }[];
}

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
  doc.text('ERGON — Laudo Tecnico ARP — Documento confidencial', M, ph - 9);
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

export async function generateArpPdf(data: ArpReportData, options: { autoDownload?: boolean } = {}) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();

  const [brandLogo, companyLogo] = await Promise.all([
    loadBrandLogo(),
    data.companyLogoUrl ? loadImageAsBase64(data.companyLogoUrl).then(r => r ? resizeImage(r, 220, 120) : null) : Promise.resolve(null),
  ]);

  let y = hdr(doc, brandLogo, companyLogo);

  // Title
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.navy);
  doc.text('LAUDO DE AVALIACAO DE RISCOS PSICOSSOCIAIS (ARP)', pw / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
  doc.text('Conforme NR-1 e NR-17 — Fatores Psicossociais e Organizacionais', pw / 2, y, { align: 'center' });
  doc.setTextColor(...C.text);
  y += 7;

  // 1. Identification
  y = sec(doc, '1. IDENTIFICACAO', y);
  const idRows = [
    ['Titulo', data.title],
    ['Empresa / Razao Social', data.empresa],
    ['CNPJ', data.cnpj || '—'],
    ['CNAE', data.cnae || '—'],
    ['Grau de Risco (NR-4)', data.grauRisco ? String(data.grauRisco) : '—'],
    ['Setor', data.setor || '—'],
    ['Avaliador', data.evaluator || '—'],
    ['Data da Avaliacao', data.date],
    ['Data de Finalizacao', data.finalizedAt || '—'],
  ];
  autoTable(doc, {
    startY: y, body: idRows, theme: 'plain',
    styles: { fontSize: 8, cellPadding: { top: 1.2, bottom: 1.2, left: 3, right: 3 } },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48, fillColor: C.hdr }, 1: { cellWidth: 'auto' } },
    alternateRowStyles: { fillColor: [252, 252, 255] },
    margin: { left: M, right: M }, tableLineColor: [200, 210, 220], tableLineWidth: 0.15,
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // Description
  if (data.description) {
    y = np(doc, y, 25);
    y = sec(doc, '2. OBSERVACOES', y);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    const dl = doc.splitTextToSize(data.description, pw - M * 2 - 6);
    doc.setFillColor(...C.bg);
    doc.roundedRect(M, y, pw - M * 2, dl.length * 3.2 + 5, 1, 1, 'F');
    doc.text(dl, M + 3, y + 3.5);
    y += dl.length * 3.2 + 8;
  }

  // 3. Global result
  const sn = data.description ? 3 : 2;
  y = np(doc, y, 40);
  y = sec(doc, `${sn}. RESULTADO GLOBAL`, y);

  const [cr, cg, cb] = classColor(data.classification);
  doc.setFillColor(...C.bg);
  doc.roundedRect(M, y, pw - M * 2, 20, 2, 2, 'F');

  doc.setFontSize(24); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.navy);
  doc.text(data.totalScore.toFixed(1), M + 8, y + 13);
  doc.setFontSize(9); doc.text('/ 100', M + 32, y + 13);

  doc.setFillColor(cr, cg, cb);
  const ct = classLabel(data.classification);
  const cw = doc.getTextWidth(ct) + 8;
  doc.roundedRect(M + 50, y + 5, cw, 9, 2, 2, 'F');
  doc.setFontSize(9); doc.setTextColor(...C.white);
  doc.text(ct, M + 50 + cw / 2, y + 11, { align: 'center' });
  doc.setTextColor(...C.text);

  if (data.hasCritical) {
    doc.setFillColor(...C.red);
    doc.roundedRect(M + 50 + cw + 4, y + 5, 55, 9, 2, 2, 'F');
    doc.setFontSize(7.5); doc.setTextColor(...C.white);
    doc.text('ALERTA CONFIDENCIAL', M + 50 + cw + 4 + 27.5, y + 11, { align: 'center' });
    doc.setTextColor(...C.text);
  }
  y += 24;

  // 4. Detail per question
  const ds = sn + 1;
  y = np(doc, y, 25);
  y = sec(doc, `${ds}. DETALHAMENTO POR FATOR`, y);

  const qRows = data.questions.map(q => [
    `${q.number}) ${q.text}`,
    SCORE_MAP[q.value] ?? String(q.value),
    q.comment || '—',
  ]);
  autoTable(doc, {
    startY: y, head: [['Fator Psicossocial', 'Nivel', 'Observacao']], body: qRows, theme: 'grid',
    headStyles: { fillColor: C.navy, textColor: 255, fontSize: 8, fontStyle: 'bold' },
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
  y = (doc as any).lastAutoTable.finalY + 6;

  // 5. Legal
  const ls = ds + 1;
  y = np(doc, y, 45);
  y = sec(doc, `${ls}. FUNDAMENTACAO LEGAL`, y);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  const legal = [
    'Este laudo foi elaborado em conformidade com:',
    '',
    '- NR-1 — Gerenciamento de Riscos Ocupacionais (GRO/PGR)',
    '- NR-17 — Ergonomia (Portaria MTP n. 423/2021)',
    '- Convencao OIT n. 155 — Seguranca e Saude dos Trabalhadores',
    '- Fatores psicossociais conforme diretrizes da OMS/OIT',
    '',
    'Criterios de classificacao:',
    '  Baixo (0-33): fator controlado, monitoramento periodico',
    '  Moderado (34-66): acoes corretivas necessarias em ate 90 dias',
    '  Alto (67-100): intervencao imediata necessaria',
  ];
  for (const l of legal) { y = np(doc, y, 4); doc.text(l, M + 2, y); y += 3.3; }
  y += 3;

  // 6. Recommendations
  const rs = ls + 1;
  y = np(doc, y, 35);
  y = sec(doc, `${rs}. RECOMENDACOES`, y);
  doc.setFontSize(7.5);
  const recs = data.classification === 'baixo'
    ? ['- Manter condicoes atuais com monitoramento periodico.', '- Manter canais de comunicacao abertos.', '- Reavaliacao conforme periodicidade do PGR.']
    : data.classification === 'moderado'
      ? ['- Implementar programa de gestao de riscos psicossociais.', '- Realizar escuta ativa com trabalhadores afetados.', '- Revisar organizacao do trabalho nos setores criticos.', '- Reavaliacao em prazo maximo de 90 dias.']
      : ['- ACAO IMEDIATA: Investigar fatores criticos identificados.', '- Acionar programa de apoio psicologico aos trabalhadores.', '- Avaliar necessidade de mediacao de conflitos.', '- Revisar politicas de assedio e violencia.', '- Comunicar SESMT e RH para providencias.', '- Reavaliacao em prazo maximo de 30 dias.'];
  for (const r of recs) { y = np(doc, y, 5); doc.text(r, M + 2, y); y += 3.8; }

  // Signatures
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

  const fn = `Laudo_ARP_${(data.empresa || 'empresa').replace(/\s+/g, '_')}_${data.date.replace(/\//g, '-')}.pdf`;
  if (options.autoDownload !== false) downloadPdfFromDoc(doc, fn);
}
