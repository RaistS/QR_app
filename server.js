import express from 'express';
import nodemailer from 'nodemailer';

const app = express();
app.use(express.json({ limit: '10mb' }));

app.post('/api/send-qr', async (req, res) => {
  const { email, qrData, subject, body } = req.body || {};
  if (!email || !qrData || !subject || !body) {
    return res.status(400).json({ ok: false, error: 'Missing fields' });
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      text: body,
      html: `<p>${body.replace(/\n/g, '<br/>')}</p>`,
      attachments: [
        {
          filename: 'qr.png',
          content: qrData.split(',')[1],
          encoding: 'base64',
        },
      ],
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Email error', err);
    res.status(500).json({ ok: false, error: 'Email failed' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
