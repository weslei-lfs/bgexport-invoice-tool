const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const pdf = require("pdf-parse");

const { extractInvoiceData } = require("./lib/extract");
const { buildInvoiceHtml } = require("./lib/renderTemplate");
const { launchBrowser } = require("./lib/browser");

const app = express();
const PORT = process.env.PORT || 8090;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Envie um arquivo PDF."));
    }
    cb(null, true);
  },
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/extract", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
    const data = await pdf(req.file.buffer);
    const extracted = extractInvoiceData(data.text);
    res.json(extracted);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Não foi possível ler este PDF." });
  }
});

app.post("/api/generate", async (req, res) => {
  let browser;
  try {
    const html = buildInvoiceHtml(req.body || {});
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBytes = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="minuta-bg-export.pdf"');
    res.end(Buffer.from(pdfBytes));
  } catch (err) {
    if (browser) await browser.close();
    console.error(err);
    res.status(500).json({ error: "Não foi possível gerar o PDF.", debug: { message: err.message, stack: err.stack } });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`BG Export invoice tool rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
