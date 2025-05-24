// utils/templateProcessor.js

/**
 * Replace template placeholders with provided variable values.
 * E.g., "Hello {{name}}" with { name: "John" } becomes "Hello John"
 */
function processTemplate(template, variables) {
  let processedContent = template.content;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processedContent = processedContent.replace(regex, value);
  }

  return processedContent;
}

module.exports = { processTemplate };
