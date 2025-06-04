const axios = require('axios');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Cloudinary config
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

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { margin: 0; }
            body {
              font-family: 'Mangal', 'Arial Unicode MS', sans-serif;
              font-size: 14px;
              margin: 0;
              color: #000;
            }
            .header {
              text-align: center;
              padding: 10px;
            }
            .header-main {
              font-size: 22px;
              font-weight: bold;
              color: #1a3e72;
            }
            .header-sub {
              font-size: 18px;
            }
            .header-address {
              font-size: 14px;
            }
            .date-section {
              font-size: 16px;
              font-weight: bold;
              margin-top: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 13px;
            }
            .footer-link {
              background: #080227;
              color: white;
              padding: 5px 15px;
              text-decoration: none;
              border-radius: 4px;
            }
            table {
              width: 98%;
              margin: 0 auto;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 5px;
              font-size: 13px;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-main">माननीय श्री अमर बंसल जी</div>
            <div class="header-sub">पार्षद, समता कॉलोनी रायपुर, छत्तीसगढ़</div>
            <div class="header-address">वार्ड क्रमांक: [वार्ड नंबर], जोन: [जोन नंबर]</div>
            <hr />
            <div class="date-section">
              ${today ? `कार्यक्रम सूची - ${todayDate}` : 'कार्यक्रम सूची'}
            </div>
            <hr />
          </div>
          <table>
            <thead>
              <tr>
                ${today
                  ? '<th width="8%">समय</th>'
                  : '<th width="12%">तारीख समय</th>'}
                <th width="12%">कार्यक्रम</th>
                <th width="22%">विवरण</th>
                <th width="20%">आयोजक / द्वारा</th>
                <th width="14%">मोबाइल</th>
                <th width="19%">स्थान</th>
                <th width="5%">कार्ड</th>
              </tr>
            </thead>
            <tbody>${eventRows}</tbody>
          </table>
          <div class="footer">
            <hr />
            <a href="https://whatsapp-bot-eight-lime.vercel.app/manageevents" target="_blank">
              <button class="footer-link">सभी कार्यक्रम देखें</button>
            </a>
            <div class="footer-contact">संपर्क: +91-XXXXXXXXXX | ईमेल: amarbansal@example.com</div>
            <div style="margin-top: 3px;">
              यह एक स्वचालित रूप से जनरेट की गई सूची है, कृपया किसी भी अंतिम समय में परिवर्तन के लिए संपर्क करें
            </div>
          </div>
        </body>
      </html>
    `;

    // Call html2pdf.app to generate PDF
    const pdfResponse = await axios.post(
      'https://api.html2pdf.app/v1/generate',
      {
        html: htmlContent,
        apiKey: process.env.HTML2PDF_API_KEY,
      },
      { responseType: 'arraybuffer' }
    );

    const buffer = pdfResponse.data;

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'daily-event-pdfs',
          public_id: `events-${Date.now()}`,
          overwrite: true,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      const readable = require('stream').Readable.from(buffer);
      readable.pipe(stream);
    });

    const longUrl = uploadResult.secure_url;
    const shortUrl = await shortenUrl(longUrl);
    return { longUrl, shortUrl };
  } catch (err) {
    console.error('PDF generation failed:', err.message);
    throw err;
  }
}

module.exports = { generateEventPDF };
