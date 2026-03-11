const puppeteer = require('puppeteer');

const MACADAM_SPACE = { '1A': 40, '2A': 50, '3A': 75, '4A': 90, '5A': 100 };

function fmt(n) {
    if (n == null || isNaN(n)) return '—';
    return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function num(n) { if (n == null || isNaN(n)) return '—'; return Number(n).toLocaleString('en-IN'); }

function pillHtml(arr, color = '#1E2D47') {
    if (!arr || arr.length === 0) return '—';
    return arr.map(v => `<span class="pill">${v.replace('DEG', '°').replace('_', ' ')}</span>`).join(' ');
}

function coverPage(q, settings) {
    const s = settings || {};
    return `
  <div class="cover-page">
    <div class="cover-top">
      <div class="cover-col">
        <div class="cover-label">Developed &amp; Illuminated By</div>
        <div class="cover-company">${s.companyName || 'DAM Lighting Solution LLP'}</div>
        <div class="cover-sub">${s.phone || ''} &nbsp;|&nbsp; ${s.email || ''}</div>
        <div class="cover-sub">${s.website || ''}</div>
        <div class="cover-address">${s.address || ''}</div>
      </div>
      <div class="cover-divider"></div>
      <div class="cover-col">
        <div class="cover-label">Developed &amp; Illuminated For</div>
        <div class="cover-company">${q.client?.companyName || ''}</div>
        <div class="cover-sub">${q.client?.fullName || ''}</div>
        <div class="cover-address">${q.client?.address || ''}, ${q.client?.city || ''} — ${q.client?.pinCode || ''}</div>
      </div>
    </div>
    <div class="cover-bottom">
      <div class="cover-quote-label">Light Quotation</div>
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
        if (q.lineItems.some(item => item.recommendations.some(r => r.label === label && r.brandName))) {
            activeLabels.push(label);
        }
    }

    const recTotals = activeLabels.map(label => {
        const sum = q.lineItems.reduce((acc, item) => {
            const r = item.recommendations.find(r => r.label === label);
            return acc + (r ? r.amount : 0);
        }, 0);
        const gst = sum * (q.gstRate / 100);
        return { label, sum, gst, total: sum + gst };
    });

    const rowsHtml = q.lineItems.map((item, i) => {
        const recCells = activeLabels.map(label => {
            const r = item.recommendations.find(r => r.label === label);
            if (!r || !r.brandName) return `<td class="rec-cell" colspan="3">—</td>`;
            const space = MACADAM_SPACE[r.macadamStep] || '—';
            return `
              <td class="rec-cell">${r.macadamStep || '—'}</td>
              <td class="rec-cell mono">${fmt(r.rate)}</td>
              <td class="rec-cell mono">${fmt(r.amount)}<br><small>${space}%</small></td>`;
        }).join('');
        return `<tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
          <td>${item.sno}</td>
          <td><strong>${item.productCode}</strong></td>
          <td class="desc">${item.description.substring(0, 80)}</td>
          <td>${item.unit === 'NUMBERS' ? 'Nos.' : 'Mtr.'}</td>
          ${recCells}
        </tr>`;
    }).join('');

    const summaryRows = recTotals.map(r => `
      <tr>
        <td colspan="2"><strong>Rec ${r.label}</strong></td>
        <td class="mono">${fmt(r.sum)}</td>
        <td class="mono">${fmt(r.gst)}</td>
        <td class="mono"><strong>${fmt(r.total)}</strong></td>
      </tr>`).join('');

    const recHeaders = activeLabels.map(l =>
        `<th colspan="3" class="rec-header">REC ${l}</th>`).join('');
    const recSubHeaders = activeLabels.map(() =>
        `<th>Macadam</th><th>Rate</th><th>Amount</th>`).join('');

    return `
  <div class="page-break"></div>
  <div class="section-header">${q.projectName} — ${q.city} — LIGHTING QUOTATION</div>
  <table class="main-table">
    <thead>
      <tr>
        <th rowspan="2">S.No</th>
        <th rowspan="2">Code</th>
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
      <thead><tr><th colspan="2">Brand</th><th>Sub-Total</th><th>GST (${q.gstRate}%)</th><th>Grand Total</th></tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>
  </div>`;
}

function finalPdf(q, settings) {
    const items = q.lineItems;
    const subtotal = items.reduce((acc, i) => acc + (i.finalAmount || 0), 0);
    const gstAmt = subtotal * (q.gstRate / 100);
    const grandTotal = subtotal + gstAmt;

    const rowsHtml = items.map((item, i) => {
        return `<tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
          <td>${item.sno}</td>
          <td><strong>${item.productCode}</strong></td>
          <td class="desc">${item.description.substring(0, 100)}</td>
          <td>${pillHtml(item.bodyColours)}</td>
          <td>${pillHtml(item.colourTemps)}</td>
          <td>${pillHtml(item.beamAngles)}</td>
          <td>${pillHtml(item.cri)}</td>
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
  <div class="page-break"></div>
  <div class="section-header">${q.projectName} — ${q.city} — LIGHTING QUOTATION</div>
  <table class="main-table final-table">
    <thead>
      <tr>
        <th>S.No</th><th>Code</th><th>Description</th>
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
  </div>`;
}

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 9px; color: #1a1a2e; background: #fff; }
  .cover-page { min-height: 100vh; display: flex; flex-direction: column; }
  .cover-top { display: flex; flex: 1; padding: 60px 50px; background: #fff; }
  .cover-col { flex: 1; padding: 20px; }
  .cover-divider { width: 1px; background: #ddd; margin: 20px 0; }
  .cover-label { font-size: 10px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
  .cover-company { font-size: 22px; font-weight: 700; color: #070C18; margin-bottom: 8px; line-height: 1.3; }
  .cover-sub { font-size: 11px; color: #444; margin-bottom: 4px; }
  .cover-address { font-size: 10px; color: #666; margin-top: 12px; line-height: 1.5; }
  .cover-bottom { background: #070C18; padding: 40px 50px; display: flex; justify-content: space-between; align-items: center; }
  .cover-quote-label { font-family: 'Georgia', serif; font-size: 36px; color: #fff; font-style: italic; }
  .cover-dam-logo { font-size: 28px; font-weight: 900; color: #F5A623; letter-spacing: 4px; }
  .cover-dam-tag { font-size: 11px; color: #7B91B0; letter-spacing: 2px; margin-top: 4px; }
  .page-break { page-break-before: always; }
  .section-header { background: #070C18; color: #fff; padding: 12px 16px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
  .main-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .main-table th { background: #0E1629; color: #7B91B0; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 4px; text-align: center; border: 1px solid #1E2D47; }
  .main-table td { padding: 5px 4px; border: 1px solid #e8ebf0; font-size: 8.5px; text-align: center; vertical-align: middle; }
  .desc { text-align: left !important; font-size: 8px; }
  .row-even { background: #fff; }
  .row-odd { background: #F8F9FC; }
  .rec-header { background: #152035 !important; color: #F5A623 !important; }
  .rec-cell { font-size: 8px; }
  .mono { font-variant-numeric: tabular-nums; }
  .pill { display: inline-block; padding: 1px 4px; border-radius: 3px; background: #EDF2FF; font-size: 7px; color: #0E1629; margin: 1px; }
  .summary-section { margin: 16px 0; }
  .summary-title { font-weight: 700; font-size: 10px; color: #070C18; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; border-bottom: 2px solid #F5A623; padding-bottom: 4px; }
  .summary-table { width: 100%; border-collapse: collapse; }
  .summary-table th { background: #0E1629; color: #7B91B0; padding: 6px 8px; font-size: 9px; font-weight: 600; border: 1px solid #1E2D47; }
  .summary-table td { padding: 5px 8px; border: 1px solid #e8ebf0; font-size: 9px; }
  .totals-table { margin-left: auto; border-collapse: collapse; min-width: 300px; }
  .totals-table td { padding: 6px 12px; border: 1px solid #e8ebf0; font-size: 10px; }
  .totals-table td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .grand-total td { background: #070C18; color: #F5A623; font-weight: 700; font-size: 12px; }
  .footer-section { margin-top: 24px; padding-top: 16px; border-top: 2px solid #F5A623; }
  .terms-title { font-weight: 700; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; color: #070C18; }
  .terms-list { padding-left: 18px; margin-bottom: 20px; }
  .terms-list li { margin-bottom: 3px; font-size: 9px; color: #333; line-height: 1.4; }
  .bank-section { margin-top: 16px; }
  .bank-title { font-weight: 700; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; color: #070C18; }
  .bank-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
  .bank-grid > div { font-size: 9px; color: #333; }
  .bank-label { font-weight: 600; color: #555; }
  .final-table th { font-size: 7.5px; padding: 5px 3px; }
  .final-table td { font-size: 8px; padding: 4px 3px; }
`;

async function generatePDF(quotation, settings, mode = 'final') {
    const bodyContent = mode === 'all_recs'
        ? allRecsPdf(quotation, settings)
        : finalPdf(quotation, settings);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${CSS}</style>
</head>
<body>
  ${coverPage(quotation, settings)}
  ${bodyContent}
</body>
</html>`;

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: mode === 'all_recs',
            printBackground: true,
            margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' }
        });
        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

module.exports = { generatePDF };
