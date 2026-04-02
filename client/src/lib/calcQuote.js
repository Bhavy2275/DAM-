// Quote calculation utilities

export const calcLPWithGst = (lp) => parseFloat((lp * 1.18).toFixed(2));

/**
 * NEW LOGIC: Calculate discount on Inclusive Price (Basic + 18% GST)
 * and then back-calculate the Net Rate for the table.
 * This ensures the final Grand Total matches [Inclusive Price - Discount %].
 */
export const calcRate = (lp, discountPct) => {
  const lpInc = parseFloat((lp * 1.18).toFixed(2));
  const rateInc = lpInc * (1 - (parseFloat(discountPct) || 0) / 100);
  const netRate = rateInc / 1.18;
  return parseFloat(netRate.toFixed(2));
};

export const calcAmount = (rate, qty) => parseFloat((rate * qty).toFixed(2));

export const MACADAM_SPACE = {
  '1A': 40,
  '2A': 50,
  '3A': 75,
  '4A': 90,
  '5A': 100,
};

export const MACADAM_OPTIONS = ['1A', '2A', '3A', '4A', '5A'];
export const REC_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const UNIT_OPTIONS = [
  { value: 'NUMBERS', label: 'Nos.' },
  { value: 'METERS', label: 'Mtr.' },
];

export function emptyRecommendation(label) {
  return {
    label,
    brandName: '',
    productCode: '',
    listPrice: '',
    listPriceWithGst: '',
    discountPercent: '',
    rate: '',
    unit: 'NUMBERS',
    quantity: '',
    amount: '',
    macadamStep: '',
  };
}

export function recalcRec(rec) {
  const lp = parseFloat(rec.listPrice) || 0;
  const disc = parseFloat(rec.discountPercent) || 0;
  const qty = parseFloat(rec.quantity) || 0;
  const lpGst = calcLPWithGst(lp);
  const rate = calcRate(lp, disc);
  const amount = calcAmount(rate, qty);
  return { ...rec, listPriceWithGst: lpGst || '', rate: rate || '', amount: amount || '' };
}
