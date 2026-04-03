const { generatePDF } = require('./utils/pdfGenerator');
const fs = require('fs');
const path = require('path');

const mockQuotation = {
  quoteNumber: 'Q-TEST-001',
  projectName: 'Test Project',
  city: 'Test City',
  state: 'Test State',
  gstRate: 18,
  notes: 'Test Notes',
  customLabels: JSON.stringify({ __hiddenCols: {} }),
  client: { companyName: 'Test Client', fullName: 'John Doe' },
  lineItems: [
    {
      sno: 1,
      productCode: 'PROD-001',
      description: 'Test Product Description',
      unit: 'NUMBERS',
      finalQuantity: 10,
      finalAmount: 1000,
      recommendations: [
        {
          label: 'A',
          brandName: 'Brand A',
          productCode: 'REC-A-001',
          quantity: 10,
          amount: 1000,
          rate: 100,
          macadamStep: '3A'
        }
      ]
    }
  ]
};

const mockSettings = {
  companyName: 'Test Company',
  address: 'Test Address',
  phone: '1234567890',
  email: 'test@example.com',
  website: 'www.example.com'
};

async function runTest() {
  try {
    console.log('Starting PDF generation test (all_recs)...');
    const pdfBuffer = await generatePDF(mockQuotation, mockSettings, 'all_recs');
    fs.writeFileSync(path.join(__dirname, 'test-all-recs.pdf'), pdfBuffer);
    console.log('✅ PDF generated successfully: test-all-recs.pdf');
  } catch (err) {
    console.error('❌ PDF generation failed:');
    console.error(err);
    process.exit(1);
  }
}

runTest();
