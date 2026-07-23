(function () {
  "use strict";

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const uploadStatus = document.getElementById("uploadStatus");
  const stepForm = document.getElementById("stepForm");
  const extractWarning = document.getElementById("extractWarning");
  const generateStatus = document.getElementById("generateStatus");

  const fields = {
    pDescricao: document.getElementById("pDescricao"),
    pNcm: document.getElementById("pNcm"),
    pCfop: document.getElementById("pCfop"),
    pUnidade: document.getElementById("pUnidade"),
    pQuantidade: document.getElementById("pQuantidade"),
    pValorUnitario: document.getElementById("pValorUnitario"),
    pValorTotal: document.getElementById("pValorTotal"),
    lPesoLiquido: document.getElementById("lPesoLiquido"),
    lPesoBruto: document.getElementById("lPesoBruto"),
    lContainer: document.getElementById("lContainer"),
    lLacre: document.getElementById("lLacre"),
    lBooking: document.getElementById("lBooking"),
    oFornecedor: document.getElementById("oFornecedor"),
    oNumero: document.getElementById("oNumero"),
    oSerie: document.getElementById("oSerie"),
    oEmissao: document.getElementById("oEmissao"),
    oValorCompra: document.getElementById("oValorCompra"),
    dNome: document.getElementById("dNome"),
    dEndereco: document.getElementById("dEndereco"),
    dCidade: document.getElementById("dCidade"),
    dPais: document.getElementById("dPais"),
    dCep: document.getElementById("dCep"),
    dCnpj: document.getElementById("dCnpj"),
    numeroMinuta: document.getElementById("numeroMinuta"),
    observacoes: document.getElementById("observacoes"),
  };

  function fillForm(data) {
    const p = data.produto || {};
    const l = data.logistica || {};
    const o = data.notaOrigem || {};

    fields.pDescricao.value = p.descricao || "";
    fields.pNcm.value = p.ncm || "";
    fields.pQuantidade.value = p.quantidadeToneladas ?? p.quantidade ?? "";
    if (p.quantidadeToneladas) fields.pUnidade.value = "TON";
    fields.pValorUnitario.value = "";
    fields.pValorTotal.value = "";

    fields.lPesoLiquido.value = l.pesoLiquido || "";
    fields.lPesoBruto.value = l.pesoBruto || "";
    fields.lContainer.value = l.container || "";
    fields.lLacre.value = l.lacre || "";
    fields.lBooking.value = l.bookingReserva || "";

    fields.oFornecedor.value = (data.fornecedor && data.fornecedor.nome) || "";
    fields.oNumero.value = o.numero || "";
    fields.oSerie.value = o.serie || "";
    fields.oEmissao.value = o.emissao || "";
    fields.oValorCompra.value = p.valorTotal || "";

    if (data.warning) {
      extractWarning.textContent = data.warning;
      extractWarning.classList.remove("hidden");
    } else {
      extractWarning.classList.add("hidden");
    }

    stepForm.classList.remove("hidden");
    stepForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleFile(file) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      uploadStatus.textContent = "Envie um arquivo PDF.";
      uploadStatus.className = "status error";
      return;
    }
    uploadStatus.textContent = "Lendo o PDF...";
    uploadStatus.className = "status";

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao ler o PDF.");
      uploadStatus.textContent = "PDF lido com sucesso. Confira os dados abaixo.";
      uploadStatus.className = "status ok";
      fillForm(data);
    } catch (err) {
      uploadStatus.textContent = err.message;
      uploadStatus.className = "status error";
    }
  }

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("drag");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    handleFile(file);
  });

  document.getElementById("btnGenerate").addEventListener("click", async () => {
    const btn = document.getElementById("btnGenerate");
    btn.disabled = true;
    generateStatus.textContent = "Gerando PDF...";
    generateStatus.className = "status";

    const payload = {
      numeroMinuta: fields.numeroMinuta.value,
      dataEmissao: new Date().toLocaleDateString("pt-BR"),
      observacoes: fields.observacoes.value,
      destinatario: {
        nome: fields.dNome.value,
        endereco: fields.dEndereco.value,
        cidade: fields.dCidade.value,
        pais: fields.dPais.value,
        cep: fields.dCep.value,
        cnpjCpf: fields.dCnpj.value,
      },
      produto: {
        descricao: fields.pDescricao.value,
        ncm: fields.pNcm.value,
        cfop: fields.pCfop.value,
        unidade: fields.pUnidade.value,
        quantidade: fields.pQuantidade.value,
        valorUnitario: fields.pValorUnitario.value,
        valorTotal: fields.pValorTotal.value,
      },
      logistica: {
        pesoLiquido: fields.lPesoLiquido.value,
        pesoBruto: fields.lPesoBruto.value,
        container: fields.lContainer.value,
        lacre: fields.lLacre.value,
        bookingReserva: fields.lBooking.value,
      },
      notaOrigem: {
        fornecedor: fields.oFornecedor.value,
        numero: fields.oNumero.value,
        serie: fields.oSerie.value,
        emissao: fields.oEmissao.value,
        valorCompra: fields.oValorCompra.value,
      },
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Falha ao gerar o PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      generateStatus.textContent = "Minuta gerada! Abrimos em uma nova aba.";
      generateStatus.className = "status ok";
    } catch (err) {
      generateStatus.textContent = err.message;
      generateStatus.className = "status error";
    } finally {
      btn.disabled = false;
    }
  });
})();
