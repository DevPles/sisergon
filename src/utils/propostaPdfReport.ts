import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { C, M, needsNewPage, drawFooter, sectionTitle, subHeader } from './pdfShared';
import { loadBrandLogo } from './pdfDownload';

interface ServiceDetail {
  label: string;
  description: string;
  riskContext: string;
  riskReduction: number;
  avgLawsuitCost: number;
  category: string;
}

interface PropostaData {
  empresa: string;
  contato: string;
  email: string;
  telefone: string;
  porte: string;
  ramo: string;
  servicosDetalhados: ServiceDetail[];
  colaboradores: number;
  periodo: string;
  valorMensal: number;
  totalContrato: number;
  exposicaoSemSistema: number;
  economiaPotencial: number;
  avgReduction: number;
  logoUrl?: string;
}

function fmt(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

async function loadImage(url: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } catch { return null; }
}

export async function generatePropostaPdf(data: PropostaData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();

  // ─── COVER HEADER ───
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pw, 50, 'F');

  // Logo Ergon (brand)
  const brandLogo = await loadBrandLogo();
  if (brandLogo) {
    try { doc.addImage(brandLogo, 'PNG', M, 10, 40, 28); } catch { /* */ }
  }

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('PROPOSTA COMERCIAL', pw - M, 22, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('ERGON — Gestão Ergonômica e Saúde Ocupacional', pw - M, 30, { align: 'right' });
  doc.setFontSize(8);
  doc.text(`Emitida em ${new Date().toLocaleDateString('pt-BR')}`, pw - M, 38, { align: 'right' });

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(M, 54, pw - M, 54);
  doc.setTextColor(...C.text);
  let y = 60;

  // ─── DADOS DO CLIENTE ───
  y = sectionTitle(doc, 'Dados do Cliente', y);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [],
    body: [
      ['Empresa', data.empresa || '—'],
      ['Porte', data.porte || '—'],
      ['Ramo de Atuação', data.ramo || '—'],
      ['Contato', data.contato || '—'],
      ['E-mail', data.email || '—'],
      ['Telefone', data.telefone || '—'],
      ['Nº de Colaboradores', `${data.colaboradores}`],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 }, textColor: C.text },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, textColor: C.navy }, 1: { cellWidth: 'auto' } },
    alternateRowStyles: { fillColor: C.stripe },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ─── SERVIÇOS CONTRATADOS (detalhado) ───
  y = needsNewPage(doc, y, 30);
  y = sectionTitle(doc, 'Serviços Contratados', y);

  const categoryLabels: Record<string, string> = {
    essential: 'Proteção Essencial',
    advanced: 'Monitoramento Avançado',
    premium: 'Cobertura Total',
  };

  const grouped: Record<string, ServiceDetail[]> = {};
  data.servicosDetalhados.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  for (const cat of ['essential', 'advanced', 'premium']) {
    const items = grouped[cat];
    if (!items?.length) continue;

    y = needsNewPage(doc, y, 25);
    y = subHeader(doc, categoryLabels[cat] || cat, y);
    y += 3; // spacing between category label and first service

    for (const svc of items) {
      y = needsNewPage(doc, y, 22);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.navy);
      doc.text(svc.label, M + 3, y);
      y += 4;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.text);
      doc.text(svc.description, M + 3, y);
      y += 4;

      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text(`Contexto de risco: ${svc.riskContext}`, M + 3, y);
      y += 4;

      doc.setTextColor(...C.green);
      doc.setFont('helvetica', 'bold');
      doc.text(`Redução estimada: ${Math.round(svc.riskReduction * 100)}%  ·  Custo médio evitado: ${fmt(svc.avgLawsuitCost)}`, M + 3, y);
      doc.setTextColor(...C.text);
      y += 7;
    }
  }

  // ─── BENEFÍCIOS INCLUSOS ───
  y = needsNewPage(doc, y, 50);
  y = sectionTitle(doc, 'Benefícios Inclusos no Sistema Ergon', y);

  const benefits = [
    ['Conformidade Legal', 'Adequação total às normas NR-1, NR-7, NR-17 e exigências do MTE'],
    ['Proteção Jurídica', 'Laudos com validade jurídica assinados — a prova documental que reduz condenações'],
    ['Redução de Passivos', 'Evidências contínuas que minimizam riscos de ações trabalhistas e multas'],
    ['Rastreabilidade', 'Histórico completo para auditorias, fiscalizações e perícias judiciais'],
    ['Gestão Centralizada', 'Painel executivo com indicadores, alertas e relatórios em tempo real'],
    ['Suporte Técnico', 'Acompanhamento e orientação para tomada de decisão estratégica'],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Benefício', 'Descrição']],
    body: benefits,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: C.text },
    headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: C.navy } },
    alternateRowStyles: { fillColor: C.stripe },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ─── CONDIÇÕES COMERCIAIS ───
  y = needsNewPage(doc, y, 50);
  y = sectionTitle(doc, 'Condições Comerciais', y);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [],
    body: [
      ['Período contratado', data.periodo],
      ['Valor mensal', fmt(data.valorMensal)],
      ['Total do contrato', fmt(data.totalContrato)],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: C.text },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: C.navy } },
    alternateRowStyles: { fillColor: C.stripe },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ─── ANÁLISE DE RETORNO (ROI) ───
  y = needsNewPage(doc, y, 55);
  y = sectionTitle(doc, 'Análise de Retorno sobre Investimento (ROI)', y);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  const roiIntro = `Com base no porte da empresa (${data.colaboradores} colaboradores), ramo de atuação (${data.ramo}) e serviços selecionados, a exposição financeira sem sistema de gestão é estimada em ${fmt(data.exposicaoSemSistema)}. A implementação do Ergon proporciona uma redução média de ${Math.round(data.avgReduction * 100)}% dos riscos mapeados.`;
  const splitIntro = doc.splitTextToSize(roiIntro, pw - M * 2 - 6);
  doc.text(splitIntro, M + 3, y);
  y += splitIntro.length * 4 + 4;

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Indicador', 'Valor']],
    body: [
      ['Exposição sem sistema', fmt(data.exposicaoSemSistema)],
      ['Economia potencial estimada', fmt(data.economiaPotencial)],
      ['Investimento (contrato)', fmt(data.totalContrato)],
      ['ROI estimado', `${data.totalContrato > 0 ? ((data.economiaPotencial / data.totalContrato) * 100).toFixed(0) : 0}%`],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: C.text },
    headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60, textColor: C.navy }, 1: { fontStyle: 'bold' } },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.row.index === 3) {
        hookData.cell.styles.textColor = C.green;
        hookData.cell.styles.fontSize = 12;
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ─── VALIDADE ───
  y = needsNewPage(doc, y, 20);
  doc.setFillColor(...C.hdr);
  doc.roundedRect(M, y, pw - M * 2, 10, 1.2, 1.2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('Esta proposta tem validade de 15 dias a partir da data de emissão.', pw / 2, y + 6.5, { align: 'center' });
  y += 20;

  // ─── ASSINATURAS ───
  y = needsNewPage(doc, y, 40);
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.4);
  doc.line(M + 5, y, M + 75, y);
  doc.line(pw - M - 75, y, pw - M - 5, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('ERGON — Responsável Comercial', M + 5, y);
  doc.text(`Cliente — ${data.contato || 'Responsável'}`, pw - M - 75, y);

  // ─── FOOTERS ───
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages, 'Proposta Comercial');
  }

  const filename = `proposta-ergon-${(data.empresa || 'empresa').replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(filename);
}
