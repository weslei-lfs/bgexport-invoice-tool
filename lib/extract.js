const BG_CNPJ_DIGITS = "37650216000102";

function onlyDigits(str) {
  return (str || "").replace(/\D/g, "");
}

function toNumber(str) {
  if (!str) return null;
  const n = parseFloat(str.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function findFirst(text, regex) {
  const m = text.match(regex);
  return m ? m[1].trim() : null;
}

// PDFs from different supplier systems extract with wildly different text
// ordering (some collapse table columns together with no spaces). We anchor
// on the NCM/CST/CFOP/unit/qty/price run since it stays contiguous even when
// the description glues onto the product code with no separator.
const PRODUCT_ROW_RE =
  /(\d{8})\s*(\d{2,3})\s+(\d{3,4})\s+([A-Z]{2,5})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/;

function extractInvoiceData(rawText) {
  const text = rawText.replace(/\r/g, "");

  const bgCnpjIndex = text
    .split(/DESTINAT[ÁA]RIO\/REMETENTE/i)
    .slice(1)
    .join("")
    .replace(/\D/g, "")
    .includes(BG_CNPJ_DIGITS);

  const emitenteIsBG = onlyDigits(text.slice(0, text.search(/DESTINAT[ÁA]RIO\/REMETENTE/i) > -1 ? text.search(/DESTINAT[ÁA]RIO\/REMETENTE/i) : text.length)).includes(BG_CNPJ_DIGITS);

  const supplierName = findFirst(text, /EMITENTE\s*\n\s*([^\n]+)/i);

  const nfNumber =
    findFirst(text, /N[ºO°]\s*\.?\s*([\d.]{3,12})\s*[\n-]*\s*S[ÉE]RIE:?\s*(\d+)/i) ||
    findFirst(text, /N[ÚU]MERO\s+([\d.]{3,12})\s*-\s*S[ÉE]RIE\s*(\d+)/i);
  const nfSerieMatch = text.match(/S[ÉE]RIE:?\s*(\d+)/i);

  const emissao = findFirst(text, /EMISS[ÃA]O\s+(\d{2}\/\d{2}\/\d{4})/i) ||
    findFirst(text, /DATA\s+EMISS[ÃA]O[\s\S]{0,15}?(\d{2}\/\d{2}\/\d{4})/i);

  const productMatch = text.match(PRODUCT_ROW_RE);
  let description = null;
  let ncm = null, cst = null, cfop = null, unidade = null, quantidade = null, valorUnitario = null, valorTotalProduto = null;

  if (productMatch) {
    ncm = productMatch[1];
    cst = productMatch[2];
    cfop = productMatch[3];
    unidade = productMatch[4];
    quantidade = toNumber(productMatch[5]);
    valorUnitario = toNumber(productMatch[6]);
    valorTotalProduto = toNumber(productMatch[7]);

    const lineStart = text.lastIndexOf("\n", productMatch.index) + 1;
    let line = text.slice(lineStart, productMatch.index);
    line = line.replace(/^\s*\d+\s*/, "").trim();
    description = line || null;
  }

  // Some suppliers price per bag/fardo on the product row but state the
  // commodity's real ton-equivalent separately (e.g. "Unidade: TON Quantidade: 22") —
  // that's the figure that matters for the resale export invoice.
  const tonEquivMatch = text.match(/Unidade:\s*TON\s*Quantidade:\s*([\d.,]+)/i);
  const quantidadeToneladas = tonEquivMatch ? toNumber(tonEquivMatch[1]) : null;

  const pesoLiquido = toNumber(findFirst(text, /PESO\s*L[ÍI]QUIDO\s*([\d.,]+)/i));
  const pesoBruto = toNumber(findFirst(text, /PESO\s*BRUTO\s*([\d.,]+)/i));
  const valorTotalNota = toNumber(findFirst(text, /VALOR\s*TOTAL\s*DA\s*NOTA\s*([\d.,]+)/i));

  const container = findFirst(text, /CONTAINER:?\s*([A-Z0-9\-]{6,15})/i);
  const lacre = findFirst(text, /LACRE:?\s*([A-Z0-9\-]{3,15})/i);
  const bookingReserva = findFirst(text, /(?:BOOKING|RESERVA):?\s*([A-Z0-9\-]{5,20})/i);

  return {
    isPurchaseFromSupplier: bgCnpjIndex && !emitenteIsBG,
    warning: !bgCnpjIndex
      ? "Não encontrei o CNPJ da BG Export como destinatária deste PDF. Confira se este é mesmo um documento de compra."
      : emitenteIsBG
      ? "Este PDF parece ser uma nota emitida pela própria BG Export (não uma nota de compra de fornecedor). Confira antes de continuar."
      : null,
    fornecedor: {
      nome: supplierName,
    },
    notaOrigem: {
      numero: nfNumber,
      serie: nfSerieMatch ? nfSerieMatch[1] : null,
      emissao: emissao,
    },
    produto: {
      descricao: description,
      ncm,
      cst,
      cfop,
      unidade,
      quantidade,
      valorUnitario,
      valorTotal: valorTotalProduto,
      quantidadeToneladas,
    },
    logistica: {
      pesoLiquido,
      pesoBruto,
      container,
      lacre,
      bookingReserva,
    },
    valorTotalNota,
  };
}

module.exports = { extractInvoiceData };
