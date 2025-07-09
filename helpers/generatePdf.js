const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Convert font file to base64
const fontPath = path.join(__dirname, '../fonts/NotoSansDevanagari-Regular.ttf');
const fontBase64 = fs.readFileSync(fontPath, 'base64');

async function generatePdf(events, today = true) {
  const todayDate = new Date().toLocaleDateString('hi-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA - dateB;
  });

  const eventRows = sortedEvents.map(e => `
    <tr>
      ${today
      ? `<td style="text-align:center;">${e.time || ''}</td>`
      : `<td style="text-align:center;">${new Date(e.date).toLocaleDateString('hi-IN')} ${e.time || ''}</td>`}
      <td style="text-align:center;">${e.title}</td>
      <td>${e.description}</td>
      <td>${e.organizer}</td>
      <td style="text-align:center;">${e.contactPhone || 'उपलब्ध नहीं'}</td>
      <td>${e.address}</td>
      <td style="text-align:center;">${e.mediaUrls ? `<a href="${e.mediaUrls}" target="_blank">कार्ड</a>` : ''}</td>
    </tr>
  `).join('');

  const html = `
  <html lang="hi">
    <head>
      <meta charset="utf-8" />
      <style>
        @font-face {
          font-family: 'Noto Sans Devanagari';
          src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
        }

        body, * {
          font-family: 'Noto Sans Devanagari', sans-serif;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          border: 1px solid #ccc;
          padding: 5px;
          font-size: 13px;
        }

        .header {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .footer {
          text-align: center;
          font-size: 12px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        माननीय श्री अमर बंसल जी<br>
        पार्षद, समता कॉलोनी रायपुर, छत्तीसगढ़<br>
        वार्ड क्रमांक: [वार्ड नंबर], जोन: [जोन नंबर]<br>
        ${today ? `कार्यक्रम सूची - ${todayDate}` : 'कार्यक्रम सूची'}
      </div>

      <table>
        <thead>
          <tr>
            ${today ? '<th>समय</th>' : '<th>तारीख समय</th>'}
            <th>कार्यक्रम</th>
            <th>विवरण</th>
            <th>आयोजक</th>
            <th>फोन</th>
            <th>स्थान</th>
            <th>कार्ड</th>
          </tr>
        </thead>
        <tbody>
          ${eventRows}
        </tbody>
      </table>

      <div class="footer">
        संपर्क: +91-XXXXXXXXXX | ईमेल: amarbansal@example.com<br>
        यह एक स्वचालित रूप से जनरेट की गई सूची है
      </div>
    </body>
  </html>
  `;

  // Puppeteer PDF Generation
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      bottom: '20px',
      left: '20px',
      right: '20px'
    }
  });

  await browser.close();
  return pdfBuffer;
}

module.exports = { generatePdf };
