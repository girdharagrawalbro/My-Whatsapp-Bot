const { generatePdf } = require('./helpers/generatePdf');
const path = require('path');

const fs = require('fs');
const events = [
  {
    date: '2025-07-09',
    time: '10:00 AM',
    title: 'स्वच्छता अभियान',
    description: 'सार्वजनिक स्थानों की सफाई हेतु विशेष अभियान',
    organizer: 'नगर निगम रायपुर',
    contactPhone: '9876543210',
    address: 'समता कॉलोनी पार्क',
    mediaUrls: 'https://example.com/card1'
  },
  // more events...
];(async () => {
  const buffer = await generatePdf(events, true);
  fs.writeFileSync('Events-Today.pdf', buffer);
})();