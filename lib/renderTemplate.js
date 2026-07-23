const path = require("path");
const fs = require("fs");

const LOGO_DATA_URL = (() => {
  const logoBuffer = fs.readFileSync(path.join(__dirname, "..", "public", "assets", "logo-bg-export.png"));
  return "data:image/png;base64," + logoBuffer.toString("base64");
})();

function esc(v) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildInvoiceHtml(data) {
  const d = data.destinatario || {};
  const p = data.produto || {};
  const l = data.logistica || {};
  const origem = data.notaOrigem || {};

  const valorTotal = Number(p.valorTotal) || (Number(p.valorUnitario) || 0) * (Number(p.quantidade) || 0);
  const custoOrigem = Number(origem.valorCompra) || null;
  const margem = custoOrigem !== null ? valorTotal - custoOrigem : null;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    margin: 0; padding: 28px 34px;
    color: #1c2b2b;
    font-size: 12.5px;
  }
  .draft-banner {
    background: #fff4de; border: 1.5px solid #f5a93e; color: #7a4a05;
    border-radius: 10px; padding: 10px 16px; font-weight: 700; font-size: 12px;
    margin-bottom: 18px; text-align: center; letter-spacing: .02em;
  }
  .draft-banner small { display:block; font-weight: 400; margin-top: 3px; font-size: 10.5px; color:#8a5a10; }
  .header { display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #12a8a6; padding-bottom: 14px; margin-bottom: 18px; }
  .header img { height: 52px; }
  .header .meta { text-align:right; font-size: 11.5px; color:#4a5a5a; }
  .header .meta b { color:#12a8a6; font-size: 15px; display:block; }
  h1 { font-size: 15px; margin: 0 0 4px; color:#0e7d7a; text-transform: uppercase; letter-spacing:.03em; }
  .section { margin-bottom: 16px; }
  .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .box { border: 1px solid #e3ecec; border-radius: 8px; padding: 12px 14px; background:#f5f9f9; }
  .box h2 { font-size: 10.5px; text-transform:uppercase; letter-spacing:.05em; color:#0e7d7a; margin:0 0 8px; }
  .box p { margin: 2px 0; line-height: 1.5; }
  .box b { color:#1c2b2b; }
  table { width:100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #e3ecec; padding: 7px 8px; font-size: 11.5px; text-align: left; }
  th { background:#0e7d7a; color:#fff; font-weight:600; font-size: 10.5px; text-transform:uppercase; }
  td.num, th.num { text-align: right; }
  .totals { margin-top: 10px; display:flex; justify-content:flex-end; }
  .totals table { width: 300px; }
  .totals td { border: none; padding: 5px 8px; }
  .totals .final td { border-top: 2px solid #12a8a6; font-weight: 700; font-size: 13px; color:#0e7d7a; }
  .obs { font-size: 11px; color:#4a5a5a; background:#f5f9f9; border-radius:8px; padding:10px 14px; border:1px solid #e3ecec; }
  .footer { margin-top: 26px; font-size: 9.5px; color:#8a9a9a; border-top: 1px solid #e3ecec; padding-top: 10px; text-align:center; }
</style>
</head>
<body>

  <div class="draft-banner">
    MINUTA DE FATURA — DOCUMENTO NÃO FISCAL
    <small>Documento de conferência interna e envio prévio ao cliente. Não substitui a Nota Fiscal Eletrônica oficial, que deve ser emitida no sistema fiscal da empresa.</small>
  </div>

  <div class="header">
    <img src="${LOGO_DATA_URL}" alt="BG Export">
    <div class="meta">
      <b>Minuta Nº ${esc(data.numeroMinuta)}</b>
      Data de emissão: ${esc(data.dataEmissao)}<br>
      Natureza da operação: EXPORTAÇÃO
    </div>
  </div>

  <div class="section grid2">
    <div class="box">
      <h2>Remetente (exportador)</h2>
      <p><b>BG Export Importação e Exportação Ltda.</b></p>
      <p>Av. Presidente Castelo Branco, 668, Sumaré</p>
      <p>Caraguatatuba / SP / Brasil — CEP 11661-300</p>
      <p>CNPJ 37.650.216/0001-02 · I.E. 254.250.043.118</p>
    </div>
    <div class="box">
      <h2>Destinatário (cliente final)</h2>
      <p><b>${esc(d.nome)}</b></p>
      <p>${esc(d.endereco)}</p>
      <p>${esc(d.cidade)}${d.pais ? " — " + esc(d.pais) : ""}${d.cep ? " · CEP " + esc(d.cep) : ""}</p>
      <p>${d.cnpjCpf ? "CNPJ/CPF " + esc(d.cnpjCpf) : "CNPJ/CPF — (cliente estrangeiro)"}</p>
    </div>
  </div>

  <div class="section">
    <h1>Dados do Produto</h1>
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th>NCM/SH</th>
          <th>CFOP</th>
          <th>Unid.</th>
          <th class="num">Qtd.</th>
          <th class="num">Vlr. Unit. (US$/R$)</th>
          <th class="num">Vlr. Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${esc(p.descricao)}</td>
          <td>${esc(p.ncm)}</td>
          <td>${esc(p.cfop)}</td>
          <td>${esc(p.unidade)}</td>
          <td class="num">${esc(p.quantidade)}</td>
          <td class="num">${money(p.valorUnitario)}</td>
          <td class="num">${money(valorTotal)}</td>
        </tr>
      </tbody>
    </table>
    <div class="totals">
      <table>
        ${custoOrigem !== null ? `<tr><td>Custo de origem (NF ${esc(origem.numero)})</td><td class="num">${money(custoOrigem)}</td></tr>` : ""}
        ${margem !== null ? `<tr><td>Margem sobre a operação</td><td class="num">${money(margem)}</td></tr>` : ""}
        <tr class="final"><td>Valor total da minuta</td><td class="num">${money(valorTotal)}</td></tr>
      </table>
    </div>
  </div>

  <div class="section grid2">
    <div class="box">
      <h2>Logística</h2>
      <p>Peso líquido: <b>${esc(l.pesoLiquido)}</b> kg</p>
      <p>Peso bruto: <b>${esc(l.pesoBruto)}</b> kg</p>
      <p>Container: <b>${esc(l.container)}</b></p>
      <p>Lacre: <b>${esc(l.lacre)}</b></p>
      <p>Booking/Reserva: <b>${esc(l.bookingReserva)}</b></p>
    </div>
    <div class="box">
      <h2>Referência interna</h2>
      <p>Fornecedor de origem: <b>${esc(origem.fornecedor)}</b></p>
      <p>NF de compra nº: <b>${esc(origem.numero)}</b> — Série ${esc(origem.serie)}</p>
      <p>Emissão da NF de origem: <b>${esc(origem.emissao)}</b></p>
    </div>
  </div>

  ${data.observacoes ? `<div class="section obs"><b>Observações:</b> ${esc(data.observacoes)}</div>` : ""}

  <div class="footer">
    Gerado pelo sistema interno da BG Export em ${esc(data.dataEmissao)}. Documento sem valor fiscal — não possui chave de acesso nem protocolo de autorização da Sefaz.
  </div>

</body>
</html>`;
}

module.exports = { buildInvoiceHtml };
