const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const MACADAM_MAP = { "5A": "75%", "4A": "90%", "3A": "100%", "2A": "50%", "1A": "40%" };

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
    `<div style="font-size:6.5px;line-height:1.6;color:#333;text-align:center">${v.replace(/DEG/g, "°").replace(/_/g, " ")}</div>`
  ).join("");
}

function macadamCell(step) {
  if (!step) return "—";
  const pct = MACADAM_MAP[step] || "";
  return `<div style="font-size:7.5px;font-weight:700;color:#0D1E40;text-align:center">${step}</div>`
    + `<div style="font-size:6.5px;color:#555;text-align:center;margin-top:1px">(${pct})</div>`;
}

function toBase64(imageUrl) {
  if (!imageUrl) return Promise.resolve(null);
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return new Promise((resolve) => {
      const pdfUrl = imageUrl.includes("res.cloudinary.com")
        ? imageUrl.replace("/upload/", "/upload/w_150,q_auto,f_png/")
        : imageUrl;
      const client = pdfUrl.startsWith("https") ? https : http;
      client.get(pdfUrl, (res) => {
        const chunks = [];
        res.on("data", c => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          const mime = res.headers["content-type"] || "image/png";
          resolve("data:" + mime + ";base64," + buf.toString("base64"));
        });
        res.on("error", () => resolve(null));
      }).on("error", () => resolve(null));
    });
  }
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
  } catch (e) { console.error("toBase64 local:", e.message); }
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
  "border:0.5px solid #999",
  "padding:5px 4px",
  "text-align:center",
  "font-weight:700",
  "font-size:7px",
  "color:#0D1E40",
  "background:#f0f4f8",
  "vertical-align:middle",
  "line-height:1.3",
  "white-space:nowrap",
].join(";") + ";";

const TD = [
  "border:0.5px solid #ccc",
  "padding:4px 4px",
  "vertical-align:middle",
  "line-height:1.4",
  "font-size:7.5px",
].join(";") + ";";

const TH_BRAND = [
  "border:0.5px solid #999",
  "padding:5px 4px",
  "text-align:center",
  "font-weight:700",
  "font-size:7.5px",
  "color:#0D1E40",
  "background:#dbeafe",
  "vertical-align:middle",
  "line-height:1.3",
  "letter-spacing:0.5px",
].join(";") + ";";

const TH_GREY = [
  "border:0.5px solid #999",
  "padding:5px 4px",
  "text-align:center",
  "font-weight:700",
  "font-size:7px",
  "color:#111",
  "background:#d9d9d9",
  "vertical-align:middle",
  "line-height:1.3",
  "white-space:nowrap",
].join(";") + ";";

// ════════════════════════════════════════════════════════════════════════════
// COVER PAGE — A3 landscape, all pages landscape
// ════════════════════════════════════════════════════════════════════════════
function coverHTML(quotation, settings) {
  const client = quotation.client || {};
  const s = settings || {};

  const companyName = s.companyName || "Dam Lighting Solution LLP";
  const companyPhone = s.phone || "";
  const companyEmail = s.email || "";
  const companyWebsite = s.website || "";
  const companyAddress = s.address || "";

  const clientName = client.companyName || client.fullName || "";
  const clientPerson = (client.companyName && client.fullName) ? client.fullName : "";

  const cityParts = [];
  if (client.city) cityParts.push(client.city);
  if (client.state) cityParts.push(client.state);
  if (client.country) cityParts.push(client.country);
  const clientCityLine = cityParts.join(", ");
  const clientPinLine = client.pinCode ? "Pincode - " + client.pinCode : "";

  const addrLines = companyAddress
    ? companyAddress.split(",").map(s => s.trim()).filter(Boolean).join(",<br>")
    : "";

  return `
<div style="position:relative;width:100%;height:100%;background:#fff;font-family:Arial,'Helvetica Neue',sans-serif">

  <!-- TOP WHITE SECTION (45%) -->
  <div style="position:absolute;top:0;left:0;right:0;height:45%;padding:24px 24px 0 24px;box-sizing:border-box">
    <div style="border:1px solid #ccc;height:100%;box-sizing:border-box;display:flex">

      <!-- Left: Developed By -->
      <div style="flex:1;padding:24px 32px;border-right:1px solid #ddd">
        <p style="font-size:9px;font-weight:700;color:#0D1E40;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px 0">
          Developed &amp; Illuminated By
        </p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 10px 0">
          ${companyName}
        </p>
        <p style="font-size:11px;color:#444;line-height:1.9;margin:0 0 10px 0">
          ${companyPhone}<br>
          ${companyEmail}<br>
          ${companyWebsite}
        </p>
        <p style="font-size:11px;color:#444;line-height:1.7;margin:0">
          ${addrLines}
        </p>
      </div>

      <!-- Right: Developed For -->
      <div style="flex:1;padding:24px 32px">
        <p style="font-size:9px;font-weight:700;color:#0D1E40;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px 0">
          Developed &amp; Illuminated For
        </p>
        <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 10px 0">
          ${clientName}
        </p>
        ${clientPerson ? `<p style="font-size:11px;color:#444;margin:0 0 6px 0">${clientPerson}</p>` : ""}
        ${client.address ? `<p style="font-size:11px;color:#444;line-height:1.7;margin:0 0 6px 0">${client.address}</p>` : ""}
        ${clientCityLine ? `<p style="font-size:11px;color:#444;margin:0 0 4px 0">${clientCityLine}.</p>` : ""}
        ${clientPinLine ? `<p style="font-size:11px;color:#444;margin:0">${clientPinLine}</p>` : ""}
      </div>

    </div>
  </div>

  <!-- BOTTOM NAVY SECTION (55%) -->
  <div style="position:absolute;bottom:0;left:0;right:0;height:55%;background:#0D1E40;
              display:flex;align-items:flex-end;justify-content:space-between;
              padding:44px 60px;box-sizing:border-box">

    <!-- Light Quotation serif text -->
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:72px;font-weight:700;
                color:#ffffff;line-height:1.0;letter-spacing:-1px">
      Light<br>Quotation
    </div>

    <!-- DAM logo -->
    <div style="text-align:right">
      <div style="font-family:'Arial Black',Arial,sans-serif;font-size:68px;font-weight:900;
                  color:#ffffff;letter-spacing:-3px;line-height:1">DAM</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:2px;
                  margin-top:8px;font-family:Arial,sans-serif">
        design. allocate. maintain.
      </div>
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
    ["Account Name", s.accountName || ""],
    ["Bank Name", s.bankName || ""],
    ["Account Number", s.accountNumber || ""],
    ["IFSC Code", s.ifscCode || ""],
    ["Address", s.address || ""],
    ["GST", s.gstNumber || ""],
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

// ════════════════════════════════════════════════════════════════════════════
// FINAL TABLE — selected recommendation per item
// ════════════════════════════════════════════════════════════════════════════
async function finalTableHTML(quotation) {
  let items = quotation.lineItems || [];
  const customCols = getCustomCols(quotation);
  const hasCustomCols = customCols.length > 0;

  // Fallback to Rec A if no final amounts
  let subtotal = items.reduce((s, i) => s + (Number(i.finalAmount) || 0), 0);
  if (subtotal === 0) {
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
    subtotal = items.reduce((s, i) => s + (Number(i.finalAmount) || 0), 0);
  }

  const gstRate = quotation.gstRate || 18;
  const gstAmt = subtotal * (gstRate / 100);
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

  const banner = (quotation.projectName || "") + " \u2014 " + (quotation.city || "") + " \u2014 LIGHTING QUOTATION";
  const brandColCount = 9; // prod code, lp, lp+18%, disc%, rate, unit, qty, macadam, amount
  const specColCount = 11; // s.no, layout, code, desc, polar, img, body, refl, cct, beam, cri

  const theadHTML = `
<thead>
  <tr>
    <th rowspan="2" style="${TH}">S.NO</th>
    <th rowspan="2" style="${TH}">LAYOUT<br>CODE</th>
    <th rowspan="2" style="${TH}">PRODUCT<br>CODE</th>
    <th rowspan="2" style="${TH}width:140px">PRODUCT DESCRIPTION</th>
    <th rowspan="2" style="${TH}">POLAR<br>DIAGRAM</th>
    <th rowspan="2" style="${TH}">PRODUCT<br>IMAGE</th>
    <th rowspan="2" style="${TH}">BODY<br>COLOUR</th>
    <th rowspan="2" style="${TH}">REFLECTOR<br>COLOUR</th>
    <th rowspan="2" style="${TH}">COLOUR<br>TEMPERATURE</th>
    <th rowspan="2" style="${TH}">BEAM<br>ANGLE</th>
    <th rowspan="2" style="${TH}">CRI</th>
    <th colspan="${brandColCount}" style="${TH_BRAND}">BRAND</th>
  </tr>
  <tr>
    <th style="${TH}">PRODUCT<br>CODE</th>
    <th style="${TH}">LIST<br>PRICE</th>
    <th style="${TH}">LP<br>+18%</th>
    <th style="${TH}">DISC<br>%</th>
    <th style="${TH}">RATE</th>
    <th style="${TH}">UNIT</th>
    <th style="${TH}">QTY</th>
    <th style="${TH}">MACADAM<br>STEP</th>
    <th style="${TH}">AMOUNT</th>
  </tr>
</thead>`;

  let rowsHTML = "";
  let globalIdx = 0;

  for (const group of groups) {
    rowsHTML += `
<tr>
  <td colspan="${specColCount}" style="${TD}background:#d9d9d9"></td>
  <td colspan="${brandColCount}" style="${TD}background:#d9d9d9;color:#111;text-align:center;font-weight:700;font-size:8px;letter-spacing:0.8px">
    ${group.brand || "BRAND"}
  </td>
</tr>`;

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

      const lp = item.finalListPrice != null ? fmt(item.finalListPrice) : "—";
      const lp18 = item.finalListPrice != null ? fmt(Number(item.finalListPrice) * 1.18) : "—";
      const disc = item.finalDiscount != null ? item.finalDiscount + "%" : "—";
      const rate = item.finalRate != null ? fmt(item.finalRate) : "—";
      const unit = item.finalUnit === "METERS" ? "Mtr." : "Nos.";
      const qty = item.finalQuantity != null ? item.finalQuantity : "—";
      const mac = macadamCell(item.finalMacadamStep);
      const amt = item.finalAmount != null ? fmt(item.finalAmount) : "—";

      rowsHTML += `
<tr style="background:${bg}">
  <td style="${TD}text-align:center;background:#d9d9d9">${item.sno || globalIdx}</td>
  <td style="${TD}text-align:center;font-size:7px;background:#d9d9d9">${item.layoutCode || "—"}</td>
  <td style="${TD}text-align:center;font-weight:700;color:#0D1E40;font-size:7.5px;background:#d9d9d9">${item.productCode || ""}</td>
  <td style="${TD}font-size:7px;line-height:1.5;color:#333;min-width:130px">${(item.description || "").slice(0, 220)}</td>
  <td style="${TD}text-align:center;padding:3px">${polar}</td>
  <td style="${TD}text-align:center;padding:3px">${prodImg}</td>
  <td style="${TD}text-align:center">${tagLines(item.bodyColours)}</td>
  <td style="${TD}text-align:center">${tagLines(item.reflectorColours)}</td>
  <td style="${TD}text-align:center">${tagLines(item.colourTemps)}</td>
  <td style="${TD}text-align:center">${tagLines(item.beamAngles)}</td>
  <td style="${TD}text-align:center">${tagLines(item.cri)}</td>
  <td style="${TD}text-align:center;font-size:7px">${item.finalProductCode || "—"}</td>
  <td style="${TD}text-align:right;font-variant-numeric:tabular-nums">${lp}</td>
  <td style="${TD}text-align:right;font-variant-numeric:tabular-nums;color:#555">${lp18}</td>
  <td style="${TD}text-align:center">${disc}</td>
  <td style="${TD}text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${rate}</td>
  <td style="${TD}text-align:center">${unit}</td>
  <td style="${TD}text-align:center;font-weight:700">${qty}</td>
  <td style="${TD}text-align:center">${mac}</td>
  <td style="${TD}text-align:right;font-weight:700;color:#0D1E40;font-variant-numeric:tabular-nums">${amt}</td>
</tr>`;
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
    <td colspan="${footerSpan}" style="${TD}text-align:right;font-weight:700;background:#0D1E40;color:#fff;font-size:9.5px">GRAND TOTAL</td>
    <td style="${TD}text-align:right;font-weight:700;background:#0D1E40;color:#fff;font-size:9.5px;font-variant-numeric:tabular-nums">${fmt(grand)}</td>
  </tr>
</tfoot>`;

  const mainTable = `
<div style="padding:8px 10px 0;font-family:Arial,sans-serif">
  <div style="background:#a6a6a6;color:#111;text-align:center;font-weight:700;font-size:11px;
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
  <td style="${TD}font-size:7px;color:#333">${(item.description || "").slice(0, 100)}</td>
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

// ════════════════════════════════════════════════════════════════════════════
// ALL RECS TABLE — all recommendations side by side + summary table
// ════════════════════════════════════════════════════════════════════════════
async function allRecsTableHTML(quotation) {
  const items = quotation.lineItems || [];
  const customCols = getCustomCols(quotation);
  const hasCustomCols = customCols.length > 0;
  const gstRate = quotation.gstRate || 18;

  const labels = ["A", "B", "C", "D", "E", "F"];
  const activeLabels = labels.filter(label =>
    items.some(item => (item.recommendations || []).some(r => r.label === label && r.brandName))
  );

  // Per-rec totals
  const recTotals = activeLabels.map(label => {
    const sum = items.reduce((acc, item) => {
      const r = (item.recommendations || []).find(r => r.label === label);
      return acc + (r ? Number(r.amount) || 0 : 0);
    }, 0);
    const gst = sum * (gstRate / 100);
    return { label, sum, gst, total: sum + gst };
  });

  const polarB64s = await Promise.all(items.map(i => toBase64(i.polarDiagramUrl)));
  const banner = (quotation.projectName || "") + " \u2014 " + (quotation.city || "") + " \u2014 LIGHTING QUOTATION";

  // Brand names for header row
  const brandNames = activeLabels.map(label => {
    for (const item of items) {
      const r = (item.recommendations || []).find(r => r.label === label && r.brandName);
      if (r) return r.brandName;
    }
    return label;
  });

  // thead — each rec: Macadam Step | Rate | Amount | Space Match %
  const recTh1 = brandNames.map(b =>
    `<th colspan="4" style="${TH_GREY}letter-spacing:0.5px;">${b.toUpperCase()}</th>`
  ).join("");
  const recTh2 = activeLabels.map(() =>
    `<th style="${TH}">Macadam<br>Step</th>
     <th style="${TH}">RATE</th>
     <th style="${TH}">AMOUNT</th>
     <th style="${TH}">Space<br>Match (%)</th>`
  ).join("");

  const theadHTML = `
<thead>
  <tr>
    <th rowspan="2" style="${TH}">S.NO</th>
    <th rowspan="2" style="${TH}">PRODUCT<br>CODE</th>
    <th rowspan="2" style="${TH}">DESCRIPTION</th>
    <th rowspan="2" style="${TH}">POLAR</th>
    <th rowspan="2" style="${TH}">UNIT</th>
    <th rowspan="2" style="${TH}">QTY<br>(Approx)</th>
    ${recTh1}
  </tr>
  <tr>${recTh2}</tr>
</thead>`;

  const baseColCount = 6;
  const brandHeaderRow = ""; // brand names are now in thead

  // Data rows
  let rowsHTML = "";
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const bg = idx % 2 === 0 ? "#ffffff" : "#f7f9fc";
    const polar = polarB64s[idx]
      ? `<img src="${polarB64s[idx]}" style="width:44px;height:44px;object-fit:contain;display:block;margin:auto"/>`
      : "—";
    const unit = item.finalUnit === "METERS" ? "Mtr." : "Nos.";
    const qty = item.finalQuantity != null ? item.finalQuantity : "—";

    const recCells = activeLabels.map(label => {
      const r = (item.recommendations || []).find(r => r.label === label);
      if (!r || !r.brandName) {
        return `<td style="${TD}text-align:center">—</td>
                <td style="${TD}text-align:right">—</td>
                <td style="${TD}text-align:right">—</td>
                <td style="${TD}text-align:center">—</td>`;
      }
      const mac = macadamCell(r.macadamStep);
      const space = r.macadamStep ? (MACADAM_MAP[r.macadamStep] || "—") : "—";
      return `<td style="${TD}text-align:center">${mac}</td>
              <td style="${TD}text-align:right;font-variant-numeric:tabular-nums">${fmt(r.rate)}</td>
              <td style="${TD}text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${fmt(r.amount)}</td>
              <td style="${TD}text-align:center;font-size:7.5px;font-weight:600;color:#0D1E40">${space}</td>`;
    }).join("");

    rowsHTML += `
<tr style="background:${bg}">
  <td style="${TD}text-align:center;background:#d9d9d9">${item.sno || idx + 1}</td>
  <td style="${TD}text-align:center;font-weight:700;color:#0D1E40;font-size:7.5px;background:#d9d9d9">${item.productCode || ""}</td>
  <td style="${TD}font-size:7px;line-height:1.5;color:#333;min-width:120px">${(item.description || "").slice(0, 180)}</td>
  <td style="${TD}text-align:center;padding:3px">${polar}</td>
  <td style="${TD}text-align:center;background:#d9d9d9">${unit}</td>
  <td style="${TD}text-align:center;font-weight:700;background:#d9d9d9">${qty}</td>
  ${recCells}
</tr>`;
  }

  // tfoot
  const totalDefs = [
    { label: "SUM", key: "sum", bg: "#f0f4f8", color: "#333" },
    { label: "GST 18%", key: "gst", bg: "#f0f4f8", color: "#333" },
    { label: "TOTAL", key: "total", bg: "#0D1E40", color: "#ffffff" },
  ];
  let tfootHTML = "";
  for (const def of totalDefs) {
    const recAmtCells = activeLabels.map(label => {
      const t = recTotals.find(r => r.label === label);
      return `<td style="${TD}background:${def.bg};color:${def.color}"></td>
              <td style="${TD}background:${def.bg};color:${def.color}"></td>
              <td style="${TD}text-align:right;font-weight:700;background:${def.bg};color:${def.color};font-variant-numeric:tabular-nums">${fmt(t[def.key])}</td>
              <td style="${TD}background:${def.bg};color:${def.color}"></td>`;
    }).join("");
    tfootHTML += `
<tr>
  <td colspan="${baseColCount}" style="${TD}text-align:right;font-weight:700;background:${def.bg};color:${def.color};font-size:8.5px">${def.label}</td>
  ${recAmtCells}
</tr>`;
  }

  const mainTable = `
<div style="padding:8px 10px 0;font-family:Arial,sans-serif">
  <div style="background:#a6a6a6;color:#111;text-align:center;font-weight:700;font-size:11px;
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
    const qty = item.finalQuantity != null ? item.finalQuantity : "—";

    const recSumCells = activeLabels.map(label => {
      const r = (item.recommendations || []).find(r => r.label === label);
      const brand = r && r.brandName ? r.brandName : "—";
      const amt = r && r.amount ? fmt(r.amount) : "—";
      return `<td style="${TD}font-size:7px;text-align:center">${brand}</td>
              <td style="${TD}text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${amt}</td>`;
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

  const summaryRecTh = activeLabels.map((l, i) =>
    `<th colspan="2" style="${TH_BRAND}">RECOMMENDATION ${["A", "B", "C", "D", "E", "F"][i]}</th>`
  ).join("");
  const summaryRecSubTh = activeLabels.map(() =>
    `<th style="${TH}">BRAND</th><th style="${TH}">AMOUNT</th>`
  ).join("");

  const summaryTotalRows = [
    { label: "SUM", key: "sum", bg: "#f0f4f8", color: "#333" },
    { label: "GST 18%", key: "gst", bg: "#f0f4f8", color: "#333" },
    { label: "TOTAL", key: "total", bg: "#0D1E40", color: "#ffffff" },
  ].map(def => {
    const cells = activeLabels.map(label => {
      const t = recTotals.find(r => r.label === label);
      return `<td style="${TD}background:${def.bg};color:${def.color}"></td>
              <td style="${TD}text-align:right;font-weight:700;background:${def.bg};color:${def.color};font-variant-numeric:tabular-nums">${fmt(t[def.key])}</td>`;
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
      <tr>
        <th colspan="4" style="${TH}"></th>
        ${summaryRecSubTh}
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
  <td style="${TD}font-size:7px;color:#333">${(item.description || "").slice(0, 100)}</td>
  ${customTds}
</tr>`;
    });
    addOnsTable = `
<div style="padding:16px 10px 0;font-family:Arial,sans-serif">
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

  return mainTable + summaryTable + addOnsTable;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════════
async function generatePDF(quotation, settings, mode) {
  mode = mode || "final";

  const cover = coverHTML(quotation, settings);
  const terms = termsAndBankHTML(quotation, settings);
  const tableHTML = mode === "all_recs"
    ? await allRecsTableHTML(quotation)
    : await finalTableHTML(quotation);

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

<!-- ── TABLE PAGES (A3 landscape) ── -->
<div style="page-break-before:always;break-before:page">
  ${tableHTML}
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
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });
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