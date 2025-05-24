const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Classifies a user query into intent category
async function classifyQueryWithAI(query) {
  try {
    const prompt = `
      Analyze this user query about events and classify it into exactly one of these standard categories:
      - "today": For queries about today's events (e.g., "aaj ke karyakram", "आज क्या है")
      - "upcoming": For queries about future events (e.g., "aane wale programs", "भविष्य के कार्यक्रम")
      - "search": For general search queries (e.g., "bhajan sandhya khoje", "भजन संध्या के बारे में जानकारी")
      - "event_index": When query is just a number (event index)
      - "date": When query contains a specific date (e.g., "15/08/2024 ko kya hai")
      - "unknown": If none of the above match

      Respond ONLY with the category keyword from the list above. No other text or explanation.

      Query: "${query}"
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    return response.trim().toLowerCase();
  } catch (error) {
    console.error('AI classification error:', error);
    return 'unknown';
  }
}

module.exports = {
  classifyQueryWithAI
};
