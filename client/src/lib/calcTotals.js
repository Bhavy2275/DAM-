export function calcItemAmount(qty, rate) {
    return (qty || 0) * (rate || 0);
}

export function calcRecommendationTotals(recommendations, gstRate = 18) {
    const labels = ['RECOMMENDATION A', 'RECOMMENDATION B', 'RECOMMENDATION C', 'RECOMMENDATION D'];
    return labels.map(label => {
        const items = recommendations.filter(r => r.label === label);
        const sum = items.reduce((s, r) => s + (r.amount || 0), 0);
        const gst = sum * (gstRate / 100);
        return { label, sum, gst, total: sum + gst };
    });
}

export function calcQuoteGrandTotal(recommendations, gstRate = 18) {
    const recA = recommendations.filter(r => r.label === 'RECOMMENDATION A');
    const sum = recA.reduce((s, r) => s + (r.amount || 0), 0);
    const gst = sum * (gstRate / 100);
    return sum + gst;
}
