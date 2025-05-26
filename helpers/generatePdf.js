// utils/pdfGenerator.js
const fs = require('fs');
const puppeteer = require('puppeteer');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');
require('dotenv').config();

const sitelink = "https://whatsapp-bot-eight-lime.vercel.app/manageevents";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

async function shortenUrl(url) {
  try {
    if (!isValidUrl(url)) return url;

    const encodedUrl = encodeURIComponent(url);
    const tinyUrl = `https://tinyurl.com/api-create.php?url=${encodedUrl}`;
    const response = await axios.get(tinyUrl, { headers: { 'Accept': 'text/plain' } });

    return isValidUrl(response.data) ? response.data : url;
  } catch (err) {
    console.error('URL shortening failed:', err.message);
    return url;
  }
}

async function generateEventPDF(events, today = true) {
  try {
    const todayDate = new Date().toLocaleDateString('hi-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    // Sort events by date and time (earliest first)
    const sortedEvents = [...events].sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateA - dateB;
    });

    const eventRows = sortedEvents.map(e => `
                <tr>
                  ${today
        ? `<td style="text-align:center;">${e.time}</td>`
        : `<td style="text-align:center;">${new Date(e.date).toLocaleDateString('hi-IN')} - ${e.time}</td>`
      }
                  <td>${e.title}</td>
                  <td>${e.description}</td>
                  <td>${e.organizer}</td>
                  <td>${e.address}</td>
                  <td style="text-align:center;">${e.contactPhone}</td>
              <td style="text-align:center;">
            ${e.mediaUrls ? `<a href="${e.mediaUrls}" target="_blank">कार्ड</a>` : ''}
          </td>

                </tr>
              `).join('');

    const htmlContent = `
                <html>
                  <head>  
                    <meta charset="utf-8" />
                 <style>
        @page {
            margin: 0;
        }

        body {
            font-family: 'Mangal', 'Arial Unicode MS', sans-serif;
            font-size: 14px;
            color: #000;
            margin: 0;
        }

        .fixed {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
        }

        .header {
            text-align: center;
            font-size: 14px;
            padding: 5px 10px;
        }

        .header-main {
            font-weight: bold;
            font-size: 22px;
            color: #1a3e72;
            margin-bottom: 5px;
            text-transform: uppercase;
        }

        .header-sub {
            font-size: 18px;
            color: #000;
        }

        .header-address {
            font-size: 14px;
            color: #000;
        }

        .date-section {
            font-size: 16px;
            font-weight: bold;
            color: #000;
        }

        .footer {
            width: 100%;
            margin-top: 10px;
            text-align: center;
            padding: 0 5px;
        }

        .footer-link {
            border: 1px solid black;
            color: black;
            padding: 5px 15px;
            text-decoration: none;
            border-radius: 4px;
        }

        .footer-contact {
            margin-top: 5px;
            font-weight: bold;
        }



        table {
            width: 99%;
            margin: 0 auto;
            border-collapse: collapse;
        }

        thead {
            display: table-header-group;
        }

        tfoot {
            display: table-footer-group;
        }

        tr {
            page-break-inside: avoid;
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 5px;
            font-size: 14px;
            vertical-align: top;
        }

        td {
            font-size: 13px;
        }
    </style>
    
    
    </head>
               <body>
  <div class="header">
    <div class="header-main">माननीय श्री अमर बंसल जी</div>
    <div class="header-sub">पार्षद, समता कॉलोनी रायपुर, छत्तीसगढ़</div>
    <div class="header-address">वार्ड क्रमांक: [वार्ड नंबर], जोन: [जोन नंबर]</div>
    <hr>
    <div class="date-section">
      ${today ? `कार्यक्रम सूची - ${todayDate}` : 'कार्यक्रम सूची'}
    </div>
    <hr>
  </div>

  

  <div class="page-content">
    <table>
      <thead>
        <tr>
          ${today
        ? '<th width="10%">समय</th>'
        : '<th width="10%">तारीख - समय</th>'
      }
          <th width="15%">कार्यक्रम</th>
          <th width="20%">विवरण</th>
          <th width="15%">आयोजक</th>
          <th width="15%">स्थान</th>
          <th width="10%">संपर्क</th>
          <th width="5%">कार्ड</th>
        </tr>
      </thead>
      <tbody>
        ${eventRows}
      </tbody>
    </table>
  </div>
  <div class="footer">
    <div>
      <a href="${sitelink}" class="footer-link" target="_blank">सभी कार्यक्रम देखें</a>
    </div>
    <div class="footer-contact">
      संपर्क: +91-XXXXXXXXXX | ईमेल: amarbansal@example.com
    </div>
    <div style="margin-top: 3px; font-size: 12px;">
      यह एक स्वचालित रूप से जनरेट की गई सूची है, कृपया किसी भी अंतिम समय में परिवर्तन के लिए संपर्क करें
    </div>
  </div>
</body>
 </html>
              `;

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfPath = `${today ? `कार्यक्रम सूची - ${todayDate} .pdf` : 'कार्यक्रम सूची .pdf'}`;
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0cm', bottom: '0cm', left: '0cm', right: '0cm' },
      displayHeaderFooter: false
    });

    await browser.close();

    const uploadResult = await cloudinary.uploader.upload(pdfPath, {
      resource_type: 'raw',
      folder: 'daily-event-pdfs',
      use_filename: true,
      unique_filename: false,
      access_mode: 'public',
    });

    fs.unlinkSync(pdfPath);

    const longUrl = uploadResult.secure_url;
    // const shortUrl = await shortenUrl(longUrl);

    return { longUrl };
  } catch (err) {
    console.error('PDF generation failed:', err.message);
    throw err;
  }
}

module.exports = { generateEventPDF };