const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const MACADAM_SPACE = { '1A': 40, '2A': 50, '3A': 75, '4A': 90, '5A': 100 };

function fmt(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    const num = Number(n);
    if (num === 0) return '0';
    return 'Rs.\u00A0' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function num(n) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-IN');
}

function pillHtml(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return '—';
    return arr.map(v => `<span class="pill">${v.replace('DEG', '°').replace(/_/g, ' ')}</span>`).join(' ');
}

// Convert a local /uploads/... path to a base64 data URI for Puppeteer embedding
function imageToBase64(imageUrl) {
    if (!imageUrl) return null;
    try {
        // Strip leading slash and resolve against server root
        const relative = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
        const fullPath = path.join(__dirname, '..', relative);
        if (fs.existsSync(fullPath)) {
            const buffer = fs.readFileSync(fullPath);
            const ext = path.extname(fullPath).slice(1).toLowerCase();
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
            return `data:${mime};base64,${buffer.toString('base64')}`;
        }
    } catch (err) {
        console.error('imageToBase64 error:', imageUrl, err.message);
    }
    return null;
}

function coverPage(q, settings) {
    const s = settings || {};
    return `
  <div class="cover-page">
    <div class="cover-top">
      <div class="cover-by">
        <div class="cover-label">DEVELOPED &amp; ILLUMINATED BY</div>
        <div class="cover-company">${s.companyName || 'DAM Lighting Solution LLP'}</div>
        <div class="cover-sub">${s.phone || ''} &nbsp;|&nbsp; ${s.email || ''}</div>
        <div class="cover-sub">${s.website || ''}</div>
        <div class="cover-address">${s.address || ''}</div>
      </div>
      <div class="cover-for">
        <div class="cover-label">DEVELOPED &amp; ILLUMINATED FOR</div>
        <div class="cover-company">${q.client?.companyName || ''}</div>
        <div class="cover-sub">${q.client?.fullName || ''}</div>
        <div class="cover-address">${q.client?.address || ''}, ${q.client?.city || ''} — ${q.client?.pinCode || ''}</div>
      </div>
    </div>
    <div class="cover-bottom">
      <div class="cover-quote-label">
        <h1>Light<br>Quotation</h1>
      </div>
      <div class="cover-dam">
        <div class="cover-dam-logo">DAM</div>
        <div class="cover-dam-tag">design. allocate. maintain.</div>
      </div>
    </div>
  </div>`;
}

function allRecsPdf(q, settings) {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    const activeLabels = [];
    for (const label of labels) {
        if (q.lineItems.some(item => (item.recommendations || []).some(r => r.label === label && r.brandName))) {
            activeLabels.push(label);
        }
    }

    // Totals per active recommendation column
    const recTotals = activeLabels.map(label => {
        const sum = q.lineItems.reduce((acc, item) => {
            const r = (item.recommendations || []).find(r => r.label === label);
            return acc + (r ? (r.amount || 0) : 0);
        }, 0);
        const gst = sum * ((q.gstRate || 18) / 100);
        return { label, sum, gst, total: sum + gst };
    });

    // Main product rows
    const rowsHtml = q.lineItems.map((item, i) => {
        const polarSrc = imageToBase64(item.polarDiagramUrl);
        const polarCell = polarSrc
            ? `<img src="${polarSrc}" style="width:44px;height:44px;object-fit:contain;display:block;margin:auto;" />`
            : '—';

        const recCells = activeLabels.map(label => {
            const r = (item.recommendations || []).find(r => r.label === label);
            if (!r || !r.brandName) return `<td class="rec-cell" colspan="3">—</td>`;
            const space = MACADAM_SPACE[r.macadamStep] != null ? MACADAM_SPACE[r.macadamStep] + '%' : '—';
            return `
              <td class="rec-cell">${r.macadamStep || '—'}</td>
              <td class="rec-cell mono">${fmt(r.rate)}</td>
              <td class="rec-cell mono">${fmt(r.amount)}<br><small>${space}</small></td>`;
        }).join('');

        return `<tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
          <td>${item.sno}</td>
          <td><strong>${item.productCode}</strong></td>
          <td class="center">${polarCell}</td>
          <td class="desc">${(item.description || '').substring(0, 70)}</td>
          <td>${item.unit === 'NUMBERS' ? 'Nos.' : 'Mtr.'}</td>
          ${recCells}
        </tr>`;
    }).join('');

    // Summary table (Ramada-format): S.No | Qty | Unit | Code | REC A (brand+amount) | REC B | ...
    const summaryItemRows = q.lineItems.map((item, idx) => {
        const recCells = activeLabels.map(label => {
            const r = (item.recommendations || []).find(r => r.label === label);
            if (!r || !r.brandName) return `<td class="summary-cell">—</td>`;
            return `<td class="summary-cell">
              <span class="summary-brand">${r.brandName}</span><br>
              <span class="summary-amount">${fmt(r.amount)}</span>
            </td>`;
        }).join('');

        return `<tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
          <td class="center">${idx + 1}</td>
          <td class="center">${item.unit === 'METERS' ? 'Mtr.' : 'Nos.'}</td>
          <td class="code">${item.productCode || ''}</td>
          ${recCells}
        </tr>`;
    }).join('');

    const recHeaders = activeLabels.map(l => `<th colspan="3" class="rec-header">REC ${l}</th>`).join('');
    const recSubHeaders = activeLabels.map(() => `<th>Macadam</th><th>Rate</th><th>Amount</th>`).join('');
    const summaryRecHeaders = activeLabels.map(l => `<th>REC ${l}<br><small>(Brand / Amount)</small></th>`).join('');

    const totalRows = [
        { label: 'SUB-TOTAL', key: 'sum', cls: 'subtotal-row' },
        { label: `GST ${q.gstRate || 18}%`, key: 'gst', cls: 'subtotal-row' },
        { label: 'GRAND TOTAL', key: 'total', cls: 'total-row' },
    ].map(({ label, key, cls }) => `
      <tr class="${cls}">
        <td colspan="3" class="right bold">${label}</td>
        ${recTotals.map(t => `<td class="num bold">${fmt(t[key])}</td>`).join('')}
      </tr>`).join('');

    return `
  <div class="products-wrapper">
    <div class="section-header">${q.projectName} — ${q.city} — RECOMMENDATION COLUMNS</div>
    <table class="main-table">
      <thead>
        <tr>
          <th rowspan="2">S.No</th>
          <th rowspan="2">Code</th>
          <th rowspan="2">Polar</th>
          <th rowspan="2">Description</th>
          <th rowspan="2">Unit</th>
          ${recHeaders}
        </tr>
        <tr>${recSubHeaders}</tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="summary-section">
      <div class="summary-title">RECOMMENDATION SUMMARY</div>
      <table class="summary-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Unit</th>
            <th>Code</th>
            ${summaryRecHeaders}
          </tr>
        </thead>
        <tbody>
          ${summaryItemRows}
          ${totalRows}
        </tbody>
      </table>
    </div>
  </div>`;
}

function finalPdf(q, settings) {
    const items = q.lineItems;
    const subtotal = items.reduce((acc, i) => acc + (i.finalAmount || 0), 0);
    const gstAmt = subtotal * ((q.gstRate || 18) / 100);
    const grandTotal = subtotal + gstAmt;

    const rowsHtml = items.map((item, i) => {
        const polarSrc = imageToBase64(item.polarDiagramUrl);
        const polarCell = polarSrc
            ? `<img src="${polarSrc}" style="width:44px;height:44px;object-fit:contain;display:block;margin:auto;" />`
            : '—';

        return `<tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
          <td>${item.sno}</td>
          <td><strong>${item.productCode}</strong></td>
          <td class="center">${polarCell}</td>
          <td class="desc">${(item.description || '').substring(0, 90)}</td>
          <td>${pillHtml(Array.isArray(item.bodyColours) ? item.bodyColours : [])}</td>
          <td>${pillHtml(Array.isArray(item.colourTemps) ? item.colourTemps : [])}</td>
          <td>${pillHtml(Array.isArray(item.beamAngles) ? item.beamAngles : [])}</td>
          <td>${pillHtml(Array.isArray(item.cri) ? item.cri : [])}</td>
          <td>${item.layoutCode || '—'}</td>
          <td>${item.finalBrandName || '—'}</td>
          <td class="mono">${fmt(item.finalListPrice)}</td>
          <td class="mono">${fmt(item.finalListPrice ? item.finalListPrice * 1.18 : null)}</td>
          <td>${item.finalDiscount != null ? item.finalDiscount + '%' : '—'}</td>
          <td class="mono">${fmt(item.finalRate)}</td>
          <td>${item.finalUnit === 'METERS' ? 'Mtr.' : 'Nos.'}</td>
          <td>${num(item.finalQuantity)}</td>
          <td class="mono"><strong>${fmt(item.finalAmount)}</strong></td>
          <td>${item.finalMacadamStep || '—'}</td>
        </tr>`;
    }).join('');

    const terms = (q.notes || '').split('\n').map(t => t.trim()).filter(Boolean);
    const s = settings || {};

    return `
  <div class="products-wrapper">
    <div class="section-header">${q.projectName} — ${q.city} — FINAL LIGHTING QUOTATION</div>
    <table class="main-table final-table">
      <thead>
        <tr>
          <th>S.No</th><th>Code</th><th>Polar</th><th>Description</th>
          <th>Body</th><th>CCT</th><th>Beam</th><th>CRI</th><th>Layout</th>
          <th>Brand</th><th>LP</th><th>LP+18%</th><th>Disc%</th><th>Rate</th>
          <th>Unit</th><th>Qty</th><th>Amount</th><th>Macadam</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="summary-section">
      <table class="totals-table">
        <tr><td>Sub-Total</td><td class="mono">${fmt(subtotal)}</td></tr>
        <tr><td>GST (${q.gstRate}%)</td><td class="mono">${fmt(gstAmt)}</td></tr>
        <tr class="grand-total"><td>GRAND TOTAL</td><td class="mono">${fmt(grandTotal)}</td></tr>
      </table>
    </div>

    <div class="footer-section">
      ${terms.length ? `<div class="terms-title">Terms &amp; Conditions</div>
      <ol class="terms-list">${terms.map(t => `<li>${t.replace(/^\d+\.\s*/, '')}</li>`).join('')}</ol>` : ''}

      <div class="bank-section">
        <div class="bank-title">Bank Details</div>
        <div class="bank-grid">
          <div><span class="bank-label">Account Name:</span> ${s.accountName || ''}</div>
          <div><span class="bank-label">Bank:</span> ${s.bankName || ''}</div>
          <div><span class="bank-label">Account No:</span> ${s.accountNumber || ''}</div>
          <div><span class="bank-label">IFSC:</span> ${s.ifscCode || ''}</div>
          <div><span class="bank-label">GST No:</span> ${s.gstNumber || ''}</div>
          <div><span class="bank-label">Address:</span> ${s.bankAddress || ''}</div>
        </div>
      </div>
    </div>
  </div>`;
}

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans', 'Helvetica Neue', Arial, sans-serif;
    font-size: 9px; color: #1a1a2e; background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  /* ── COVER PAGE: exact A4, no internal breaks ── */
  .cover-page {
    width: 210mm;
    height: 297mm;
    min-height: 297mm;
    max-height: 297mm;
    display: flex;
    flex-direction: column;
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-after: always;
    break-after: page;
    overflow: hidden;
    position: relative;
  }

  .cover-top {
    display: flex;
    flex: 0 0 35%;
    padding: 55px 48px;
    background: #ffffff;
    gap: 40px;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .cover-by, .cover-for { flex: 1; }

  .cover-label { font-size: 9px; font-weight: 700; color: #0A1628; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 14px; }
  .cover-company { font-size: 15px; font-weight: 700; color: #070C18; margin-bottom: 10px; line-height: 1.3; }
  .cover-sub { font-size: 10px; color: #444; margin-bottom: 5px; }
  .cover-address { font-size: 10px; color: #666; margin-top: 8px; line-height: 1.5; }

  .cover-bottom {
    flex: 1;
    background: #0A1628;
    padding: 50px 48px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .cover-quote-label h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 48px; font-weight: 700; color: #fff; line-height: 1.1; margin: 0; }
  .cover-dam { text-align: right; }
  .cover-dam-logo { font-size: 40px; font-weight: 900; color: #F5A623; letter-spacing: -1px; line-height: 1; }
  .cover-dam-tag { font-size: 10px; color: rgba(255,255,255,0.7); letter-spacing: 1px; margin-top: 6px; text-transform: lowercase; }

  /* ── CONTENT SECTIONS ── */
  .products-wrapper { padding: 14mm 10mm; }
  .page-break { page-break-before: always; break-before: page; }
  .section-header { background: #070C18; color: #fff; padding: 10px 14px; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; }

  /* ── TABLES ── */
  .main-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .main-table th { background: #0E1629; color: #7B91B0; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px; padding: 5px 3px; text-align: center; border: 1px solid #1E2D47; }
  .main-table td { padding: 4px 3px; border: 1px solid #e8ebf0; font-size: 8px; text-align: center; vertical-align: middle; }
  .desc { text-align: left !important; font-size: 7.5px; }
  .code { text-align: left !important; font-weight: 600; font-size: 8px; }
  .center { text-align: center; }
  .right { text-align: right !important; }
  .num { text-align: right !important; font-variant-numeric: tabular-nums; }
  .bold { font-weight: 700; }
  .row-even { background: #fff; }
  .row-odd { background: #F8F9FC; }
  .rec-header { background: #152035 !important; color: #F5A623 !important; }
  .rec-cell { font-size: 7.5px; }
  .mono { font-variant-numeric: tabular-nums; }
  .pill { display: inline-block; padding: 1px 4px; border-radius: 3px; background: #EDF2FF; font-size: 6.5px; color: #0E1629; margin: 1px; }

  /* ── SUMMARY TABLE ── */
  .summary-section { margin: 14px 0; }
  .summary-title { font-weight: 700; font-size: 9px; color: #070C18; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; border-bottom: 2px solid #F5A623; padding-bottom: 3px; }
  .summary-table { width: 100%; border-collapse: collapse; }
  .summary-table th { background: #0E1629; color: #7B91B0; padding: 5px 6px; font-size: 8px; font-weight: 600; border: 1px solid #1E2D47; text-align: center; }
  .summary-table td { padding: 4px 6px; border: 1px solid #e8ebf0; font-size: 8px; }
  .summary-cell { padding: 4px 6px !important; vertical-align: middle; }
  .summary-brand { font-size: 7.5px; color: #333; font-weight: 600; display: block; }
  .summary-amount { font-size: 8px; font-weight: 700; color: #0D1E40; font-variant-numeric: tabular-nums; display: block; }
  .subtotal-row td { background: #f0f4ff; font-weight: 600; font-size: 8px; }
  .total-row td { background: #070C18; color: #F5A623; font-weight: 700; font-size: 9px; }

  /* ── FINAL TOTALS ── */
  .totals-table { margin-left: auto; border-collapse: collapse; min-width: 280px; }
  .totals-table td { padding: 5px 10px; border: 1px solid #e8ebf0; font-size: 9px; }
  .totals-table td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .grand-total td { background: #070C18; color: #F5A623; font-weight: 700; font-size: 11px; }

  /* ── FOOTER ── */
  .footer-section { margin-top: 20px; padding-top: 14px; border-top: 2px solid #F5A623; }
  .terms-title { font-weight: 700; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 7px; color: #070C18; }
  .terms-list { padding-left: 16px; margin-bottom: 18px; }
  .terms-list li { margin-bottom: 3px; font-size: 8.5px; color: #333; line-height: 1.4; }
  .bank-section { margin-top: 14px; }
  .bank-title { font-weight: 700; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 7px; color: #070C18; }
  .bank-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 14px; }
  .bank-grid > div { font-size: 8.5px; color: #333; }
  .bank-label { font-weight: 600; color: #555; }

  /* ── FINAL TABLE specifics ── */
  .final-table th { font-size: 7px; padding: 4px 2px; }
  .final-table td { font-size: 7.5px; padding: 3px 2px; }
`;

async function generatePDF(quotation, settings, mode = 'final') {
    const bodyContent = mode === 'all_recs'
        ? allRecsPdf(quotation, settings)
        : finalPdf(quotation, settings);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;600;700&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
  ${coverPage(quotation, settings)}
  ${bodyContent}
</body>
</html>`;

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--font-render-hinting=none'
        ]
    });
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 794, height: 1123 });
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

        // Ensure fonts are fully painted before PDF generation
        await page.evaluateHandle('document.fonts.ready');

        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: mode === 'all_recs',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
        });
        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

module.exports = { generatePDF };
