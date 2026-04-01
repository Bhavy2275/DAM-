const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
    if (!_transporter) {
        _transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    return _transporter;
}

async function sendQuotationEmail(clientEmail, clientName, quoteNumber, pdfBuffer) {
    const transporter = getTransporter();

    const mailOptions = {
        from: `"Dam Lighting Solution LLP" <${process.env.SMTP_USER}>`,
        to: clientEmail,
        subject: `Lighting Quotation ${quoteNumber} — Dam Lighting Solution LLP`,
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #0A1628;">Dam Lighting Solution LLP</h2>
        <p>Dear ${clientName},</p>
        <p>Please find attached your lighting quotation <strong>${quoteNumber}</strong>.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <br/>
        <p>Best regards,<br/>Dam Lighting Solution LLP<br/><em>design. allocate. maintain.</em></p>
      </div>
    `,
        attachments: [
            {
                filename: `${quoteNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    };

    return transporter.sendMail(mailOptions);
}

module.exports = { sendQuotationEmail };
