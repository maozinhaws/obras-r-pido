import type jsPDFType from "jspdf";
import { db, type Orcamento, calcularTotal, formatBRL, STATUS_LABELS } from "./db";
import { fotoDataURL } from "./fotos";
import { valorPorExtenso } from "./extenso";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

async function makeDoc(): Promise<jsPDFType> {
  const { default: jsPDF } = await import("jspdf");
  return new jsPDF({ unit: "mm", format: "a4" });
}

export async function gerarPdfOrcamento(o: Orcamento): Promise<Blob> {
  const config = (await db.config.get(1)) ?? { id: 1 as const };
  const doc = await makeDoc();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header brand bar
  doc.setFillColor(255, 95, 0);
  doc.rect(0, 0, pageW, 10, "F");

  // Empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(config.nome ?? "Pintor Plus", 15, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 10;
  if (config.documento) doc.text(`Doc: ${config.documento}`, 15, (y += 5));
  if (config.telefone) doc.text(`Tel: ${config.telefone}`, 15, (y += 5));
  if (config.email) doc.text(`Email: ${config.email}`, 15, (y += 5));
  if (config.endereco) doc.text(`End: ${config.endereco}`, 15, (y += 5));

  // Título orçamento
  y += 6;
  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.line(15, y, pageW - 15, y);
  y += 7;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`ORÇAMENTO #${o.id ?? "—"}`, 15, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    format(o.criadoEm, "dd/MM/yyyy", { locale: ptBR }),
    pageW - 15,
    y,
    { align: "right" },
  );
  y += 4;
  doc.text(`Status: ${STATUS_LABELS[o.status]}`, pageW - 15, y, { align: "right" });

  // Cliente
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", 15, y);
  doc.setFont("helvetica", "normal");
  y += 5;
  const c = o.clienteSnapshot;
  if (c) {
    doc.text(c.nome ?? "—", 15, y);
    if (c.telefone) doc.text(c.telefone, pageW - 15, y, { align: "right" });
    if (c.endereco) {
      y += 5;
      doc.text(c.endereco, 15, y);
    }
  }

  // Ambientes
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("AMBIENTES E ITENS", 15, y);
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(15, y, pageW - 15, y);
  doc.setFont("helvetica", "normal");

  for (const amb of o.ambientes) {
    y += 7;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text(amb.nome.toUpperCase(), 15, y);
    doc.setFont("helvetica", "normal");
    for (const item of amb.itens) {
      y += 5;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const dim = item.altura && item.comprimento
        ? `${item.altura}m x ${item.comprimento}m = ${(item.altura * item.comprimento).toFixed(2)}m²`
        : "";
      doc.text(`• ${item.nome} ${dim ? "(" + dim + ")" : ""}`, 18, y);
      doc.text(formatBRL(item.preco || 0), pageW - 15, y, { align: "right" });
      if (item.servicos.length) {
        y += 4;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`  Serviços: ${item.servicos.join(", ")}`, 18, y);
        doc.setTextColor(0);
        doc.setFontSize(9);
      }
      if (item.observacao) {
        y += 4;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`  Obs: ${item.observacao}`, 18, y);
        doc.setTextColor(0);
        doc.setFontSize(9);
      }
      // fotos pequenas (respeita toggle)
      if (item.fotos.length && o.incluirFotosPdf !== false) {
        let x = 18;
        y += 3;
        for (const fid of item.fotos.slice(0, 4)) {
          const data = await fotoDataURL(fid);
          if (!data) continue;
          if (y > 250) {
            doc.addPage();
            y = 20;
            x = 18;
          }
          try {
            doc.addImage(data, "JPEG", x, y, 25, 18);
            // marca d'água diagonal
            doc.saveGraphicsState?.();
            doc.setTextColor(255, 95, 0);
            doc.setFontSize(4);
            doc.text(config.nome ?? "PROTEGIDO", x + 12.5, y + 9, {
              align: "center",
              angle: -30,
            });
            doc.setTextColor(0);
            doc.restoreGraphicsState?.();
            x += 27;
          } catch {
            /* ignore */
          }
        }
        y += 19;
      }
    }
  }

  // Total
  y += 10;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setLineWidth(0.6);
  doc.line(15, y, pageW - 15, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TOTAL", 15, y);
  doc.text(formatBRL(calcularTotal(o)), pageW - 15, y, { align: "right" });

  // Detalhes
  y += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (o.formaPagamento) doc.text(`Forma de pagamento: ${o.formaPagamento}`, 15, (y += 5));
  if (o.validade) doc.text(`Validade: ${o.validade}`, 15, (y += 5));
  if (o.inicio) doc.text(`Início: ${o.inicio}`, 15, (y += 5));
  if (o.observacoes) {
    y += 6;
    doc.text("Observações:", 15, y);
    const lines = doc.splitTextToSize(o.observacoes, pageW - 30);
    y += 5;
    doc.text(lines, 15, y);
    y += lines.length * 4;
  }

  // Assinatura empresa
  if (config.assinatura) {
    y += 14;
    doc.line(60, y, pageW - 60, y);
    y += 4;
    doc.text(config.assinatura, pageW / 2, y, { align: "center" });
  }
  // Assinatura cliente
  if (o.assinaturaCliente) {
    y += 14;
    if (y > 260) { doc.addPage(); y = 30; }
    try {
      doc.addImage(o.assinaturaCliente, "PNG", pageW / 2 - 30, y - 14, 60, 18);
    } catch { /* ignore */ }
    doc.line(60, y, pageW - 60, y);
    y += 4;
    doc.setFontSize(8);
    doc.text(`Assinatura do cliente: ${o.clienteSnapshot?.nome ?? ""}`, pageW / 2, y, { align: "center" });
  }

  return doc.output("blob");
}

export async function gerarMensagemWhatsapp(o: Orcamento): Promise<string> {
  const config = await db.config.get(1);
  const intro = config?.mensagemPadraoWhats ?? "Olá! Segue o orçamento.";
  const total = calcularTotal(o);
  const formato = o.formatoMensagem ?? "completo";
  const cliente = o.clienteSnapshot?.nome ?? "—";

  if (formato === "simples") {
    return `${intro}\n\n*Cliente:* ${cliente}\n*Total:* ${formatBRL(total)}`;
  }

  if (formato === "area") {
    const ambs = o.ambientes
      .map((a) => {
        const m2 = a.itens.reduce(
          (acc, i) => acc + (i.altura && i.comprimento ? i.altura * i.comprimento : 0),
          0,
        );
        const valor = a.itens.reduce((acc, i) => acc + (i.preco || 0), 0);
        return `• ${a.nome}: ${m2.toFixed(2)}m² — ${formatBRL(valor)}`;
      })
      .join("\n");
    return `${intro}\n\n*Cliente:* ${cliente}\n\n*Ambientes:*\n${ambs}\n\n*Total:* ${formatBRL(total)}`;
  }

  // completo
  const detalhes = o.ambientes
    .map((a) => {
      const itens = a.itens
        .map((i) => `  - ${i.nome}${i.servicos.length ? ` (${i.servicos.join(", ")})` : ""}: ${formatBRL(i.preco || 0)}`)
        .join("\n");
      return `*${a.nome}*\n${itens}`;
    })
    .join("\n\n");
  return `${intro}\n\n*Cliente:* ${cliente}\n\n${detalhes}\n\n*Total:* ${formatBRL(total)}\n*Status:* ${STATUS_LABELS[o.status]}${o.formaPagamento ? `\n*Pagamento:* ${o.formaPagamento}` : ""}${o.validade ? `\n*Validade:* ${o.validade}` : ""}`;
}

export async function gerarPdfRecibo(params: {
  orcamento: Orcamento;
  valor: number;
  data: string;
  formaPagamento: string;
  observacao?: string;
  numero: number;
  assinaturaPagador?: string;
}): Promise<Blob> {
  const { orcamento: o, valor, data, formaPagamento, observacao, numero, assinaturaPagador } = params;
  const config = (await db.config.get(1)) ?? { id: 1 as const };
  const doc = await makeDoc();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFillColor(255, 95, 0);
  doc.rect(0, 0, pageW, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RECIBO DE PAGAMENTO", pageW / 2, y + 8, { align: "center" });
  y += 14;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nº ${String(numero).padStart(4, "0")}`, pageW - 15, y, { align: "right" });
  doc.text(format(new Date(data), "dd/MM/yyyy", { locale: ptBR }), 15, y);

  y += 8;
  doc.line(15, y, pageW - 15, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RECEBEMOS DE:", 15, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const pagadorNome = o.pagadorDiferente ? o.pagadorNome : o.clienteSnapshot?.nome;
  doc.text(pagadorNome ?? "—", 15, y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("A QUANTIA DE:", 15, y);
  y += 7;
  doc.setFontSize(18);
  doc.text(formatBRL(valor), 15, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  const extLines = doc.splitTextToSize(`(${valorPorExtenso(valor)})`, pageW - 30);
  doc.text(extLines, 15, y);
  y += extLines.length * 5 + 4;
  doc.setFont("helvetica", "normal");

  doc.text(`Forma de pagamento: ${formaPagamento}`, 15, y);
  y += 6;
  doc.text(`Referente ao orçamento #${o.id} — ${o.tipoServico ?? "Serviços de pintura"}`, 15, y);

  if (observacao) {
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Observações:", 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(observacao, pageW - 30);
    doc.text(lines, 15, y);
    y += lines.length * 5;
  }

  // Assinatura do pagador
  if (assinaturaPagador) {
    y += 14;
    if (y > 245) { doc.addPage(); y = 30; }
    try { doc.addImage(assinaturaPagador, "PNG", pageW / 2 - 30, y - 14, 60, 18); } catch { /* */ }
    doc.line(60, y, pageW - 60, y);
    y += 5;
    doc.setFontSize(9);
    const nomePag = o.pagadorDiferente ? o.pagadorNome : o.clienteSnapshot?.nome;
    doc.text(`Assinatura do pagador: ${nomePag ?? ""}`, pageW / 2, y, { align: "center" });
  } else {
    y += 20;
    doc.line(60, y, pageW - 60, y);
    y += 5;
    doc.setFontSize(9);
    doc.text(config.nome ?? "—", pageW / 2, y, { align: "center" });
    if (config.documento) {
      y += 4;
      doc.text(config.documento, pageW / 2, y, { align: "center" });
    }
  }

  // Aviso
  y = 275;
  doc.setFillColor(255, 230, 230);
  doc.rect(15, y, pageW - 30, 10, "F");
  doc.setTextColor(180, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("❌ ESTE DOCUMENTO NÃO É NOTA FISCAL", pageW / 2, y + 6.5, { align: "center" });

  return doc.output("blob");
}

export function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
