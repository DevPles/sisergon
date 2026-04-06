import jsPDF from 'jspdf';

export const C = {
  navy: [18, 40, 75] as [number, number, number],
  blue: [30, 80, 150] as [number, number, number],
  accent: [45, 100, 170] as [number, number, number],
  green: [30, 130, 60] as [number, number, number],
  amber: [200, 140, 10] as [number, number, number],
  red: [190, 35, 50] as [number, number, number],
  darkRed: [140, 10, 10] as [number, number, number],
  bg: [246, 248, 252] as [number, number, number],
  hdr: [235, 240, 248] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [25, 30, 38] as [number, number, number],
  muted: [110, 120, 135] as [number, number, number],
  border: [200, 210, 225] as [number, number, number],
  stripe: [250, 251, 254] as [number, number, number],
};

export const M = 14;

export function needsNewPage(doc: jsPDF, y: number, need: number) {
  if (y + need > doc.internal.pageSize.getHeight() - 22) {
    doc.addPage();
    return 18;
  }
  return y;
}

export function drawHeader(doc: jsPDF, brandLogo: string | null, companyLogo: string | null) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pw, 3, 'F');

  let logoEndX = M;
  if (brandLogo) {
    try { doc.addImage(brandLogo, 'PNG', M, 8, 48, 18); logoEndX = M + 52; } catch { /* */ }
  }
  if (companyLogo) {
    try { doc.addImage(companyLogo, 'PNG', logoEndX, 9, 24, 16); } catch { /* */ }
  }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text('ERGON', pw - M, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text('Sistema de Gestão Ergonômica', pw - M, 16, { align: 'right' });
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, pw - M, 20, { align: 'right' });
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(M, 28, pw - M, 28);
  doc.setTextColor(...C.text);
  return 32;
}

export function drawFooter(doc: jsPDF, pg: number, total: number, docType: string) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(M, ph - 14, pw - M, ph - 14);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(`ERGON — ${docType} — Documento confidencial`, M, ph - 9);
  doc.text(`Página ${pg} de ${total}`, pw - M, ph - 9, { align: 'right' });
  doc.setFontSize(5);
  doc.text('www.sisergon.com', pw / 2, ph - 9, { align: 'center' });
  doc.setTextColor(...C.text);
}

export function sectionTitle(doc: jsPDF, label: string, y: number) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.navy);
  doc.roundedRect(M, y, pw - M * 2, 7.5, 1.2, 1.2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text(label.toUpperCase(), M + 4, y + 5.2);
  doc.setTextColor(...C.text);
  return y + 11;
}

export function subHeader(doc: jsPDF, label: string, y: number) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.hdr);
  doc.roundedRect(M + 1, y, pw - (M + 1) * 2, 6.5, 0.8, 0.8, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.15);
  doc.roundedRect(M + 1, y, pw - (M + 1) * 2, 6.5, 0.8, 0.8, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text(label, M + 5, y + 4.5);
  doc.setTextColor(...C.text);
  return y + 9;
}

export function drawSignatures(doc: jsPDF, y: number, evaluator?: string) {
  const pw = doc.internal.pageSize.getWidth();
  y += 14;
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.4);
  doc.line(M + 5, y, M + 70, y);
  doc.line(pw - M - 70, y, pw - M - 5, y);
  y += 4;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('Avaliador Responsável', M + 5, y);
  doc.text('Responsável pela Empresa', pw - M - 70, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.text);
  doc.text(evaluator || '_______________', M + 5, y);
  return y + 8;
}
