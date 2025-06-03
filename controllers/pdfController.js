const { generateEventPDF } = require("../helpers/generatePdf");

const createPdf = async (req, res) => {
    try {
        const todayDate = new Date();
        const { events, date } = req.body;

        if (!events) {
            return res.status(400).json({ error: 'इवेंट आवश्यक हैं' });
        }
        let isToday = false
        if (date) {
            isToday = date === todayDate.toISOString().split('T')[0]; // Optional: customize your "today" check
        }

        const { longUrl } = await generateEventPDF(events, isToday);

        res.status(200).json({
            link: longUrl
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: "PDF बनाने में त्रुटि हुई" });
    }
};

module.exports = {
    createPdf,
};
