export function formatINR(amount) {
    if (!amount && amount !== 0) return '₹0';
    return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatINRDecimal(amount) {
    if (!amount && amount !== 0) return '₹0.00';
    return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
