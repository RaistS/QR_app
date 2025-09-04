const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const https = require('https');
const fs = require('fs');
const path = require('path');

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

function createTransporterFromEnv() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
    return null;
  }
  const port = Number(process.env.SMTP_PORT);
  // Use implicit TLS only for SMTPS (465). For 587, use STARTTLS (secure: false + requireTLS).
  const useSecure = port === 465;
  const wantStartTLS = process.env.SMTP_TLS === 'true';

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: useSecure,
    requireTLS: wantStartTLS && !useSecure,
    tls: wantStartTLS ? { minVersion: 'TLSv1.2' } : undefined,
    auth: process.env.SMTP_USERNAME
      ? {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
  });
}

const transporter = createTransporterFromEnv();
if (!transporter) {
  console.warn('SMTP configuration missing; email sending disabled');
} else {
  // Only proactively verify when using basic auth (password present)
  const hasBasicAuth = Boolean(process.env.SMTP_PASSWORD);
  if (hasBasicAuth) {
    transporter
      .verify()
      .then(() => console.log('SMTP transporter (basic) verified and ready'))
      .catch((err) => console.warn('SMTP verify (basic) failed:', err?.message || err));
  }
}

// --- Optional OAuth2 (Azure) support for SMTP AUTH ---
function isAzureOAuthEnabled() {
  return (
    !!process.env.AZURE_TENANT_ID &&
    !!process.env.AZURE_CLIENT_ID &&
    !!process.env.AZURE_CLIENT_SECRET &&
    !!(process.env.MAIL_FROM || process.env.SMTP_USERNAME)
  );
}

async function getAzureAccessToken() {
  const tenant = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  // Scope for SMTP/Exchange Online
  const scope = 'https://outlook.office365.com/.default';

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  }).toString();

  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    // Avoid legacy TLS; Node defaults should be fine
    dispatcher: new https.Agent({ keepAlive: true }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Azure token error: ${res.status} ${text}`);
  }
  const json = await res.json();
  if (!json.access_token) throw new Error('Azure token missing access_token');
  return { token: json.access_token, expiresIn: json.expires_in };
}

function buildBaseSmtpOptions() {
  const port = Number(process.env.SMTP_PORT);
  const useSecure = port === 465;
  const wantStartTLS = process.env.SMTP_TLS === 'true';
  return {
    host: process.env.SMTP_HOST,
    port,
    secure: useSecure,
    requireTLS: wantStartTLS && !useSecure,
    tls: wantStartTLS ? { minVersion: 'TLSv1.2' } : undefined,
  };
}

async function createAzureOAuthTransporter() {
  const { token } = await getAzureAccessToken();
  const userEmail = process.env.MAIL_FROM || process.env.SMTP_USERNAME;
  return nodemailer.createTransport({
    ...buildBaseSmtpOptions(),
    auth: {
      type: 'OAuth2',
      user: userEmail,
      accessToken: token,
    },
  });
}

app.post('/api/send-qr', async (req, res) => {
  const { email, qrData, subject, body } = req.body || {};
  if (!email || !qrData || !subject || !body) {
    return res.status(400).json({ ok: false, error: 'Missing fields' });
  }
  try {
    let tx = null;
    const preferOAuth = isAzureOAuthEnabled();
    if (preferOAuth) {
      tx = await createAzureOAuthTransporter();
    } else {
      tx = transporter;
    }
    if (!tx) throw new Error('SMTP not configured');

    const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USERNAME;
    const fromName = process.env.MAIL_FROM_NAME;

    await tx.sendMail({
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
