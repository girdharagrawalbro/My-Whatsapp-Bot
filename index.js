const { generatePdf } = require('./helpers/generatePdf');
const path = require('path');

const htmlContent = `
  <html lang="hi">
    <head>
      <meta charset="utf-8" />
      <title>हिंदी PDF टेस्ट</title>
    </head>
    <body>
      <h1>नमस्ते, यह एक हिंदी PDF परीक्षण है!</h1>
      <p>यह सुनिश्चित करता है कि देवनागरी लिपि सही से रेंडर हो रही है।</p>
    </body>
  </html>
`;

const outputPath = path.resolve(__dirname, 'test-hindi.pdf');

generatePdf(htmlContent, outputPath)
  .then(() => {
    console.log('PDF generated at:', outputPath);
  })
  .catch(err => {
    console.error('PDF generation failed:', err);
  });