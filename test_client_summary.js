const client = {
    quotations: [
        { status: 'DRAFT', grandTotal: 1062 },
        { status: 'ACCEPTED', grandTotal: 256009 },
        { status: 'REJECTED', grandTotal: 50000 }
    ]
};

const totalQuoted = (client.quotations || [])
    .filter(q => q.status !== 'REJECTED')
    .reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0);

console.log('Total Quoted:', totalQuoted);
console.log('Expected:', 1062 + 256009); // 257071
