import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { C, M, needsNewPage, drawHeader, drawFooter, sectionTitle } from './pdfShared';

interface PropostaData {
  empresa: string;
  contato: string;
  email: string;
  telefone: string;
  servicos: string[];
  colaboradores: number;
  periodo: string;
  valorMensal: number;
  totalContrato: number;
  exposicaoSemSistema: number;
  economiaPotencial: number;
}

function fmt(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export function generatePropostaPdf(data: PropostaData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();

  let y = drawHeader(doc, null, null);

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.navy);
  doc.text('PROPOSTA COMERCIAL', pw / 2, y + 4, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text(`Emitida em ${new Date().toLocaleDateString('pt-BR')}`, pw / 2, y + 10, { align: 'center' });
  y += 18;

  // Client info section
  y = sectionTitle(doc, 'Dados do Cliente', y);

  const clientRows = [
    ['Empresa', data.empresa || '—'],
    ['Contato', data.contato || '—'],
    ['E-mail', data.email || '—'],
    ['Telefone', data.telefone || '—'],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [],
    body: clientRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 }, textColor: C.text },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, textColor: C.navy },
      1: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: C.stripe },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Services section
  y = needsNewPage(doc, y, 40);
  y = sectionTitle(doc, 'Serviços Contratados', y);

  const serviceRows = data.servicos.map((s, i) => [`${i + 1}`, s]);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['#', 'Serviço']],
    body: serviceRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 }, textColor: C.text },
    headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 0: { cellWidth: 12, halign: 'center' } },
    alternateRowStyles: { fillColor: C.stripe },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Financial section
  y = needsNewPage(doc, y, 55);
  y = sectionTitle(doc, 'Condições Comerciais', y);

  const finRows = [
    ['Colaboradores', `${data.colaboradores}`],
    ['Período', data.periodo],
    ['Valor mensal', fmt(data.valorMensal)],
    ['Total do contrato', fmt(data.totalContrato)],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [],
    body: finRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 }, textColor: C.text },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, textColor: C.navy },
      1: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: C.stripe },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ROI section
  y = needsNewPage(doc, y, 45);
  y = sectionTitle(doc, 'Análise de Retorno (ROI)', y);

  const roiRows = [
    ['Exposição sem sistema', fmt(data.exposicaoSemSistema)],
    ['Economia potencial', fmt(data.economiaPotencial)],
    ['ROI estimado', `${data.totalContrato > 0 ? ((data.economiaPotencial / data.totalContrato) * 100).toFixed(0) : 0}%`],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [],
    body: roiRows,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: C.text },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: C.navy },
      1: { fontStyle: 'bold', cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: [235, 248, 240] as any },
    didParseCell: (hookData) => {
      if (hookData.row.index === 2) {
        hookData.cell.styles.textColor = C.green;
        hookData.cell.styles.fontSize = 11;
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 14;

  // Signatures
  y = needsNewPage(doc, y, 30);
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.4);
  doc.line(M + 5, y, M + 70, y);
  doc.line(pw - M - 70, y, pw - M - 5, y);
  y += 4;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('ERGON — Responsável Comercial', M + 5, y);
  doc.text('Cliente — Responsável', pw - M - 70, y);

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages, 'Proposta Comercial');
  }

  const filename = `proposta-ergon-${(data.empresa || 'empresa').replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(filename);
}
