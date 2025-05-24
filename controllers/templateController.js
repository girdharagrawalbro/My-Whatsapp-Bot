const MessageTemplate = require('../models/MessageTemplate');

// Create a new template
const createTemplate = async (req, res) => {
  try {
    const { name, content, category, variables, createdBy } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'टेम्पलेट का नाम और सामग्री आवश्यक है' });
    }

    const template = new MessageTemplate({
      name,
      content,
      category,
      variables,
      createdBy,
      updatedAt: new Date()
    });

    await template.save();
    res.status(201).json({
      ...template.toObject(),
      message: 'टेम्पलेट सफलतापूर्वक बनाया गया'
    });
  } catch (error) {
    console.error('टेम्पलेट बनाने में त्रुटि:', error);
    res.status(500).json({ error: 'टेम्पलेट बनाने में विफल' });
  }
};

// Get templates with optional filters
const getTemplates = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const query = {};

    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const templates = await MessageTemplate.find(query);
    res.status(200).json(templates);
  } catch (error) {
    console.error('टेम्पलेट प्राप्त करने में त्रुटि:', error);
    res.status(500).json({ error: 'टेम्पलेट प्राप्त करने में विफल' });
  }
};
// Get a template by ID
const getTemplateById = async (req, res) => {
  try {
    const template = await MessageTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'टेम्पलेट नहीं मिला' });
    }
    res.json({
      template,
      message: 'टेम्पलेट सफलतापूर्वक प्राप्त किया गया'
    });
  } catch (error) {
    console.error('टेम्पलेट प्राप्त करने में त्रुटि:', error);
    res.status(500).json({ error: 'टेम्पलेट प्राप्त करने में विफल' });
  }
};

// Update a template
const updateTemplate = async (req, res) => {
  try {
    const { name, content, category, variables, isActive } = req.body;
    const updateData = {
      ...(name && { name }),
      ...(content && { content }),
      ...(category && { category }),
      ...(variables && { variables }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date()
    };

    const template = await MessageTemplate.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ error: 'टेम्पलेट नहीं मिला' });
    }

    res.json({
      template,
      message: 'टेम्पलेट सफलतापूर्वक अपडेट किया गया'
    });
  } catch (error) {
    console.error('टेम्पलेट अपडेट करने में त्रुटि:', error);
    res.status(500).json({ error: 'टेम्पलेट अपडेट करने में विफल' });
  }
};

// Delete a template
const deleteTemplate = async (req, res) => {
  try {
    const template = await MessageTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'टेम्पलेट नहीं मिला' });
    }
    res.status(204).json({ message: 'टेम्पलेट सफलतापूर्वक हटा दिया गया' });
  } catch (error) {
    console.error('टेम्पलेट हटाने में त्रुटि:', error);
    res.status(500).json({ error: 'टेम्पलेट हटाने में विफल' });
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate
};
