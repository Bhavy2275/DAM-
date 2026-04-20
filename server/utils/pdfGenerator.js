const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const MACADAM_MAP = { "5A": "100%", "4A": "90%", "3A": "75%", "2A": "50%", "1A": "40%" };

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(amount) {
  if (amount == null || amount === "") return "—";
  const n = Number(amount);
  if (isNaN(n)) return "—";
  return "Rs.\u00A0" + n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function parseArr(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

function tagLines(val) {
  const items = parseArr(val);
  if (!items.length) return "—";
  return items.map(v =>
    `<div style="font-size:6.5px;line-height:1.6;color:#333;text-align:center">${esc(v.replace(/DEG/g, "°").replace(/_/g, " "))}</div>`
  ).join("");
}

function macadamCell(step) {
  if (!step) return "—";
  const pct = MACADAM_MAP[step] || "";
  return `<div style="font-size:7.5px;font-weight:700;color:#0D1E40;text-align:center">${step}</div>`
    + `<div style="font-size:6.5px;color:#555;text-align:center;margin-top:1px">(${pct})</div>`;
}

const ALLOWED_IMAGE_HOSTS = ['res.cloudinary.com', 'damlighting.com', 'www.damlighting.com'];

function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    // Block localhost and private IPs
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
    if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('169.254.')) return false;
    if (hostname.startsWith('172.')) {
      const second = parseInt(hostname.split('.')[1], 10);
      if (second >= 16 && second <= 31) return false;
    }
    // Only allow known hosts
    return ALLOWED_IMAGE_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
  } catch { return false; }
}

function toBase64(imageUrl) {
  if (!imageUrl) return Promise.resolve(null);

  // Handle HTTP/HTTPS URLs
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    if (!isAllowedUrl(imageUrl)) {
      console.warn('Blocked disallowed image URL:', imageUrl);
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) { resolved = true; resolve(null); }
      }, 10000); // 10s timeout per image

      try {
        const pdfUrl = imageUrl.includes("res.cloudinary.com")
          ? imageUrl.replace("/upload/", "/upload/w_150,q_auto,f_png/")
          : imageUrl;
        const client = pdfUrl.startsWith("https") ? https : http;

        const req = client.get(pdfUrl, (res) => {
          const chunks = [];
          res.on("data", c => chunks.push(c));
          res.on("end", () => {
            if (resolved) return;
            clearTimeout(timer);
            resolved = true;
            try {
              const buf = Buffer.concat(chunks);
              const mime = res.headers["content-type"] || "image/png";
              resolve("data:" + mime + ";base64," + buf.toString("base64"));
            } catch (e) { resolve(null); }
          });
          res.on("error", () => {
            if (resolved) return;
            clearTimeout(timer);
            resolved = true;
            resolve(null);
          });
        });
        req.on("error", () => {
          if (resolved) return;
          clearTimeout(timer);
          resolved = true;
          resolve(null);
        });
        req.on("timeout", () => {
          if (resolved) return;
          clearTimeout(timer);
          resolved = true;
          resolve(null);
        });
      } catch (e) {
        if (!resolved) { clearTimeout(timer); resolved = true; resolve(null); }
      }
    });
  }

  // Handle local files
  try {
    const rel = imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl;
    const full = path.join(__dirname, "..", rel);
    if (fs.existsSync(full)) {
      const buf = fs.readFileSync(full);
      const ext = path.extname(full).slice(1).toLowerCase();
      const mime = (ext === "jpg" || ext === "jpeg") ? "image/jpeg"
        : ext === "svg" ? "image/svg+xml" : "image/" + ext;
      return Promise.resolve("data:" + mime + ";base64," + buf.toString("base64"));
    }
  } catch (e) {
    console.error("toBase64 local error:", e.message);
  }

  return Promise.resolve(null);
}

function getCustomCols(quotation) {
  if (!quotation.customLabels) return [];
  try {
    const cl = typeof quotation.customLabels === "string"
      ? JSON.parse(quotation.customLabels) : quotation.customLabels;
    if (cl && Array.isArray(cl.__customCols)) return cl.__customCols;
  } catch (e) { }
  return [];
}

function getCustomField(item, colId) {
  if (!item.customFields) return "—";
  try {
    const cf = typeof item.customFields === "string"
      ? JSON.parse(item.customFields) : item.customFields;
    const val = cf[colId];
    if (val === "true" || val === true) return "✓";
    if (val === "false" || val === false) return "✗";
    if (val != null && val !== "") return String(val);
  } catch (e) { }
  return "—";
}

// ── Shared style constants ───────────────────────────────────────────────────
const TABLE_STYLE = "width:100%;border-collapse:collapse;font-size:7.5px;";

const TH = [
  "border:0.5px solid #888",
  "padding:5px 4px",
  "text-align:center",
  "font-weight:700",
  "font-size:7px",
  "color:#ffffff",
  "background:#002061",
  "vertical-align:middle",
  "line-height:1.3",
  "white-space:nowrap",
].join(";") + ";";

const TD = [
  "border:0.5px solid #888",
  "padding:4px 4px",
  "vertical-align:middle",
  "line-height:1.4",
  "font-size:7.5px",
  "color:#333",
].join(";") + ";";

const TH_BRAND = [
  "border:0.5px solid #002061",
  "padding:5px 4px",
  "text-align:center",
  "font-weight:700",
  "font-size:7.5px",
  "color:#F5A623",
  "background:#002061",
  "vertical-align:middle",
  "line-height:1.3",
  "letter-spacing:0.5px",
].join(";") + ";";

const TH_GREY = [
  "border:0.5px solid #002061",
  "padding:5px 4px",
  "text-align:center",
  "font-weight:700",
  "font-size:7px",
  "color:#ffffff",
  "background:#0b162c",
  "vertical-align:middle",
  "line-height:1.3",
  "white-space:nowrap",
].join(";") + ";";

// ════════════════════════════════════════════════════════════════════════════
// COVER PAGE — A3 landscape, all pages landscape
// ════════════════════════════════════════════════════════════════════════════
function coverHTML(quotation, settings, logoB64, logoHeight = 160) {
  const client = quotation.client || {};
  const s = settings || {};

  const companyName = esc(s.companyName) || "Lighting Gallery";
  const companyPhone = s.phone || "";
  const companyEmail = s.email || "";
  const companyWebsite = s.website || "";
  const companyAddress = esc(s.address) || "";

  const clientName = esc(client.companyName || client.fullName || "");
  const clientPerson = (client.companyName && client.fullName) ? esc(client.fullName) : "";

  const cityParts = [];
  if (client.city) cityParts.push(client.city);
  if (client.state) cityParts.push(client.state);
  if (client.country) cityParts.push(client.country);
  const clientCityLine = cityParts.join(", ");
  const clientPinLine = client.pinCode ? "Pincode - " + client.pinCode : "";

  // If addrHtml is pre-formatted (e.g. for Light Gallery), use it directly
  const addrLines = s.addrHtml
    ? s.addrHtml
    : companyAddress
      ? companyAddress.split(",").map(s => s.trim()).filter(Boolean).join(",<br>")
      : "";

  return `
<div style="position:relative;width:100%;height:100%;background:#fff;font-family:Arial,'Helvetica Neue',sans-serif">

  <!-- TOP WHITE SECTION (45%) -->
  <div style="position:absolute;top:0;left:0;right:0;height:45%;padding:24px 24px 0 24px;box-sizing:border-box">
    <div style="border:1px solid #ccc;height:100%;box-sizing:border-box;display:flex">

      <!-- Left: Developed By -->
      <div style="flex:1;padding:24px 32px;border-right:1px solid #ddd">
        <p style="font-family:'Calibri',sans-serif;font-size:16px;font-weight:700;color:#002061;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px 0">
          Developed &amp; Illuminated By
        </p>
        <p style="font-size:32px;font-weight:700;color:#111;margin:0 0 10px 0">
          ${companyName}
        </p>
        <p style="font-size:15px;color:#444;line-height:1.9;margin:0 0 10px 0">
          ${companyPhone}<br>
          ${companyEmail}<br>
          ${companyWebsite}
        </p>
        <p style="font-size:15px;color:#444;line-height:1.7;margin:0">
          ${addrLines}
        </p>
      </div>

      <!-- Right: Developed For -->
      <div style="flex:1;padding:24px 32px">
        <p style="font-family:'Calibri',sans-serif;font-size:16px;font-weight:700;color:#002061;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px 0">
          Developed &amp; Illuminated For
        </p>
        <p style="font-size:32px;font-weight:700;color:#111;margin:0 0 10px 0">
          ${clientName}
        </p>
        ${clientPerson ? `<p style="font-size:15px;color:#444;margin:0 0 6px 0">${clientPerson}</p>` : ""}
          ${esc(client.address) ? `<p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 6px 0">${esc(client.address)}</p>` : ""}
        ${clientCityLine ? `<p style="font-size:15px;color:#444;margin:0 0 4px 0">${clientCityLine}.</p>` : ""}
        ${clientPinLine ? `<p style="font-size:15px;color:#444;margin:0">${clientPinLine}</p>` : ""}
      </div>

    </div>
  </div>

  <!-- BOTTOM NAVY SECTION (55%) -->
  <div style="position:absolute;bottom:0;left:0;right:0;height:55%;background:#002061;
              display:flex;align-items:center;justify-content:space-between;
              padding:0 80px;box-sizing:border-box;overflow:visible">

    <!-- Light Quotation serif text -->
    <div style="font-family:'Times New Roman',Times,serif;font-size:84px;font-weight:700;
                color:#ffffff;line-height:0.9;letter-spacing:-2px">
      Light<br>Quotation
    </div>

    <!-- Brand logo -->
    <div style="display:flex;align-items:center;justify-content:flex-end;flex:1;padding-left:40px">
      ${logoB64 ? `<img src="${logoB64}" style="height:${logoHeight}px; width:auto; max-width:700px; object-fit:contain;"/>` : `
      <div>
        <div style="font-family:'Arial Black',Arial,sans-serif;font-size:68px;font-weight:900;
                    color:#ffffff;letter-spacing:-3px;line-height:1">DAM</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:2px;
                    margin-top:8px;font-family:Arial,sans-serif">
          design. allocate. maintain.
        </div>
      </div>`}
    </div>

  </div>
</div>`;
}

// ════════════════════════════════════════════════════════════════════════════
// TERMS + BANK
// ════════════════════════════════════════════════════════════════════════════
function termsAndBankHTML(quotation, settings) {
  const s = settings || {};
  const rawTerms = quotation.notes || s.defaultTerms || "";
  const termLines = rawTerms.split("\n").map(t => t.trim()).filter(Boolean);

  const termsList = termLines.length
    ? '<ol style="padding-left:16px;line-height:2;color:#333;font-size:8px;margin:0">'
    + termLines.map(t => `<li>${t.replace(/^\d+\.\s*/, "")}</li>`).join("")
    + "</ol>"
    : '<p style="font-size:8px;color:#999">No terms specified.</p>';

  const bankRows = [
    ["Account Name", esc(s.accountName || "")],
    ["Bank Name", esc(s.bankName || "")],
    ["Account Number", esc(s.accountNumber || "")],
    ["IFSC Code", esc(s.ifscCode || "")],
    ["Address", esc(s.address || "")],
    ["GST", esc(s.gstNumber || "")],
    ["Contact No", s.phone || ""],
  ].map(([k, v]) => `
    <tr>
      <td style="padding:3px 8px;border:0.5px solid #ccc;font-weight:600;color:#0D1E40;
                 background:#f5f7fa;white-space:nowrap;width:120px;font-size:8px">${k}</td>
      <td style="padding:3px 8px;border:0.5px solid #ccc;font-size:8px">${v}</td>
    </tr>`).join("");

  return `
<div style="display:flex;gap:40px;margin:20px 14px 14px;font-family:Arial,sans-serif">
  <div style="flex:1.4">
    <div style="font-weight:700;font-size:9px;color:#0D1E40;border-bottom:1.5px solid #0D1E40;
                padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.8px">
      Terms &amp; Conditions:
    </div>
    ${termsList}
  </div>
  <div style="flex:0.9">
    <div style="font-weight:700;font-size:9px;color:#0D1E40;border-bottom:1.5px solid #0D1E40;
                padding-bottom:4px;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.8px">
      Bank Details :
    </div>
    <table style="width:100%;border-collapse:collapse">${bankRows}</table>
  </div>
</div>`;
}

// FINAL TABLE — selected recommendation per item
// ════════════════════════════════════════════════════════════════════════════
async function finalTableHTML(quotation, logoB64) {
  let items = quotation.lineItems || [];
  const customCols = getCustomCols(quotation);
  const hasCustomCols = customCols.length > 0;

  // Fallback to Rec A if no final amounts
  const initialSum = items.reduce((s, i) => s + (Number(i.finalAmount) || 0), 0);
  if (initialSum === 0) {
    items = items.map(item => {
      const recA = (item.recommendations || []).find(r => r.label === "A");
      if (recA) return Object.assign({}, item, {
        finalBrandName: recA.brandName || item.finalBrandName,
        finalProductCode: recA.productCode || item.finalProductCode,
        finalListPrice: recA.listPrice,
        finalDiscount: recA.discountPercent,
        finalRate: recA.rate,
        finalUnit: recA.unit,
        finalQuantity: recA.quantity,
        finalAmount: recA.amount,
        finalMacadamStep: recA.macadamStep,
      });
      return item;
    });
  }

  let finalSub = 0;
  let finalGst = 0;
  const gstRate = quotation.gstRate || 18;
  const gstMult = gstRate / 100;

  items.forEach(i => {
    const amt = parseFloat(i.finalAmount) || 0;
    const isInc = i.finalPriceType === 'LP_INC';
    if (isInc) {
      // amt is the NET (excl. GST) stored value; display gross = amt * gstMultTotal
      const gross = amt * (1 + gstMult);
      const net = amt;
      finalSub += net;
      finalGst += gross - net;
    } else {
      finalSub += amt;
      finalGst += amt * gstMult;
    }
  });

  const subtotal = finalSub;
  const gstAmt = finalGst;
  const grand = subtotal + gstAmt;

  const [polarB64s, productB64s] = await Promise.all([
    Promise.all(items.map(i => toBase64(i.polarDiagramUrl))),
    Promise.all(items.map(i => toBase64(i.productImageUrl))),
  ]);

  // Group by brand
  const groups = [];
  let cur = null;
  for (const item of items) {
    const brand = item.finalBrandName || "";
    if (!cur || cur.brand !== brand) { cur = { brand, items: [] }; groups.push(cur); }
    cur.items.push(item);
  }

  let hCols = {};
  try {
    const cl = typeof quotation.customLabels === "string" ? JSON.parse(quotation.customLabels) : quotation.customLabels;
    if (cl && cl.__hiddenCols) hCols = cl.__hiddenCols;
  } catch (e) { }

  const sSno = !hCols['S.No'];
  const sLayout = !hCols['Layout'];
  const sCode = !hCols['Code'];
  const sDesc = !hCols['Description / Attributes'];
  const sPolar = !hCols['Polar Diagram'];
  const sProdImg = !hCols['Product Image'];

  const sLp = !hCols['Listing Price'];
  const sLp18 = !hCols['LP+18%'];
  const sDisc = !hCols['Disc %'];
  const sRate = !hCols['Rate'];
  const sUnit = !hCols['Unit'];
  const sQty = !hCols['Qty'];
  const sAmt = !hCols['Amount'];
  const sMac = !hCols['Macadam'];

  const banner = esc(quotation.projectName || "") + " \u2014 " + esc(quotation.city || "") + " \u2014 LIGHTING QUOTATION";

  const specHeaders = [];
  if (sSno) specHeaders.push(`<th style="${TH}">S.NO</th>`);
  if (sLayout) specHeaders.push(`<th style="${TH}">LAYOUT<br>CODE</th>`);
  if (sCode) specHeaders.push(`<th style="${TH}">PRODUCT<br>CODE</th>`);
  if (sDesc) {
    specHeaders.push(`<th style="${TH}width:140px">PRODUCT DESCRIPTION</th>`);
  }
  if (sPolar) specHeaders.push(`<th style="${TH}">POLAR<br>DIAGRAM</th>`);
  if (sProdImg) specHeaders.push(`<th style="${TH}">PRODUCT<br>IMAGE</th>`);
  if (sDesc) {
    specHeaders.push(`<th style="${TH}">BODY<br>COLOUR</th>`);
    specHeaders.push(`<th style="${TH}">REFLECTOR<br>COLOUR</th>`);
    specHeaders.push(`<th style="${TH}">COLOUR<br>TEMPERATURE</th>`);
    specHeaders.push(`<th style="${TH}">BEAM<br>ANGLE</th>`);
    specHeaders.push(`<th style="${TH}">CRI</th>`);
  }
  const specColCount = specHeaders.length;

  const brandHeaders2 = [];
  if (sCode) brandHeaders2.push(`<th style="${TH}">PRODUCT<br>CODE</th>`);
  if (sQty) brandHeaders2.push(`<th style="${TH}">QTY</th>`);
  if (sUnit) brandHeaders2.push(`<th style="${TH}">UNIT</th>`);
  if (sLp) brandHeaders2.push(`<th style="${TH}">LIST<br>PRICE</th>`);
  if (sLp18) brandHeaders2.push(`<th style="${TH}">LISTING PRICE<br>+18%</th>`);
  if (sDisc) brandHeaders2.push(`<th style="${TH}">DISC<br>%</th>`);
  if (sRate) brandHeaders2.push(`<th style="${TH}">RATE</th>`);
  if (sMac) brandHeaders2.push(`<th style="${TH}">MACADAM<br>STEP</th>`);
  if (sAmt) brandHeaders2.push(`<th style="${TH}">AMOUNT</th>`);
  const brandColCount = brandHeaders2.length;

  const theadHTML = `
<thead>
  <tr>
    ${specHeaders.join("")}
    ${brandHeaders2.join("")}
  </tr>
</thead>`;

  let rowsHTML = "";
  let globalIdx = 0;

  for (const group of groups) {

    for (const item of group.items) {
      const idx = items.indexOf(item);
      const bg = globalIdx % 2 === 0 ? "#ffffff" : "#f7f9fc";
      globalIdx++;

      const polar = polarB64s[idx]
        ? `<img src="${polarB64s[idx]}" style="width:48px;height:48px;object-fit:contain;display:block;margin:auto"/>`
        : "—";
      const prodImg = productB64s[idx]
        ? `<img src="${productB64s[idx]}" style="width:44px;height:44px;object-fit:contain;display:block;margin:auto"/>`
        : "—";

      const gstMult = 1 + (Number(quotation.gstRate) || 18) / 100;
      const priceType = item.finalPriceType || 'LP';
      // finalListPrice is always stored as NET (LP excl. GST).
      // When user selected LP_INC, they typed the inclusive price; the net was back-calculated.
      // In the PDF: LP column = net price (LP mode) OR the original inclusive price (LP_INC mode).
      // LP+18% column always shows net × 1.18 (which equals what was originally typed in LP_INC mode).
      const lpNet = item.finalListPrice != null ? Number(item.finalListPrice) : null;
      const lpIncVal = lpNet != null ? lpNet * gstMult : null;
      const lp = lpNet != null ? fmt(priceType === 'LP_INC' ? lpIncVal : lpNet) : "—";
      const lp18 = lpNet != null ? fmt(lpIncVal) : "—";
      const disc = item.finalDiscount != null ? item.finalDiscount + "%" : "—";

      const isInc = priceType === 'LP_INC';
      const rawRate = parseFloat(item.finalRate) || 0;
      const rawAmt = parseFloat(item.finalAmount) || 0;

      const rateVal = item.finalRate != null ? (isInc ? rawRate * gstMult : rawRate) : null;
      const amtVal = item.finalAmount != null ? (isInc ? rawAmt * gstMult : rawAmt) : null;

      const rate = rateVal != null ? fmt(rateVal) : "—";
      const amt = amtVal != null ? fmt(amtVal) : "—";

      const unit = item.finalUnit === "METERS" ? "Mtr." : "Nos.";
      const qty = item.finalQuantity != null ? item.finalQuantity : "—";
      const mac = macadamCell(item.finalMacadamStep);

      let rowHtml = `<tr style="background:${bg}">`;
      if (sSno) rowHtml += `<td style="${TD}text-align:center;">${item.sno || globalIdx}</td>`;
      if (sLayout) rowHtml += `<td style="${TD}text-align:center;font-size:7px;">${item.layoutCode || "—"}</td>`;
      if (sCode) rowHtml += `<td style="${TD}text-align:center;font-weight:700;color:#0D1E40;font-size:7.5px;">${item.productCode || ""}</td>`;
      if (sDesc) {
        rowHtml += `<td style="${TD}font-size:7px;line-height:1.5;color:#333;min-width:130px">${esc((item.description || "").slice(0, 220))}</td>`;
      }
      if (sPolar) rowHtml += `<td style="${TD}text-align:center;padding:3px">${polar}</td>`;
      if (sProdImg) rowHtml += `<td style="${TD}text-align:center;padding:3px">${prodImg}</td>`;
      if (sDesc) {
        rowHtml += `<td style="${TD}text-align:center">${tagLines(item.bodyColours)}</td>`;
        rowHtml += `<td style="${TD}text-align:center">${tagLines(item.reflectorColours)}</td>`;
        rowHtml += `<td style="${TD}text-align:center">${tagLines(item.colourTemps)}</td>`;
        rowHtml += `<td style="${TD}text-align:center">${tagLines(item.beamAngles)}</td>`;
        rowHtml += `<td style="${TD}text-align:center">${tagLines(item.cri)}</td>`;
      }
      if (sCode) rowHtml += `<td style="${TD}text-align:center;font-size:7px">${item.finalProductCode || "—"}</td>`;
      if (sQty) rowHtml += `<td style="${TD}text-align:center;font-weight:700">${qty}</td>`;
      if (sUnit) rowHtml += `<td style="${TD}text-align:center">${unit}</td>`;
      if (sLp) rowHtml += `<td style="${TD}text-align:right;font-variant-numeric:tabular-nums">${lp}</td>`;
      if (sLp18) rowHtml += `<td style="${TD}text-align:right;font-variant-numeric:tabular-nums;color:#555">${lp18}</td>`;
      if (sDisc) rowHtml += `<td style="${TD}text-align:center">${disc}</td>`;
      if (sRate) rowHtml += `<td style="${TD}text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${rate}</td>`;
      if (sMac) rowHtml += `<td style="${TD}text-align:center">${mac}</td>`;
      if (sAmt) rowHtml += `<td style="${TD}text-align:right;font-weight:700;color:#0D1E40;font-variant-numeric:tabular-nums">${amt}</td>`;
      rowHtml += `</tr>`;
      rowsHTML += rowHtml;
    }
  }

  const footerSpan = specColCount + brandColCount - 1;
  const tfootHTML = `
<tfoot>
  <tr>
    <td colspan="${footerSpan}" style="${TD}text-align:right;font-weight:700;background:#f0f4f8;font-size:8.5px">Sub-Total</td>
    <td style="${TD}text-align:right;font-weight:700;background:#f0f4f8;font-variant-numeric:tabular-nums">${fmt(subtotal)}</td>
  </tr>
  <tr>
    <td colspan="${footerSpan}" style="${TD}text-align:right;background:#f0f4f8;font-size:8.5px">GST (${gstRate}%)</td>
    <td style="${TD}text-align:right;background:#f0f4f8;font-variant-numeric:tabular-nums">${fmt(gstAmt)}</td>
  </tr>
  <tr>
    <td colspan="${footerSpan}" style="${TD}text-align:right;font-weight:700;background:#002061;color:#F5A623;font-size:9.5px">GRAND TOTAL</td>
    <td style="${TD}text-align:right;font-weight:700;background:#002061;color:#F5A623;font-size:9.5px;font-variant-numeric:tabular-nums">${fmt(grand)}</td>
  </tr>
</tfoot>`;

  const mainTable = `
<div style="padding:8px 10px 0;font-family:Arial,sans-serif">
  <div style="background:#002061;color:#ffffff;text-align:center;font-weight:700;font-size:11px;
              padding:9px 14px;letter-spacing:1.5px;margin-bottom:0">
    ${banner}
  </div>
  <div style="overflow-x:auto">
    <table style="${TABLE_STYLE}">
      ${theadHTML}
      <tbody>${rowsHTML}</tbody>
      ${tfootHTML}
    </table>
  </div>
</div>`;

  // Add-ons table (only if custom columns exist)
  let addOnsTable = "";
  if (hasCustomCols) {
    const addOnsThHTML = customCols.map(col =>
      `<th style="${TH_BRAND}white-space:nowrap">${(col.label || "").toUpperCase()}</th>`
    ).join("");
    let addOnsRows = "";
    let addOnsIdx = 0;
    for (const item of items) {
      const bg = addOnsIdx % 2 === 0 ? "#ffffff" : "#f7f9fc";
      addOnsIdx++;
      const customTds = customCols.map(col =>
        `<td style="${TD}text-align:center">${getCustomField(item, col.id)}</td>`
      ).join("");
      addOnsRows += `
<tr style="background:${bg}">
  <td style="${TD}text-align:center;font-weight:700;color:#0D1E40">${item.sno || addOnsIdx}</td>
  <td style="${TD}text-align:center;font-weight:700;color:#0D1E40;font-size:7.5px">${item.productCode || "—"}</td>
  <td style="${TD}font-size:7px;color:#333">${esc((item.description || "").slice(0, 100))}</td>
  ${customTds}
</tr>`;
    }
    addOnsTable = `
<div style="padding:12px 10px 0;font-family:Arial,sans-serif">
  <div style="background:#a6a6a6;color:#111;text-align:center;font-weight:700;font-size:11px;
              padding:9px 14px;letter-spacing:1.5px;margin-bottom:0">ADD-ONS</div>
  <table style="${TABLE_STYLE}">
    <thead>
      <tr>
        <th style="${TH}">S.NO</th>
        <th style="${TH}">PRODUCT<br>CODE</th>
        <th style="${TH}">DESCRIPTION</th>
        ${addOnsThHTML}
      </tr>
    </thead>
    <tbody>${addOnsRows}</tbody>
  </table>
</div>`;
  }

  return mainTable + addOnsTable;
}

// Helper to get brand logo as Base64 with absolute local resolution
let cachedLogoB64 = {};
async function getBrandLogoB64(logoFileName = "pdf_logo.png") {
  if (cachedLogoB64[logoFileName]) return cachedLogoB64[logoFileName];

  // Try multiple locations in order — server/assets first (works on Railway),
  // then client/src/assets (works in local monorepo dev)
  const candidates = [
    path.join(__dirname, "..", "assets", logoFileName),              // server/assets/ — primary (Railway)
    path.join(__dirname, "..", "..", "client", "src", "assets", logoFileName), // local dev monorepo
    path.join(__dirname, logoFileName),                               // same dir fallback
  ];
  let logoPath = candidates.find(p => fs.existsSync(p)) || null;

  if (!logoPath) {
    console.warn(`⚠️ [PDF] Logo not found: ${logoFileName}. Tried: ${candidates.join(', ')}`);
    return null;
  }

  try {
    const buf = fs.readFileSync(logoPath);
    const ext = path.extname(logoPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    cachedLogoB64[logoFileName] = `data:${mimeType};base64,` + buf.toString("base64");
    console.log(`✅ [PDF] Brand logo loaded from: ${logoPath}`);
    return cachedLogoB64[logoFileName];
  } catch (e) {
    console.error(`❌ [PDF] Error reading logo at ${logoPath}:`, e.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ALL RECS TABLE — all recommendations side by side + summary table
// ════════════════════════════════════════════════════════════════════════════
async function allRecsTableHTML(quotation) {
  const items = (quotation.lineItems || []).map(item => ({
    ...item,
    bodyColours: item.bodyColours || '[]',
    reflectorColours: item.reflectorColours || '[]',
    colourTemps: item.colourTemps || '[]',
    beamAngles: item.beamAngles || '[]',
    cri: item.cri || '[]',
    customFields: item.customFields || '{}',
    recommendations: (item.recommendations || []).map(r => ({
      ...r,
      amount: String(r.amount || 0),
      rate: String(r.rate || 0)
    }))
  }));
  const customCols = getCustomCols(quotation);
  const hasCustomCols = customCols.length > 0;
  const gstRate = quotation.gstRate || 18;
  const gstMultAdd = gstRate / 100;      // 0.18
  const gstMultTotal = 1 + gstMultAdd;   // 1.18

  const labels = ["A", "B", "C", "D", "E", "F"];
  const activeLabels = labels.filter(label =>
    items.some(item => (item.recommendations || []).some(r => r.label === label && r.brandName))
  );

  // Per-rec totals
  const recTotals = activeLabels.map(label => {
    let displaySum = 0;
    let residualGst = 0;
    items.forEach(item => {
      const r = (item.recommendations || []).find(r => r.label === label);
      if (r) {
        const amt = parseFloat(r.amount) || 0;
        const isInc = r.priceType === 'LP_INC';
        if (isInc) {
          displaySum += amt * gstMultTotal;
        } else {
          displaySum += amt;
          residualGst += amt * gstMultAdd;
        }
      }
    });
    return { label, sum: displaySum, gst: residualGst, total: displaySum + residualGst };
  });

  const polarB64s = await Promise.all(items.map(i => toBase64(i.polarDiagramUrl)));
  const productB64s = await Promise.all(items.map(i => toBase64(i.productImageUrl)));
  const banner = esc(quotation.projectName || "") + " \u2014 " + esc(quotation.city || "") + " \u2014 LIGHTING QUOTATION";

  // Brand names for header row
  const brandNames = activeLabels.map(label => {
    for (const item of items) {
      const r = (item.recommendations || []).find(r => r.label === label && r.brandName);
      if (r) return r.brandName;
    }
    return label;
  });

  let hCols = {};
  try {
    const cl = typeof quotation.customLabels === "string" ? JSON.parse(quotation.customLabels) : quotation.customLabels;
    if (cl && cl.__hiddenCols) hCols = cl.__hiddenCols;
  } catch (e) {
    console.error("allRecsTableHTML customLabels parse error:", e.message);
  }

  try {
    const sSno = !hCols['S.No'];
    const sCode = !hCols['Code'];
    const sDesc = !hCols['Description / Attributes'];
    const sPolar = !hCols['Polar Diagram'];
    const sUnit = !hCols['Unit'];
    const sQty = !hCols['Qty'];
    const sMac = !hCols['Macadam'];
    const sDisc = !hCols['Disc %'];
    const sSpace = !hCols['Space Match (%)'];
    const sRate = !hCols['Rate'];
    const sAmt = !hCols['Amount'];
    const sProdImg = !hCols['Product Image'];

    if (items.length > 0 && activeLabels.length === 0) {
      console.warn("allRecsTableHTML: items exist but no activeLabels found (recommendations might be missing)");
    }

    // ── thead — each rec: QTY | Macadam Step | Space Match % | Rate | Amount ──
    const recHeaders = [];
    if (sQty) recHeaders.push(`<th style="${TH}">QTY</th>`);
    if (sDisc) recHeaders.push(`<th style="${TH}">Disc %</th>`);
    if (sMac) recHeaders.push(`<th style="${TH}">Macadam<br>Step</th>`);
    if (sSpace) recHeaders.push(`<th style="${TH}">Space<br>Match (%)</th>`);
    if (sRate) recHeaders.push(`<th style="${TH}">RATE</th>`);
    if (sAmt) recHeaders.push(`<th style="${TH}">AMOUNT</th>`);
    const recColCount = recHeaders.length;

    const recTh1 = brandNames.map(b =>
      `<th colspan="${recColCount}" style="${TH_GREY}letter-spacing:0.5px;">${(b || "BRAND").toUpperCase()}</th>`
    ).join("");
    const recTh2 = activeLabels.map(() => recHeaders.join("")).join("");

    const specHeaders = [];
    if (sSno) specHeaders.push(`<th rowspan="2" style="${TH}">S.NO</th>`);
    if (sCode) specHeaders.push(`<th rowspan="2" style="${TH}">PRODUCT<br>CODE</th>`);
    if (sDesc) {
      specHeaders.push(`<th rowspan="2" style="${TH};width:160px;white-space:normal">DESCRIPTION</th>`);
    }
    if (sPolar) specHeaders.push(`<th rowspan="2" style="${TH}">POLAR</th>`);
    if (sProdImg) specHeaders.push(`<th rowspan="2" style="${TH}">PRODUCT<br>IMAGE</th>`);
    if (sUnit) specHeaders.push(`<th rowspan="2" style="${TH}">UNIT</th>`);

    const baseColCount = specHeaders.length;
    const theadHTML = `
<thead>
  <tr>
    <th colspan="${baseColCount + (activeLabels.length * recColCount)}" style="background:#002061;color:#fff;padding:8px 15px;text-align:center;font-size:10px;letter-spacing:2px;border:none;">
      ${banner.toUpperCase()}
    </th>
  </tr>
  <tr style="height:10px;"></tr>
  <tr>
    ${specHeaders.join("")}
    ${recTh1}
  </tr>
  <tr>
    ${recTh2}
  </tr>
</thead>`;

    // Data rows
    let rowsHTML = "";
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const bg = idx % 2 === 0 ? "#ffffff" : "#f7f9fc";
      const polar = polarB64s[idx]
        ? `<img src="${polarB64s[idx]}" style="width:44px;height:44px;object-fit:contain;display:block;margin:auto"/>`
        : "—";
      const prodImg = productB64s[idx]
        ? `<img src="${productB64s[idx]}" style="width:44px;height:44px;object-fit:contain;display:block;margin:auto"/>`
        : "—";
      const unit = item.finalUnit === "METERS" ? "Mtr." : "Nos.";
      const recCells = activeLabels.map(label => {
        const r = (item.recommendations || []).find(r => r.label === label);
        if (!r || !r.brandName) {
          let emptyHtml = "";
          if (sQty) emptyHtml += `<td style="${TD}text-align:center">—</td>`;
          emptyHtml += `<td style="${TD}text-align:center">—</td>`;
          if (sMac) emptyHtml += `<td style="${TD}text-align:center">—</td>`;
          emptyHtml += `<td style="${TD}text-align:center">—</td>`;
          if (sRate) emptyHtml += `<td style="${TD}text-align:right">—</td>`;
          if (sAmt) emptyHtml += `<td style="${TD}text-align:right">—</td>`;
          return emptyHtml;
        }
        const mac = macadamCell(r.macadamStep);
        const space = r.macadamStep ? (MACADAM_MAP[r.macadamStep] || "—") : "—";
        const isInc = r.priceType === 'LP_INC';
        const rawRate = parseFloat(r.rate) || 0;
        const rawAmt = parseFloat(r.amount) || 0;

        const rateVal = r.rate != null ? (isInc ? rawRate * gstMultTotal : rawRate) : null;
        const amtVal = r.amount != null ? (isInc ? rawAmt * gstMultTotal : rawAmt) : null;
        const rateTxt = rateVal != null ? fmt(rateVal) : "—";
        const amtTxt = amtVal != null ? fmt(amtVal) : "—";

        let cellHtml = "";
        if (sQty) cellHtml += `<td style="${TD}text-align:center;font-weight:700;color:#0D1E40">${r.quantity || 0}</td>`;
        if (sDisc) cellHtml += `<td style="${TD}text-align:center;font-weight:600;color:#0D1E40">${r.discountPercent != null ? r.discountPercent + '%' : '0%'}</td>`;
        if (sMac) cellHtml += `<td style="${TD}text-align:center">${mac}</td>`;
        if (sSpace) cellHtml += `<td style="${TD}text-align:center;font-size:7.5px;font-weight:600;color:#0D1E40">${space}</td>`;
        if (sRate) cellHtml += `<td style="${TD}text-align:right;font-variant-numeric:tabular-nums">${rateTxt}</td>`;
        if (sAmt) cellHtml += `<td style="${TD}text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${amtTxt}</td>`;
        return cellHtml;
      }).join("");

      let rowHtml = `<tr style="background:${bg}">`;
      if (sSno) rowHtml += `<td style="${TD}text-align:center;">${item.sno || idx + 1}</td>`;
      if (sCode) rowHtml += `<td style="${TD}text-align:center;font-weight:700;color:#0D1E40;font-size:7.5px;">${item.productCode || ""}</td>`;
      if (sDesc) {
        rowHtml += `<td style="${TD}font-size:7px;line-height:1.5;color:#333;min-width:120px">${esc((item.description || "").slice(0, 180))}</td>`;
      }
      if (sPolar) rowHtml += `<td style="${TD}text-align:center;padding:3px">${polar}</td>`;
      if (sProdImg) rowHtml += `<td style="${TD}text-align:center;padding:3px">${prodImg}</td>`;
      if (sUnit) rowHtml += `<td style="${TD}text-align:center;">${unit}</td>`;
      rowHtml += recCells;
      rowHtml += `</tr>`;
      rowsHTML += rowHtml;
    }

    // tfoot
    const totalDefs = [
      { label: "SUM", key: "sum", bg: "#f0f4f8", color: "#333" },
      { label: `GST ${gstRate}%`, key: "gst", bg: "#f0f4f8", color: "#333" },
      { label: "TOTAL", key: "total", bg: "#0b162c", color: "#F5A623" },
    ];
    let tfootHTML = "";
    for (const def of totalDefs) {
      const recAmtCells = activeLabels.map(label => {
        const t = recTotals.find(r => r.label === label);
        let cells = "";
        if (sQty) cells += `<td style="${TD}background:${def.bg};color:${def.color}"></td>`;
        if (sDisc) cells += `<td style="${TD}background:${def.bg};color:${def.color}"></td>`; // Discount % empty
        if (sMac) cells += `<td style="${TD}background:${def.bg};color:${def.color}"></td>`;
        if (sSpace) cells += `<td style="${TD}background:${def.bg};color:${def.color}"></td>`; // Space Match empty
        if (sRate) cells += `<td style="${TD}background:${def.bg};color:${def.color}"></td>`;
        if (sAmt) cells += `<td style="${TD}text-align:right;font-weight:700;background:${def.bg};color:${def.color};font-variant-numeric:tabular-nums">${fmt(t[def.key])}</td>`;
        return cells;
      }).join("");
      tfootHTML += `
<tr>
  <td colspan="${baseColCount || 1}" style="${TD}text-align:right;font-weight:700;background:${def.bg};color:${def.color};font-size:8.5px">${def.label}</td>
  ${recAmtCells}
</tr>`;
    }

    const mainTable = `
<div style="padding:8px 10px 0;font-family:Arial,sans-serif">
  <div style="background:#0b162c;color:#ffffff;text-align:center;font-weight:700;font-size:11px;
              padding:9px 14px;letter-spacing:1.5px;margin-bottom:0">
    ${banner}
  </div>
  <div style="overflow-x:auto">
    <table style="${TABLE_STYLE}">
      ${theadHTML}
      <tbody>
        ${rowsHTML}
      </tbody>
      <tfoot>${tfootHTML}</tfoot>
    </table>
  </div>
</div>`;

    // ── Recommendation Summary Table ──────────────────────────────────────────
    let summaryRows = "";
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const bg = idx % 2 === 0 ? "#ffffff" : "#f7f9fc";
      const unit = item.finalUnit === "METERS" ? "Mtr." : "Nos.";
      const qRecSummary = (item.recommendations || []).find(r => (r.quantity || 0) > 0);
      const qty = (qRecSummary && qRecSummary.quantity > 0) ? qRecSummary.quantity : (item.finalQuantity != null && item.finalQuantity > 0 ? item.finalQuantity : "—");

      const recSumCells = activeLabels.map(label => {
        const r = (item.recommendations || []).find(r => r.label === label);
        if (!r || !r.amount) return `<td style="${TD}text-align:right">—</td>`;

        const isInc = r.priceType === 'LP_INC';
        const amtVal = isInc ? Number(r.amount) * gstMultTotal : Number(r.amount);
        const amtTxt = fmt(amtVal);

        return `<td style="${TD}text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${amtTxt}</td>`;
      }).join("");

      summaryRows += `
<tr style="background:${bg}">
  <td style="${TD}text-align:center">${item.sno || idx + 1}</td>
  <td style="${TD}text-align:center;font-weight:700">${qty}</td>
  <td style="${TD}text-align:center">${unit}</td>
  <td style="${TD}text-align:center;font-weight:700;color:#0D1E40;font-size:7.5px">${item.productCode || "—"}</td>
  ${recSumCells}
</tr>`;
    }

    const summaryRecTh = activeLabels.map((label, i) =>
      `<th style="${TH}">AMOUNT (${label})</th>`
    ).join("");

    const summaryTotalRows = [
      { label: "SUM", key: "sum", bg: "#f0f4f8", color: "#333" },
      { label: `GST ${gstRate}%`, key: "gst", bg: "#f0f4f8", color: "#333" },
      { label: "TOTAL", key: "total", bg: "#002061", color: "#F5A623" },
    ].map(def => {
      const cells = activeLabels.map(label => {
        const t = recTotals.find(r => r.label === label);
        return `<td style="${TD}text-align:right;font-weight:700;background: ${def.bg};color:${def.color};font-variant-numeric:tabular-nums">${fmt(t[def.key])}</td>`;
      }).join("");
      return `<tr>
      <td colspan="4" style="${TD}text-align:right;font-weight:700;background:${def.bg};color:${def.color};font-size:8.5px">${def.label}</td>
      ${cells}
    </tr>`;
    }).join("");

    const summaryTable = `
<div style="padding:16px 10px 0;font-family:Arial,sans-serif">
  <table style="${TABLE_STYLE}">
    <thead>
      <tr>
        <th style="${TH}">S.No</th>
        <th style="${TH}">Quantity</th>
        <th style="${TH}">Unit</th>
        <th style="${TH}">Product<br>Code</th>
        ${summaryRecTh}
      </tr>
    </thead>
    <tbody>${summaryRows}</tbody>
    <tfoot>${summaryTotalRows}</tfoot>
  </table>
</div>`;

    // Add-ons (only if custom columns exist)
    let addOnsTable = "";
    if (hasCustomCols) {
      const addOnsThHTML = customCols.map(col =>
        `<th style="${TH_BRAND}white-space:nowrap">${(col.label || "").toUpperCase()}</th>`
      ).join("");
      let addOnsRows = "";
      items.forEach((item, i) => {
        const bg = i % 2 === 0 ? "#ffffff" : "#f7f9fc";
        const customTds = customCols.map(col =>
          `<td style="${TD}text-align:center">${getCustomField(item, col.id)}</td>`
        ).join("");
        addOnsRows += `
<tr style="background:${bg}">
  <td style="${TD}text-align:center;font-weight:700;color:#0D1E40">${item.sno || i + 1}</td>
  <td style="${TD}text-align:center;font-weight:700;color:#0D1E40;font-size:7.5px">${item.productCode || "—"}</td>
  <td style="${TD}font-size:7px;color:#333">${esc((item.description || "").slice(0, 100))}</td>
  ${customTds}
</tr>`;
      });
      addOnsTable = `
<div style="padding:16px 10px 0;font-family:Arial,sans-serif">
  <div style="background:#0b162c;color:#ffffff;text-align:center;font-weight:700;font-size:11px;
              padding:9px 14px;letter-spacing:1.5px;margin-bottom:0">ADD-ONS</div>
  <table style="${TABLE_STYLE}">
    <thead>
      <tr>
        <th style="${TH}">S.NO</th>
        <th style="${TH}">PRODUCT<br>CODE</th>
        <th style="${TH}">DESCRIPTION</th>
        ${addOnsThHTML}
      </tr>
    </thead>
    <tbody>${addOnsRows}</tbody>
  </table>
</div>`;
    }

    return mainTable + summaryTable + addOnsTable;
  } catch (err) {
    console.error("allRecsTableHTML ERROR:", err.message);
    throw err;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════════
async function generatePDF(quotation, settings, mode) {
  mode = mode || "final";

  const isLightsGallery = mode === "final_lights_gallery";
  const logoFileName = isLightsGallery ? "logo2.png" : "logo.png";
  const logoHeight = isLightsGallery ? 380 : 160;
  const logoB64 = await getBrandLogoB64(logoFileName);

  // ── Light Gallery: all details are permanently hardcoded, not editable ──
  const LIGHTS_GALLERY = {
    companyName: "Lights Gallery",
    phone: "8935081100",
    email: "lightsgallerydhruv@gmail.com",
    website: "https://lightsgallery.in/",
    // Pre-formatted HTML address (two offices) — bypasses comma-split logic
    addrHtml:
      "<b>H.O.:</b> 120/500-8A, Lajpat Nagar, Kanpur (UP) 208005<br>" +
      "<b>Branch:</b> 1, Station Road, Vidhan Sabha Marg, Hussainganj Crossing, Lucknow (UP) 226001",
    // Bank details — permanently hardcoded
    accountName: "Lights Gallery",
    bankName: "State Bank of India, Naveen Market Kanpur",
    accountNumber: "31993317042",
    ifscCode: "SBIN0005307",
    address: "120/500-8A, Lajpat Nagar, Kanpur (UP) 208005",
  };

  const effectiveSettings = isLightsGallery
    ? { ...settings, ...LIGHTS_GALLERY }
    : settings;

  const cover = coverHTML(quotation, effectiveSettings, logoB64, logoHeight);
  const terms = termsAndBankHTML(quotation, effectiveSettings);
  const tableHTML = mode === "all_recs"
    ? await allRecsTableHTML(quotation)
    : await finalTableHTML(quotation, logoB64);

  // All pages: Letter landscape (279 × 216 mm)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { margin:0; padding:0; width:100%; }
  body {
    font-family: Arial, 'Helvetica Neue', sans-serif;
    font-size: 8px;
    color: #222;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: #fff;
  }
  @page { size: Letter landscape; margin: 0; }
  img { display: block; }
  table { border-spacing: 0; }
</style>
</head>
<body>

<!-- ── COVER PAGE (Letter landscape) ── -->
<div style="width:11in;height:8.5in;overflow:hidden;position:relative;page-break-after:always;break-after:page">
  ${cover}
</div>

<!-- ── TABLE PAGES ── -->
<div style="page-break-before:always;break-before:page">
  ${tableHTML}
</div>

<!-- ── FINAL PAGE (TERMS & BANK) ── -->
<div style="page-break-before:always;break-before:page">
  ${terms}
</div>

</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1056, height: 816 });
    // Relaxed wait condition for better resilience to slow images
    await page.setContent(html, { waitUntil: "networkidle2", timeout: 90000 });
    await page.evaluateHandle("document.fonts.ready");

    return await page.pdf({
      format: "Letter",
      landscape: true,
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

  } finally {
    await browser.close();
  }
}

module.exports = { generatePDF };