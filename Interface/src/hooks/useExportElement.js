import { useCallback } from 'react';
import useElectronAPI from './useElectronAPI';

function collectAllStyles() {
  let css = '';

  // Only inline <style> these always work
  css += Array.from(document.querySelectorAll('style'))
    .map((el) => el.outerHTML)
    .join('\n');

  css += `
      <style>
      @media print {
        table, tr, thead, tbody {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
      </style>`;

  // Dynamically generated styles (Plotly, MUI, tooltips…)
  for (const sheet of document.styleSheets) {
    try {
      if (!sheet.href) { // ignore <link> in dev
        const rules = Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n');
        css += `<style>${rules}</style>`;
      }
    } catch {
      console.error('wierd');
      // CORS-protected — ignore
    }
  }

  return css;
}

function preprocessReport(element) {
  const cloned = element.cloneNode(true);

  if (!cloned.style.width) cloned.style.width = '794px';

  // Только для PDF → развернуть высоту
  Object.assign(cloned.style, {
    height: 'auto',
    maxHeight: 'none',
    overflow: 'visible',
    display: 'block',
  });

  return cloned.outerHTML;
}

async function isLikelyPDFBlob(blob) {
  if (!blob) return false;

  const buf = new Uint8Array(await blob.arrayBuffer());

  const header = new TextDecoder().decode(buf.slice(0, 8));
  const footer = new TextDecoder().decode(buf.slice(-20));

  return header.startsWith('%PDF-') && footer.includes('%%EOF');
}

export function useElectronExportElementPDF() {
  const { isElectron, getElectronAPI } = useElectronAPI();

  return useCallback(async (element, options = {}) => {
    if (!element) return;

    const { mode = 'preview' } = options;

    /* freezePlotSizes(element); */
    const html = preprocessReport(element);

    const styles = collectAllStyles();

    if (!isElectron) {
      console.warn('Electron API not available: cannot export PDF');
      return;
    }

    const eAPI = getElectronAPI();
    const buffer = await eAPI.printPDF({ html, styles, mode });
    const blob = new Blob([buffer], { type: 'application/pdf' });

    if (!isLikelyPDFBlob(blob)) console.error('Corrupted pdf blob on print');

    /* const url = URL.createObjectURL(blob);

    window.open(url); */
  }, [isElectron, getElectronAPI]);
}

function collectDocxSafeStyles() {
  return `
    <style>
      body {
        font-family: Arial, sans-serif;
        font-size: 11pt;
      }

      table {
        border-collapse: collapse;
        width: 100%;
      }

      th, td {
        border: 1px solid #000;
        padding: 4px 6px;
        vertical-align: top;
      }

      thead {
        font-weight: bold;
      }

      tr, td, th {
        page-break-inside: avoid;
      }

      h1, h2, h3 {
        page-break-after: avoid;
      }

      img {
        max-width: 100%;
      }
    </style>
  `;
}

const DOCX_PAGE_PX = 794; // A4 @ 96 DPI
const DOCX_MARGIN_PX = 96; // 1 inch per side
const DOCX_CONTENT_PX = DOCX_PAGE_PX - DOCX_MARGIN_PX * 2; // ≈ 602

function normalizeImagesForDocx(root) {
  root.querySelectorAll('img').forEach((img) => {
    // 1. Resolve width / height
    let width = img.dataset.originalWidth
      || img.getAttribute('data-original-width');

    let height = img.dataset.originalHeight
      || img.getAttribute('data-original-height');

    if ((!width || !height) && img.naturalWidth && img.naturalHeight) {
      width = img.naturalWidth;
      height = img.naturalHeight;
    }

    if ((!width || !height) && img.hasAttribute('width') && img.hasAttribute('height')) {
      width = img.getAttribute('width');
      height = img.getAttribute('height');
    }

    if (!width || !height) {
      const rect = img.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    }

    width = Math.max(1, Math.round(parseFloat(width)));
    height = Math.max(1, Math.round(parseFloat(height)));

    // 2. FORCE FIT TO DOCX CONTENT WIDTH
    if (width > DOCX_CONTENT_PX) {
      const scale = DOCX_CONTENT_PX / width;
      width = DOCX_CONTENT_PX;
      height = Math.max(1, Math.round(height * scale));
    }

    console.log('DOCX image normalized:', {
      width,
      height,
      naturalWidth: img.naturalWidth,
    });

    // 3. Remove all conflicting signals
    img.removeAttribute('width');
    img.removeAttribute('height');
    img.removeAttribute('style');
    img.removeAttribute('data-original-width');
    img.removeAttribute('data-original-height');

    // 4. Apply explicit DOCX-safe sizing
    img.setAttribute('width', String(width));
    img.setAttribute('height', String(height));

    img.style.width = `${width}px`;
    img.style.height = `${height}px`;
    img.style.display = 'block';
    img.style.margin = '0 auto';
  });
}

function preprocessReportForDocx(element) {
  const cloned = element.cloneNode(true);

  normalizeImagesForDocx(cloned);

  return cloned.outerHTML;
}

export function useElectronExportDocx(tabName) {
  /* console.log("useElectronExportDocx for tab:", tabName); */
  const { isElectron, getElectronAPI } = useElectronAPI();

  return useCallback(async (element) => {
    if (!element) return;

    const html = preprocessReportForDocx(element);

    const fullHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          ${collectDocxSafeStyles()}
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    if (!isElectron) {
      console.warn('Electron API not available: cannot generate DOCX');
      return;
    }

    await getElectronAPI().generateDOCX({
      html: fullHtml,
      fileName: tabName,
    });
  }, [tabName]);
}

export function useElectronPrintElementA4() {
  const { isElectron, getElectronAPI } = useElectronAPI();

  return useCallback(async (element) => {
    if (!element) return;

    if (!isElectron) {
      console.warn('Electron API not available: cannot print HTML');
      return;
    }

    const html = preprocessReport(element);
    const styles = collectAllStyles();

    await getElectronAPI().printHTML({ html, styles });
  }, [isElectron, getElectronAPI]);
}