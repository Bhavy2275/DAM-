async function generatePDF(quotation, settings) {
    // Use dynamic import for puppeteer to handle environments where it's not available
    let puppeteer;
    try {
        puppeteer = require('puppeteer');
    } catch (e) {
        throw new Error('Puppeteer is not installed. Run: npm install puppeteer');
    }

    const html = buildPDFHTML(quotation, settings);
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    await browser.close();
    return Buffer.from(pdfBuffer);
}

function formatINR(num) {
    if (!num) return '₹0';
    return '₹' + Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function buildPDFHTML(quotation, settings) {
    const s = settings || {};
    const c = quotation.client || {};
    const brandColumns = ['HYBEC_ELITE', 'HYBEC_ECO_PRO', 'JAGUAR', 'PHILIPS', 'CUSTOM'];
    const brandLabels = {
        'HYBEC_ELITE': 'HYBEC ELITE',
        'HYBEC_ECO_PRO': 'HYBEC ECO PRO',
        'JAGUAR': 'JAGUAR',
        'PHILIPS': 'PHILIPS',
        'CUSTOM': 'CUSTOM'
    };

    // Determine which brand columns actually have data
    const activeBrands = brandColumns.filter(bc =>
        quotation.lineItems.some(item =>
            item.brands.some(b => b.brandColumn === bc && (b.rate || b.amount))
        )
    );

    // Build line items rows
    const itemRows = quotation.lineItems.map((item, idx) => {
        const brandCells = activeBrands.map(bc => {
            const brand = item.brands.find(b => b.brandColumn === bc);
            if (!brand) return '<td>-</td><td>-</td><td>-</td><td>-</td>';
            const matchColor = (brand.spaceMatch || 0) >= 100 ? '#22c55e' : (brand.spaceMatch || 0) >= 90 ? '#f59e0b' : '#f97316';
            return `
        <td>${brand.macadamStep || '-'}</td>
        <td>${brand.rate ? formatINR(brand.rate) : '-'}</td>
        <td style="font-weight:600">${brand.amount ? formatINR(brand.amount) : '-'}</td>
        <td><span style="background:${matchColor};color:#fff;padding:2px 8px;border-radius:12px;font-size:10px">${brand.spaceMatch || 0}%</span></td>
      `;
        }).join('');

        return `
      <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8f9fc'}">
        <td style="text-align:center">${item.sno}</td>
        <td style="font-weight:600">${item.productCode}</td>
        <td style="font-size:10px;max-width:200px">${item.description}</td>
        <td style="text-align:center">${item.polarImageUrl ? `<img src="${item.polarImageUrl}" style="width:40px;height:40px;border-radius:50%"/>` : '-'}</td>
        <td style="text-align:center">${item.unit}</td>
        <td style="text-align:center">${item.qtyApprox}</td>
        ${brandCells}
      </tr>
    `;
    }).join('');

    // Brand column headers
    const brandHeaders = activeBrands.map(bc => `
    <th colspan="4" style="background:#0A1628;color:#F59E0B;text-align:center;padding:8px;font-size:11px;border:1px solid #1e3a5f">
      ${brandLabels[bc]}
    </th>
  `).join('');

    const brandSubHeaders = activeBrands.map(() => `
    <th style="background:#12243d;color:#fff;padding:4px;font-size:9px;border:1px solid #1e3a5f">Macadam</th>
    <th style="background:#12243d;color:#fff;padding:4px;font-size:9px;border:1px solid #1e3a5f">Rate</th>
    <th style="background:#12243d;color:#fff;padding:4px;font-size:9px;border:1px solid #1e3a5f">Amount</th>
    <th style="background:#12243d;color:#fff;padding:4px;font-size:9px;border:1px solid #1e3a5f">Space%</th>
  `).join('');

    // Recommendations
    const recLabels = ['RECOMMENDATION A', 'RECOMMENDATION B', 'RECOMMENDATION C', 'RECOMMENDATION D'];
    const recGroups = recLabels.map(label => quotation.recommendations.filter(r => r.label === label));

    const recRows = quotation.lineItems.map((item, idx) => {
        const recCells = recGroups.map(group => {
            const rec = group.find(r => r.productCode === item.productCode);
            if (!rec) return '<td>-</td><td>-</td>';
            return `<td>${rec.brandName}</td><td style="font-weight:600">${formatINR(rec.amount)}</td>`;
        }).join('');

        return `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8f9fc'}">
        <td style="text-align:center">${item.sno}</td>
        <td style="text-align:center">${item.qtyApprox}</td>
        <td style="text-align:center">${item.unit}</td>
        <td style="font-weight:600">${item.productCode}</td>
        ${recCells}
      </tr>
    `;
    }).join('');

    // Recommendation totals
    const recTotals = recGroups.map(group => group.reduce((s, r) => s + r.amount, 0));
    const gstRate = quotation.gstRate || 18;
    const recGST = recTotals.map(t => t * (gstRate / 100));
    const recGrand = recTotals.map((t, i) => t + recGST[i]);

    const recTotalCells = recTotals.map(t => `<td colspan="2" style="font-weight:700;text-align:right;padding:8px">${formatINR(t)}</td>`).join('');
    const recGSTCells = recGST.map(t => `<td colspan="2" style="text-align:right;padding:8px">${formatINR(t)}</td>`).join('');
    const recGrandCells = recGrand.map(t => `<td colspan="2" style="font-weight:700;text-align:right;padding:8px;background:#0A1628;color:#F59E0B">${formatINR(t)}</td>`).join('');

    const recHeaders = recLabels.map(l => `<th colspan="2" style="background:#0A1628;color:#F59E0B;text-align:center;padding:8px;font-size:11px">REC ${l.split(' ')[1]}</th>`).join('');

    // Terms
    const terms = (quotation.notes || s.defaultTerms || '').split('\n').map((t, i) => `<p style="margin:2px 0;font-size:11px">${t}</p>`).join('');

    return `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; }
  .page { page-break-after: always; width: 100%; min-height: 100%; }
  .page:last-child { page-break-after: auto; }

  /* Cover Page */
  .cover { display: flex; flex-direction: column; height: 100vh; }
  .cover-top { flex: 1; background: #ffffff; display: flex; padding: 60px; }
  .cover-left, .cover-right { flex: 1; }
  .cover-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; }
  .cover-company { font-size: 22px; font-weight: 700; color: #0A1628; margin-bottom: 10px; }
  .cover-detail { font-size: 13px; color: #555; line-height: 1.8; }
  .cover-bottom { flex: 1; background: #0A1628; display: flex; align-items: center; justify-content: space-between; padding: 60px; }
  .cover-title { color: #ffffff; }
  .cover-title h1 { font-size: 56px; font-weight: 300; letter-spacing: 4px; }
  .cover-title h2 { font-size: 42px; font-weight: 700; }
  .cover-brand { text-align: right; color: #F59E0B; }
  .cover-brand h1 { font-size: 48px; font-weight: 800; letter-spacing: 6px; }
  .cover-brand p { font-size: 14px; letter-spacing: 3px; margin-top: 10px; }

  /* Table */
  .items-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .items-table th, .items-table td { padding: 6px 8px; border: 1px solid #e2e8f0; }
  .title-banner { background: #0A1628; color: #fff; padding: 16px; text-align: center; font-size: 16px; font-weight: 700; letter-spacing: 2px; margin-bottom: 0; }

  /* Recommendations */
  .rec-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .rec-table th, .rec-table td { padding: 6px 8px; border: 1px solid #e2e8f0; }

  /* Footer */
  .terms-section { padding: 20px; background: #f8f9fc; }
  .terms-title { font-size: 14px; font-weight: 700; color: #0A1628; margin-bottom: 10px; }
  .bank-section { padding: 20px; background: #0A1628; color: #fff; }
  .bank-title { font-size: 14px; font-weight: 700; color: #F59E0B; margin-bottom: 10px; }
  .bank-detail { font-size: 11px; line-height: 1.8; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="page">
  <div class="cover">
    <div class="cover-top">
      <div class="cover-left">
        <div class="cover-label">Developed & Illuminated By</div>
        <div class="cover-company">${s.companyName || 'Dam Lighting Solution LLP'}</div>
        <div class="cover-detail">
          ${s.phone || ''}<br/>
          ${s.email || ''}<br/>
          ${s.website || ''}<br/>
          ${s.address || ''}
        </div>
      </div>
      <div class="cover-right" style="padding-left:40px;border-left:2px solid #e2e8f0">
        <div class="cover-label">Developed & Illuminated For</div>
        <div class="cover-company">${c.company || c.name || ''}</div>
        <div class="cover-detail">
          ${c.address || ''}<br/>
          ${c.city || ''}${c.state ? ', ' + c.state : ''}${c.pincode ? ' — ' + c.pincode : ''}
        </div>
      </div>
    </div>
    <div class="cover-bottom">
      <div class="cover-title">
        <h1>Light</h1>
        <h2>Quotation</h2>
      </div>
      <div class="cover-brand">
        <h1>DAM</h1>
        <p>${s.tagline || 'design. allocate. maintain.'}</p>
      </div>
    </div>
  </div>
</div>

<!-- ITEMS TABLE -->
<div class="page">
  <div class="title-banner">${quotation.projectName || quotation.title} — LIGHTING QUOTATION</div>
  <table class="items-table">
    <thead>
      <tr>
        <th rowspan="2" style="background:#0A1628;color:#fff;padding:8px;border:1px solid #1e3a5f">S.No</th>
        <th rowspan="2" style="background:#0A1628;color:#fff;padding:8px;border:1px solid #1e3a5f">Code</th>
        <th rowspan="2" style="background:#0A1628;color:#fff;padding:8px;border:1px solid #1e3a5f;min-width:180px">Description</th>
        <th rowspan="2" style="background:#0A1628;color:#fff;padding:8px;border:1px solid #1e3a5f">Polar</th>
        <th rowspan="2" style="background:#0A1628;color:#fff;padding:8px;border:1px solid #1e3a5f">Unit</th>
        <th rowspan="2" style="background:#0A1628;color:#fff;padding:8px;border:1px solid #1e3a5f">Qty</th>
        ${brandHeaders}
      </tr>
      <tr>${brandSubHeaders}</tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
</div>

<!-- RECOMMENDATIONS -->
<div class="page">
  <div class="title-banner">RECOMMENDATIONS SUMMARY</div>
  <table class="rec-table">
    <thead>
      <tr>
        <th style="background:#0A1628;color:#fff;padding:8px">S.No</th>
        <th style="background:#0A1628;color:#fff;padding:8px">Qty</th>
        <th style="background:#0A1628;color:#fff;padding:8px">Unit</th>
        <th style="background:#0A1628;color:#fff;padding:8px">Code</th>
        ${recHeaders}
      </tr>
    </thead>
    <tbody>
      ${recRows}
      <tr style="background:#f1f5f9">
        <td colspan="4" style="text-align:right;font-weight:700;padding:8px">SUM</td>
        ${recTotalCells}
      </tr>
      <tr style="background:#f1f5f9">
        <td colspan="4" style="text-align:right;font-weight:700;padding:8px">GST ${gstRate}%</td>
        ${recGSTCells}
      </tr>
      <tr>
        <td colspan="4" style="text-align:right;font-weight:700;padding:8px;background:#0A1628;color:#fff">TOTAL</td>
        ${recGrandCells}
      </tr>
    </tbody>
  </table>

  <!-- Terms & Conditions -->
  <div class="terms-section" style="margin-top:24px">
    <div class="terms-title">Terms & Conditions</div>
    ${terms}
  </div>

  <!-- Bank Details -->
  <div class="bank-section" style="margin-top:16px;border-radius:8px">
    <div class="bank-title">Bank Details</div>
    <div class="bank-detail">
      <strong>Account Name:</strong> ${s.accountName || '-'}<br/>
      <strong>Bank Name:</strong> ${s.bankName || '-'}<br/>
      <strong>Account Number:</strong> ${s.accountNumber || '-'}<br/>
      <strong>IFSC Code:</strong> ${s.ifscCode || '-'}<br/>
      <strong>Address:</strong> ${s.bankAddress || '-'}<br/>
      <strong>GST:</strong> ${s.gstNumber || '-'}<br/>
      <strong>Contact No:</strong> ${s.phone || '-'}
    </div>
  </div>
</div>

</body>
</html>`;
}

module.exports = { generatePDF };
