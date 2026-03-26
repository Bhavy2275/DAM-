const db = require('@prisma/client');
const p = new db.PrismaClient();

p.itemRecommendation.createMany({
  data: [{
    quotationItemId: '34f9fdf2-cb49-4d5a-8876-0ed20334195f',
    label: 'A',
    brandName: 'Test',
    listPrice: 100,
    listPriceWithGst: 118,
    discountPercent: 10,
    rate: 90,
    unit: 'NUMBERS',
    quantity: 1,
    amount: 90,
    productCode: '',
    macadamStep: ''
  }]
}).then(console.log).catch(console.error).finally(()=>p.$disconnect());
