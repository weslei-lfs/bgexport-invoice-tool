// Local dev (Windows/Mac/Linux) uses full `puppeteer`, which bundles a
// working Chromium for the current OS. Vercel's serverless functions run on
// Amazon Linux, where that bundled Chromium won't launch - so in production
// we switch to `puppeteer-core` + `@sparticuz/chromium`, a Chromium build
// packaged specifically for that environment.
async function launchBrowser() {
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (!isServerless) {
    const puppeteer = require("puppeteer");
    return puppeteer.launch({ headless: "new" });
  }

  // @sparticuz/chromium ships as an ESM-only package, so it must be loaded
  // via dynamic import() even from this CommonJS file - a plain require()
  // throws ERR_REQUIRE_ESM.
  const { default: chromium } = await import("@sparticuz/chromium");
  const puppeteerCore = require("puppeteer-core");
  return puppeteerCore.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
}

module.exports = { launchBrowser };
