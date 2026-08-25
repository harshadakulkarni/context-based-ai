// Obfuscates the extension's JS before it's zipped for distribution, so anyone
// who downloads/unzips it gets scrambled code instead of the plain readable
// source. Run via `npm run build` — outputs to extension/dist/.
//
// IMPORTANT: renameGlobals stays false. config.js declares API_BASE_URL and
// DASHBOARD_URL as top-level consts that background.js, popup.js, and
// auth-bridge.js all reference by that literal name across separate <script>
// tags / importScripts — renaming globals would silently break that sharing
// since each file is obfuscated independently.

const fs = require("fs");
const path = require("path");
const JavaScriptObfuscator = require("javascript-obfuscator");

const SRC_DIR = __dirname;
const OUT_DIR = path.join(__dirname, "dist");

const JS_FILES = ["config.js", "background.js", "content.js", "popup.js", "auth-bridge.js", "pdf-viewer.js"];
// pdfjs/ is the vendored pdf.js library, copied unobfuscated — it's a large
// well-known open-source dependency, not our own code, and running it through
// the obfuscator would balloon build time for zero benefit.
const STATIC_ENTRIES = ["manifest.json", "popup.html", "content.css", "icons", "pdf-viewer.html", "pdfjs"];

const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: false, // keeps content.js fast on every double-click
  deadCodeInjection: false,
  renameGlobals: false, // see note above — must stay false
  identifierNamesGenerator: "hexadecimal",
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.9,
  rotateStringArray: true,
  selfDefending: true
};

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const file of JS_FILES) {
    const srcPath = path.join(SRC_DIR, file);
    const code = fs.readFileSync(srcPath, "utf8");
    const obfuscated = JavaScriptObfuscator.obfuscate(code, OBFUSCATOR_OPTIONS).getObfuscatedCode();
    fs.writeFileSync(path.join(OUT_DIR, file), obfuscated);
    console.log(`obfuscated ${file}`);
  }

  for (const entry of STATIC_ENTRIES) {
    copyRecursive(path.join(SRC_DIR, entry), path.join(OUT_DIR, entry));
    console.log(`copied ${entry}`);
  }

  console.log(`\nBuild output: ${OUT_DIR}`);
}

main();
