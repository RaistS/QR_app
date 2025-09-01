import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Load .env file if present to populate process.env
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of envLines) {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
    if (match) {
      const key = match[1];
      if (!(key in process.env)) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
}

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

app.post('/api/send-qr', async (req, res) => {
  const { email, qrData, subject, body } = req.body || {};
  if (!email || !qrData || !subject || !body) {
    return res.status(400).json({ ok: false, error: 'Missing fields' });
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_TLS === 'true',
      auth: process.env.SMTP_USERNAME
        ? {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
    });

    const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USERNAME;
    const fromName = process.env.MAIL_FROM_NAME;

    await transporter.sendMail({
      from: fromName ? `${fromName} <${fromAddress}>` : fromAddress,
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
