// pdf-viewer.js
// Chrome's own built-in PDF viewer can't be scripted by any extension (a
// deliberate platform restriction, not a bug we can work around), so this is
// our own bundled pdf.js-based viewer. Word/sentence lookups reuse content.js
// unchanged — this page just needs to give it a real text layer to select.

import { getDocument, GlobalWorkerOptions, TextLayer } from "./pdfjs/pdf.mjs";

GlobalWorkerOptions.workerSrc = "./pdfjs/pdf.worker.mjs";

const SCALE = 1.4;

const fileInput = document.getElementById("file-input");
const pagesContainer = document.getElementById("pages");
const emptyState = document.getElementById("empty-state");

// TextLayer sizes itself via CSS round()/calc() against these custom
// properties — pdf.js expects the embedder to set them, they're not
// defaulted internally. Without this the text layer collapses to zero size
// and nothing is selectable, even though the canvas renders fine.
pagesContainer.style.setProperty("--total-scale-factor", String(SCALE));
pagesContainer.style.setProperty("--scale-round-x", "1px");
pagesContainer.style.setProperty("--scale-round-y", "1px");

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  pagesContainer.innerHTML = "";
  document.title = file.name + " — SensusGrow";

  try {
    const arrayBuffer = await file.arrayBuffer();
    await renderPdf(arrayBuffer);
  } catch (err) {
    pagesContainer.innerHTML = `<div class="load-error">Could not open this PDF: ${escapeHtml(String(err.message || err))}</div>`;
  }
});

async function renderPdf(arrayBuffer) {
  const pdf = await getDocument({ data: arrayBuffer }).promise;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: SCALE });

    const pageWrap = document.createElement("div");
    pageWrap.className = "page-wrap";
    pageWrap.style.width = viewport.width + "px";
    pageWrap.style.height = viewport.height + "px";
    pagesContainer.appendChild(pageWrap);

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    pageWrap.appendChild(canvas);

    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

    const textLayerDiv = document.createElement("div");
    textLayerDiv.className = "textLayer";
    pageWrap.appendChild(textLayerDiv);

    const textContent = await page.getTextContent();
    const textLayer = new TextLayer({ textContentSource: textContent, container: textLayerDiv, viewport });
    await textLayer.render();
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
