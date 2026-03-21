const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const MACADAM_MAP = {
  "5A": "100%",
  "4A": "90%",
  "3A": "75%",
  "2A": "50%",
  "1A": "40%",
};

function fmt(amount) {
  if (amount == null || amount === "") return "—";
  const n = Number(amount);
  if (isNaN(n)) return "—";
  return (
    "Rs.\u00A0" +
    n.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })
  );
}

function parseArr(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const p = JSON.parse(val);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function tagCell(val) {
  const items = parseArr(val);
  if (!items.length) return "—";
  return items
    .map(
      (v) =>
        '<span style="display:inline-block;font-size:6.5px;background:#EDF2FF;border-radius:2px;padding:1px 4px;margin:1px;color:#0D1E40">' +
        v.replace(/DEG/g, "°").replace(/_/g, " ") +
        "</span>",
    )
    .join("");
}

function macadamCell(step) {
  if (!step) return "—";
  const pct = MACADAM_MAP[step] || "";
  return (
    '<div style="font-weight:700;font-size:8px">' +
    step +
    "</div>" +
    '<div style="font-size:6.5px;color:#666;margin-top:1px">' +
    pct +
    "</div>"
  );
}

const https = require("https");
const http = require("http");

function toBase64(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return new Promise((resolve) => {
      const pdfUrl = imageUrl.includes("res.cloudinary.com")
        ? imageUrl.replace("/upload/", "/upload/w_200,q_auto,f_auto/")
        : imageUrl;
      const client = pdfUrl.startsWith("https") ? https : http;
      client
        .get(pdfUrl, (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            const buffer = Buffer.concat(chunks);
            const mime = res.headers["content-type"] || "image/png";
            resolve("data:" + mime + ";base64," + buffer.toString("base64"));
          });
          res.on("error", () => resolve(null));
        })
        .on("error", () => resolve(null));
    });
  }
  try {
    const relative = imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl;
    const fullPath = path.join(__dirname, "..", relative);
    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      const ext = path.extname(fullPath).slice(1).toLowerCase();
      const mime =
        ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "svg"
            ? "image/svg+xml"
            : "image/" + ext;
      return "data:" + mime + ";base64," + buffer.toString("base64");
    }
  } catch (err) {
    console.error("toBase64 local error:", err.message);
  }
  return null;
}

const TABLE_STYLE =
  "width:100%;border-collapse:collapse;table-layout:fixed;font-size:8px;";
const TH =
  "border:0.5px solid #bbb;padding:5px 3px;text-align:center;font-weight:700;font-size:7px;color:#0D1E40;background:#f0f0f0;vertical-align:middle;line-height:1.2;";
const TD =
  "border:0.5px solid #ddd;padding:4px 3px;vertical-align:middle;line-height:1.3;font-size:7.5px;";

// ── COVER PAGE ─────────────────────────────────────────────────────────────
function coverHTML(quotation, settings) {
  const client = quotation.client || {};

  const companyName =
    settings && settings.companyName
      ? settings.companyName
      : "Dam Lighting Solution LLP";
  const companyPhone = settings && settings.phone ? settings.phone : "";
  const companyEmail = settings && settings.email ? settings.email : "";
  const companyWebsite = settings && settings.website ? settings.website : "";
  const companyAddress = settings && settings.address ? settings.address : "";

  const clientName = client.companyName || client.fullName || "";
  const clientPerson =
    client.companyName && client.fullName ? client.fullName : "";

  const cityParts = [];
  if (client.city) cityParts.push(client.city);
  if (client.state) cityParts.push(client.state);
  if (client.pinCode) cityParts.push("— " + client.pinCode);
  const clientCityPin = cityParts.join(", ");

  const clientPersonLine = clientPerson
    ? '<p style="font-size:13px;color:#555;margin:0 0 6px 0">' +
      clientPerson +
      "</p>"
    : "";
  const clientAddressLine = client.address
    ? '<p style="font-size:13px;color:#555;margin:0 0 4px 0">' +
      client.address +
      "</p>"
    : "";
  const companyAddrFormatted = companyAddress
    ? companyAddress
        .split(",")
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean)
        .join("<br>")
    : "";

  // Two-row full-page layout using an absolutely positioned structure
  return (
    "" +
    '<div style="position:relative;width:100%;height:100%;background:#fff">' +
    // ── TOP WHITE AREA (38% height) ──
    '<div style="position:absolute;top:0;left:0;right:0;height:38%;padding:32px 32px 0 32px;box-sizing:border-box">' +
    '<div style="border:1px solid #ccc;height:100%;padding:40px 48px;box-sizing:border-box;display:flex">' +
    // Left col
    '<div style="flex:1;padding-right:36px;border-right:1px solid #e0e0e0">' +
    '<p style="font-size:11px;font-weight:700;color:#0D1E40;letter-spacing:2px;text-transform:uppercase;margin:0 0 18px 0">Developed &amp; Illuminated By</p>' +
    '<p style="font-size:20px;font-weight:700;color:#111;margin:0 0 18px 0">' +
    companyName +
    "</p>" +
    '<p style="font-size:14px;color:#555;line-height:1.9;margin:0 0 18px 0">' +
    companyPhone +
    "<br>" +
    companyEmail +
    "<br>" +
    companyWebsite +
    "</p>" +
    '<p style="font-size:14px;color:#555;line-height:1.7;margin:0">' +
    companyAddrFormatted +
    "</p>" +
    "</div>" +
    // Right col
    '<div style="flex:1;padding-left:48px">' +
    '<p style="font-size:11px;font-weight:700;color:#0D1E40;letter-spacing:2px;text-transform:uppercase;margin:0 0 18px 0">Developed &amp; Illuminated For</p>' +
    '<p style="font-size:20px;font-weight:700;color:#111;margin:0 0 18px 0">' +
    clientName +
    "</p>" +
    clientPersonLine +
    clientAddressLine +
    '<p style="font-size:14px;color:#555;margin:0">' +
    clientCityPin +
    "</p>" +
    "</div>" +
    "</div>" + // inner border box
    "</div>" + // top area
    // ── BOTTOM NAVY AREA (remaining 62%) ──
    '<div style="position:absolute;bottom:0;left:0;right:0;height:62%;background:#0D1E40;display:flex;align-items:flex-end;justify-content:space-between;padding:56px 72px;box-sizing:border-box">' +
    '<div style="font-family:Georgia,serif;font-size:80px;font-weight:700;color:#fff;line-height:1.0;letter-spacing:-2px">Light<br>Quotation</div>' +
    '<div style="text-align:right">' +
    '<div style="font-family:Arial Black,Arial,sans-serif;font-size:76px;font-weight:900;color:#fff;letter-spacing:-4px;line-height:1">DAM</div>' +
    '<div style="font-size:16px;color:rgba(255,255,255,0.7);letter-spacing:2px;margin-top:10px">design. allocate. maintain.</div>' +
    "</div>" +
    "</div>" + // navy area
    "</div>"
  ); // root
}

// ── TERMS + BANK ───────────────────────────────────────────────────────────
function termsAndBankHTML(quotation, settings) {
  const s = settings || {};
  const rawTerms = quotation.notes || s.defaultTerms || "";
  const terms = rawTerms
    .split("\n")
    .map(function (t) {
      return t.trim();
    })
    .filter(Boolean);
  const termsList = terms.length
    ? '<ol style="padding-left:14px;line-height:1.8;color:#333;font-size:8px;margin:0">' +
      terms
        .map(function (t) {
          return (
            '<li style="margin-bottom:3px">' +
            t.replace(/^\d+\.\s*/, "") +
            "</li>"
          );
        })
        .join("") +
      "</ol>"
    : '<p style="font-size:8px;color:#999">No terms specified.</p>';

  const bankFields = [
    ["Account Name", s.accountName || ""],
    ["Bank Name", s.bankName || ""],
    ["Account Number", s.accountNumber || ""],
    ["IFSC Code", s.ifscCode || ""],
    ["GST No.", s.gstNumber || ""],
    ["Contact", s.phone || ""],
  ];
  const bankRows = bankFields
    .map(function (row) {
      return (
        "<tr>" +
        '<td style="padding:3px 7px;border:0.5px solid #ddd;font-weight:600;color:#0D1E40;background:#f5f5f5;white-space:nowrap;width:115px;font-size:8px">' +
        row[0] +
        "</td>" +
        '<td style="padding:3px 7px;border:0.5px solid #ddd;font-size:8px">' +
        row[1] +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  return (
    '<div style="display:flex;gap:36px;margin:18px 12px 10px;font-family:Arial,sans-serif">' +
    '<div style="flex:1.3"><div style="font-weight:700;font-size:9px;color:#0D1E40;border-bottom:1.5px solid #0D1E40;padding-bottom:3px;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Terms &amp; Conditions</div>' +
    termsList +
    "</div>" +
    '<div style="flex:0.9"><div style="font-weight:700;font-size:9px;color:#0D1E40;border-bottom:1.5px solid #0D1E40;padding-bottom:3px;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Bank Details</div><table style="width:100%;border-collapse:collapse">' +
    bankRows +
    "</table></div>" +
    "</div>"
  );
}

// ── FINAL TABLE ────────────────────────────────────────────────────────────
async function finalTableHTML(quotation) {
  var items = quotation.lineItems || [];
  var subtotal = items.reduce(function (s, i) {
    return s + (Number(i.finalAmount) || 0);
  }, 0);

  if (subtotal === 0) {
    items = items.map(function (item) {
      var recA = (item.recommendations || []).find(function (r) {
        return r.label === "A";
      });
      if (recA)
        return Object.assign({}, item, {
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
    subtotal = items.reduce(function (s, i) {
      return s + (Number(i.finalAmount) || 0);
    }, 0);
  }

  var gstAmt = subtotal * ((quotation.gstRate || 18) / 100);
  var grand = subtotal + gstAmt;

  var polarB64s = await Promise.all(
    items.map(function (i) {
      return Promise.resolve(toBase64(i.polarDiagramUrl));
    }),
  );
  var productB64s = await Promise.all(
    items.map(function (i) {
      return Promise.resolve(toBase64(i.productImageUrl));
    }),
  );

  var groups = [];
  var current = null;
  for (var gi = 0; gi < items.length; gi++) {
    var brand = items[gi].finalBrandName || "";
    if (!current || current.brand !== brand) {
      current = { brand: brand, items: [] };
      groups.push(current);
    }
    current.items.push(items[gi]);
  }

  var globalIdx = 0;
  var rowsHTML = "";
  for (var g = 0; g < groups.length; g++) {
    var group = groups[g];
    rowsHTML +=
      '<tr><td colspan="11" style="' +
      TD +
      ' background:#f7f8fa"></td><td colspan="8" style="' +
      TD +
      ' background:#E8F0FE;color:#0D1E40;text-align:center;font-weight:700;font-size:8px;letter-spacing:0.5px">' +
      (group.brand || "BRAND") +
      "</td></tr>";
    for (var ii = 0; ii < group.items.length; ii++) {
      var item = group.items[ii];
      var itemIdx = items.indexOf(item);
      var rowBg = globalIdx % 2 === 0 ? "#fff" : "#f7f8fa";
      globalIdx++;
      var polarB64 = polarB64s[itemIdx];
      var productB64 = productB64s[itemIdx];
      var polarCell = polarB64
        ? '<img src="' +
          polarB64 +
          '" style="width:44px;height:44px;object-fit:contain;display:block;margin:auto"/>'
        : "—";
      var prodImgCell = productB64
        ? '<img src="' +
          productB64 +
          '" style="width:40px;height:40px;object-fit:contain;display:block;margin:auto"/>'
        : "—";
      rowsHTML +=
        '<tr style="background:' +
        rowBg +
        '">' +
        '<td style="' +
        TD +
        ' text-align:center">' +
        (item.sno || globalIdx) +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center;font-size:7px">' +
        (item.layoutCode || "—") +
        "</td>" +
        '<td style="' +
        TD +
        ' font-weight:700;color:#0D1E40;text-align:center;font-size:7px">' +
        (item.productCode || "") +
        "</td>" +
        '<td style="' +
        TD +
        ' font-size:7px;line-height:1.4;color:#333">' +
        (item.description || "").slice(0, 220) +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center;padding:3px">' +
        polarCell +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center;padding:3px">' +
        prodImgCell +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center">' +
        tagCell(item.bodyColours) +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center">' +
        tagCell(item.reflectorColours) +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center">' +
        tagCell(item.colourTemps) +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center">' +
        tagCell(item.beamAngles) +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center">' +
        tagCell(item.cri) +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center;font-size:7px">' +
        (item.finalProductCode || "—") +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:right;font-variant-numeric:tabular-nums">' +
        (item.finalListPrice != null ? fmt(item.finalListPrice) : "—") +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center">' +
        (item.finalDiscount != null ? item.finalDiscount + "%" : "—") +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:right;font-weight:600;font-variant-numeric:tabular-nums">' +
        (item.finalRate != null ? fmt(item.finalRate) : "—") +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center;font-size:7px">' +
        (item.finalUnit === "METERS" ? "Mtr." : "Nos.") +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center;font-weight:700">' +
        (item.finalQuantity != null ? item.finalQuantity : "—") +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:right;font-weight:700;color:#0D1E40;font-variant-numeric:tabular-nums">' +
        (item.finalAmount != null ? fmt(item.finalAmount) : "—") +
        "</td>" +
        '<td style="' +
        TD +
        ' text-align:center">' +
        macadamCell(item.finalMacadamStep) +
        "</td>" +
        "</tr>";
    }
  }

  var gstRate = quotation.gstRate || 18;
  var banner =
    (quotation.projectName || "") +
    " \u2014 " +
    (quotation.city || "") +
    " \u2014 LIGHTING QUOTATION";

  return (
    '<div style="padding:8px 10px;font-family:Arial,sans-serif;font-size:8px">' +
    '<div style="background:#0D1E40;color:#fff;text-align:center;font-weight:700;font-size:10.5px;padding:8px 12px;letter-spacing:1px">' +
    banner +
    "</div>" +
    '<table style="' +
    TABLE_STYLE +
    '"><colgroup>' +
    '<col style="width:26px"><col style="width:50px"><col style="width:50px"><col style="width:130px">' +
    '<col style="width:52px"><col style="width:52px"><col style="width:52px"><col style="width:60px">' +
    '<col style="width:56px"><col style="width:50px"><col style="width:32px"><col style="width:52px">' +
    '<col style="width:62px"><col style="width:46px"><col style="width:60px"><col style="width:44px">' +
    '<col style="width:38px"><col style="width:66px"><col style="width:50px">' +
    "</colgroup><thead><tr>" +
    '<th style="' +
    TH +
    '">S.NO</th><th style="' +
    TH +
    '">LAYOUT<br>CODE</th><th style="' +
    TH +
    '">PRODUCT<br>CODE</th>' +
    '<th style="' +
    TH +
    '">PRODUCT DESCRIPTION</th><th style="' +
    TH +
    '">POLAR<br>DIAGRAM</th>' +
    '<th style="' +
    TH +
    '">PRODUCT<br>IMAGE</th><th style="' +
    TH +
    '">BODY<br>COLOUR</th>' +
    '<th style="' +
    TH +
    '">REFLECTOR<br>COLOUR</th><th style="' +
    TH +
    '">COLOUR<br>TEMP.</th>' +
    '<th style="' +
    TH +
    '">BEAM<br>ANGLE</th><th style="' +
    TH +
    '">CRI</th>' +
    '<th style="' +
    TH +
    '">PRODUCT<br>CODE</th><th style="' +
    TH +
    '">LIST<br>PRICE</th>' +
    '<th style="' +
    TH +
    '">DISC.<br>%</th><th style="' +
    TH +
    '">RATE</th>' +
    '<th style="' +
    TH +
    '">UNIT</th><th style="' +
    TH +
    '">QTY</th>' +
    '<th style="' +
    TH +
    '">AMOUNT</th><th style="' +
    TH +
    '">MACADAM</th>' +
    "</tr></thead><tbody>" +
    rowsHTML +
    "</tbody><tfoot>" +
    '<tr><td colspan="17" style="' +
    TD +
    ' text-align:right;font-weight:700;background:#f0f0f4;font-size:8px">Sub-Total</td><td style="' +
    TD +
    ' text-align:right;font-weight:700;background:#f0f0f4;font-variant-numeric:tabular-nums">' +
    fmt(subtotal) +
    '</td><td style="' +
    TD +
    ' background:#f0f0f4"></td></tr>' +
    '<tr><td colspan="17" style="' +
    TD +
    ' text-align:right;background:#f0f0f4;font-size:8px">GST (' +
    gstRate +
    '%)</td><td style="' +
    TD +
    ' text-align:right;background:#f0f0f4;font-variant-numeric:tabular-nums">' +
    fmt(gstAmt) +
    '</td><td style="' +
    TD +
    ' background:#f0f0f4"></td></tr>' +
    '<tr><td colspan="17" style="' +
    TD +
    ' text-align:right;font-weight:700;background:#0D1E40;color:#fff;font-size:9px">GRAND TOTAL</td><td style="' +
    TD +
    ' text-align:right;font-weight:700;background:#0D1E40;color:#fff;font-size:9px;font-variant-numeric:tabular-nums">' +
    fmt(grand) +
    '</td><td style="' +
    TD +
    ' background:#0D1E40"></td></tr>' +
    "</tfoot></table></div>"
  );
}

// ── ALL RECS TABLE ─────────────────────────────────────────────────────────
async function allRecsTableHTML(quotation) {
  var items = quotation.lineItems || [];
  var labels = ["A", "B", "C", "D", "E", "F"];
  var activeLabels = labels.filter(function (label) {
    return items.some(function (item) {
      return (item.recommendations || []).some(function (r) {
        return r.label === label && r.brandName;
      });
    });
  });
  var recTotals = activeLabels.map(function (label) {
    var sum = items.reduce(function (acc, item) {
      var r = (item.recommendations || []).find(function (r) {
        return r.label === label;
      });
      return acc + (r ? Number(r.amount) || 0 : 0);
    }, 0);
    var gst = sum * ((quotation.gstRate || 18) / 100);
    return { label: label, sum: sum, gst: gst, total: sum + gst };
  });
  var recHeaders = activeLabels
    .map(function (l) {
      return (
        '<th colspan="3" style="' +
        TH +
        ' background:#E8F0FE;color:#0D1E40">REC ' +
        l +
        "</th>"
      );
    })
    .join("");
  var recSubHeaders = activeLabels
    .map(function () {
      return (
        '<th style="' +
        TH +
        '">MACADAM</th><th style="' +
        TH +
        '">RATE</th><th style="' +
        TH +
        '">AMOUNT</th>'
      );
    })
    .join("");
  var polarB64s = await Promise.all(
    items.map(function (i) {
      return Promise.resolve(toBase64(i.polarDiagramUrl));
    }),
  );
  var rowsHTML = "";
  for (var idx = 0; idx < items.length; idx++) {
    var item = items[idx];
    var polarB64 = polarB64s[idx];
    var polarCell = polarB64
      ? '<img src="' +
        polarB64 +
        '" style="width:42px;height:42px;object-fit:contain;display:block;margin:auto"/>'
      : "—";
    var recCells = "";
    for (var li = 0; li < activeLabels.length; li++) {
      var label = activeLabels[li];
      var r = (item.recommendations || []).find(function (rec) {
        return rec.label === label;
      });
      if (!r || !r.brandName) {
        recCells +=
          '<td style="' +
          TD +
          ' text-align:center">—</td><td style="' +
          TD +
          '">—</td><td style="' +
          TD +
          '">—</td>';
      } else {
        recCells +=
          '<td style="' +
          TD +
          ' text-align:center">' +
          macadamCell(r.macadamStep) +
          '</td><td style="' +
          TD +
          ' text-align:right;font-variant-numeric:tabular-nums">' +
          fmt(r.rate) +
          '</td><td style="' +
          TD +
          ' text-align:right;font-weight:700;font-variant-numeric:tabular-nums">' +
          fmt(r.amount) +
          "</td>";
      }
    }
    var rowBg = idx % 2 === 0 ? "#fff" : "#f7f8fa";
    rowsHTML +=
      '<tr style="background:' +
      rowBg +
      '"><td style="' +
      TD +
      ' text-align:center">' +
      (item.sno || idx + 1) +
      '</td><td style="' +
      TD +
      ' font-weight:700;color:#0D1E40;font-size:7px">' +
      (item.productCode || "") +
      '</td><td style="' +
      TD +
      ' font-size:7px;line-height:1.4;color:#333">' +
      (item.description || "").slice(0, 150) +
      '</td><td style="' +
      TD +
      ' text-align:center;padding:3px">' +
      polarCell +
      '</td><td style="' +
      TD +
      ' text-align:center;font-size:7px">' +
      (item.finalUnit === "METERS" ? "Mtr." : "Nos.") +
      '</td><td style="' +
      TD +
      ' text-align:center;font-weight:700">' +
      (item.finalQuantity != null ? item.finalQuantity : "—") +
      "</td>" +
      recCells +
      "</tr>";
  }
  var gstRate = quotation.gstRate || 18;
  var banner =
    (quotation.projectName || "") +
    " \u2014 " +
    (quotation.city || "") +
    " \u2014 ALL RECOMMENDATIONS";
  var totalRowsHTML = "";
  var totalDefs = [
    { label: "SUB-TOTAL", key: "sum", bg: "#f0f0f4", color: "#333" },
    { label: "GST " + gstRate + "%", key: "gst", bg: "#f0f0f4", color: "#333" },
    { label: "GRAND TOTAL", key: "total", bg: "#0D1E40", color: "#fff" },
  ];
  for (var ti = 0; ti < totalDefs.length; ti++) {
    var def = totalDefs[ti];
    totalRowsHTML +=
      '<tr><td colspan="6" style="' +
      TD +
      " text-align:right;font-weight:700;background:" +
      def.bg +
      ";color:" +
      def.color +
      ';font-size:8.5px">' +
      def.label +
      "</td>";
    for (var ri = 0; ri < recTotals.length; ri++) {
      var t = recTotals[ri];
      totalRowsHTML +=
        '<td style="' +
        TD +
        " background:" +
        def.bg +
        ";color:" +
        def.color +
        '"></td><td style="' +
        TD +
        " background:" +
        def.bg +
        ";color:" +
        def.color +
        '"></td><td style="' +
        TD +
        " text-align:right;font-weight:700;background:" +
        def.bg +
        ";color:" +
        def.color +
        ';font-variant-numeric:tabular-nums">' +
        fmt(t[def.key]) +
        "</td>";
    }
    totalRowsHTML += "</tr>";
  }
  return (
    '<div style="padding:8px 10px;font-family:Arial,sans-serif;font-size:8px"><div style="background:#0D1E40;color:#fff;text-align:center;font-weight:700;font-size:10.5px;padding:8px 12px;letter-spacing:1px">' +
    banner +
    '</div><table style="' +
    TABLE_STYLE +
    '"><thead><tr><th rowspan="2" style="' +
    TH +
    '">S.NO</th><th rowspan="2" style="' +
    TH +
    '">CODE</th><th rowspan="2" style="' +
    TH +
    '">DESCRIPTION</th><th rowspan="2" style="' +
    TH +
    '">POLAR</th><th rowspan="2" style="' +
    TH +
    '">UNIT</th><th rowspan="2" style="' +
    TH +
    '">QTY</th>' +
    recHeaders +
    "</tr><tr>" +
    recSubHeaders +
    "</tr></thead><tbody>" +
    rowsHTML +
    "</tbody><tfoot>" +
    totalRowsHTML +
    "</tfoot></table></div>"
  );
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────
async function generatePDF(quotation, settings, mode) {
  mode = mode || "final";
  var cover = coverHTML(quotation, settings);
  var terms = termsAndBankHTML(quotation, settings);
  var tableHTML =
    mode === "all_recs"
      ? await allRecsTableHTML(quotation)
      : await finalTableHTML(quotation);

  var html =
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
    "<style>" +
    "* { margin:0; padding:0; box-sizing:border-box; }" +
    "html,body { margin:0; padding:0; width:100%; }" +
    "body { font-family:Arial,sans-serif; font-size:8.5px; color:#222; -webkit-print-color-adjust:exact; print-color-adjust:exact; background:#fff; }" +
    "@page { margin:0; size:A3 landscape; }" +
    "@page :first { size:A4 portrait; }" +
    "</style></head><body>" +
    // Cover — full A4 portrait page
    '<div style="width:100vw;height:100vh;page-break-after:always;break-after:page;overflow:hidden;position:relative">' +
    cover +
    "</div>" +
    // Table — A3 landscape
    '<div style="page-break-before:always;break-before:page">' +
    tableHTML +
    terms +
    "</div>" +
    "</body></html>";

  var browser = await puppeteer.launch({
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
    var page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");

    // Generate cover as A4 portrait
    var coverPdf = await page.pdf({
      format: "A4",
      landscape: false,
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      pageRanges: "1",
    });

    // Generate table as A3 landscape
    await page.setViewport({ width: 1587, height: 1123 });
    var tablePdf = await page.pdf({
      format: "A3",
      landscape: true,
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      pageRanges: "2-",
    });

    // Merge PDFs using pdf-lib if available, otherwise return table pdf with cover embedded
    try {
      const { PDFDocument } = require("pdf-lib");
      const coverDoc = await PDFDocument.load(coverPdf);
      const tableDoc = await PDFDocument.load(tablePdf);
      const mergedDoc = await PDFDocument.create();

      const coverPages = await mergedDoc.copyPages(
        coverDoc,
        coverDoc.getPageIndices(),
      );
      coverPages.forEach((p) => mergedDoc.addPage(p));

      const tablePages = await mergedDoc.copyPages(
        tableDoc,
        tableDoc.getPageIndices(),
      );
      tablePages.forEach((p) => mergedDoc.addPage(p));

      const mergedBytes = await mergedDoc.save();
      return Buffer.from(mergedBytes);
    } catch (pdfLibErr) {
      // pdf-lib not available — generate as single A3 landscape PDF
      console.log("pdf-lib not available, generating single format PDF");
      await page.setViewport({ width: 1587, height: 1123 });
      const singlePdf = await page.pdf({
        format: "A3",
        landscape: true,
        printBackground: true,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });
      return singlePdf;
    }
  } finally {
    await browser.close();
  }
}

module.exports = { generatePDF };
