const { dialog, app } = require("electron");
const XLSX = require("xlsx");
const htmlToDocx = require("html-to-docx");
const path = require('path');
const fs = require('fs');
const os = require('os');

const { getTimeSuffix, withTimeSuffix, ensureSingleExt, stripExt, createServiceWindow, loadBundledCss, waitForWindowClosed } = require('./utils');

const exportDocxHandler = async (options) => {
    try {
        const { html, fileName, preview = true } = options
        const defaultDir = (app && typeof app.getPath === 'function') ? app.getPath('documents') : os.homedir();
        const suggestedName = stripExt(fileName ?? "report.docx", '.mdfx');
        const suggestedPath = path.join(defaultDir, suggestedName);

        const { filePath, canceled } = await dialog.showSaveDialog({
            defaultPath: suggestedPath,
            filters: [{ name: "Word", extensions: ["docx"] }],
        });

        if (canceled || !filePath) {
            console.log('[DOCX] Save cancelled');
            return { ok: false };
        }

        const timeSuffix = getTimeSuffix();
        const basePath = filePath.replace(/\.docx$/i, '');

        console.log('[DOCX] Base path:', basePath);
        console.log('[DOCX] Time suffix:', timeSuffix);


        const realBuffer = await htmlToDocx(html, null, {
            table: { row: { cantSplit: true } },
        });

        if (!realBuffer) {
            throw new Error('htmlToDocx returned null/undefined for REAL');
        }

        const safeRealBuffer =
            Buffer.isBuffer(realBuffer)
            ? realBuffer
            : Buffer.from(realBuffer);

        const realPath = withTimeSuffix(filePath, timeSuffix);
        fs.writeFileSync(realPath, safeRealBuffer);

        console.log('[DOCX] Real DOCX written to:', realPath);

        return {
            ok: true,
            testFile: null, // previously returned `testPath` which is undefined here
            realFile: realPath,
            time: timeSuffix,
        };
    } catch (err) {
        console.error('[DOCX] FAILED:', err);
        return {
            ok: false,
            error: err.message,
        };
    }
}

const exportPdfHandler = async (options) => {
    let win = null;
    let tempHtmlPath = null;
    let previewPdfPath = null;

    const { html, styles, mode = "save" } = options;

    try {
        const bundledCss = loadBundledCss();

        const fullHtml = `
        <html>
            <head>
            <meta charset="UTF-8"/>
            ${bundledCss ? bundledCss : ""}
            ${styles ?? ""}
            </head>
            <body>${html}</body>
        </html>
        `;

        // Temp HTML
        tempHtmlPath = path.join(os.tmpdir(), `report_${Date.now()}.html`);
        fs.writeFileSync(tempHtmlPath, fullHtml, "utf8");

        //  Headless render window
        win = createServiceWindow({
        width: 1920,
        height: 1600,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            sandbox: false,
        },
        });

        await win.loadFile(tempHtmlPath);

        // Wait for layout stability
        await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            if (document.readyState === "complete") resolve();
            else window.addEventListener("load", () => resolve(), { once: true });
        })
        `);

        await win.webContents.executeJavaScript("document.fonts.ready");

        await win.webContents.executeJavaScript(`
        new Promise(resolve => {
            requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
            });
        })
        `);

        // 4️⃣ Generate PDF buffer
        const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4",
        });

        if (!pdfBuffer || pdfBuffer.length < 10) {
        throw new Error("Invalid PDF buffer");
        }

        // ─────────────────────────────
        // MODE: PREVIEW
        // ─────────────────────────────
        if (mode === "preview") {
            previewPdfPath = path.join(os.tmpdir(), `preview_${Date.now()}.pdf`);
            fs.writeFileSync(previewPdfPath, pdfBuffer);

            await win.loadURL(`file://${previewPdfPath}`);

            // Extra frame prevents black screen
            await win.webContents.executeJavaScript(`
                new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
            `);

            win.show();
            win.focus();

            win.on("closed", () => {
                try {
                if (previewPdfPath) fs.unlinkSync(previewPdfPath);
                } catch {}
            });

            await waitForWindowClosed(win);            

            return {
                ok: true,
                mode: "preview",
            };
        }

        // ─────────────────────────────
        // MODE: SAVE
        // ─────────────────────────────
        const defaultDir =
        (app && typeof app.getPath === "function")
            ? app.getPath("documents")
            : os.homedir();

        const timeSuffix = getTimeSuffix();
        const suggestedName = `report_${timeSuffix}.pdf`;
        const suggestedPath = path.join(defaultDir, suggestedName);

        const { filePath, canceled } = await dialog.showSaveDialog({
        title: "Сохранить PDF отчёт",
        defaultPath: suggestedPath,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        properties: ["showOverwriteConfirmation"],
        });

        if (canceled || !filePath) {
        return { ok: false, canceled: true };
        }

        const finalPath = ensureSingleExt(filePath, ".pdf");
        fs.writeFileSync(finalPath, pdfBuffer);

        return {
            ok: true,
            mode: "save",
            filePath: finalPath,
            size: pdfBuffer.length,
            time: timeSuffix,
        };
    } catch (error) {
        console.error("[PDF] FAILED:", error);
        return {
        ok: false,
        error: error.message,
        };
    } finally {
        // Cleanup temp HTML
        try {
        if (tempHtmlPath) fs.unlinkSync(tempHtmlPath);
        } catch {}

        // Destroy window only if not used for preview
        try {
        if (win && !win.isDestroyed() && mode !== "preview") {
            win.destroy();
        }
        } catch {}
    }
}

const exportXLSXHandler = async (options) => {
    const {rows, filePlaceholderName = "data.xlsx"} = options;
    const cleanName = stripExt(filePlaceholderName ?? 'data', '.xlsx');
    
    // Ensure we pass an absolute path as defaultPath so the filename is prefilled
    const defaultDir = (app && typeof app.getPath === 'function') ? app.getPath('documents') : os.homedir();
    const suggestedPath = path.join(defaultDir, `${cleanName}.xlsx`);

    const { filePath, canceled } = await dialog.showSaveDialog({
    title: "Save Excel File",
    filters: [{ name: "Excel", extensions: ["xlsx"] }],
    defaultPath: suggestedPath,
    });

    if (canceled || !filePath) return { ok: false, reason: "cancelled" };

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const finalPath = ensureSingleExt(filePath, '.xlsx');
    fs.writeFileSync(finalPath, buffer);

    console.log('filePath',filePath)
    console.log('finalPath', finalPath)

    return { ok: true, filePath };
}

module.exports = {
    exportDocxHandler,
    exportPdfHandler,
    exportXLSXHandler,
};