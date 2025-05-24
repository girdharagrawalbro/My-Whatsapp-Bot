const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');

router.post('/', templateController.createTemplate);
router.get('/', templateController.getTemplates);
router.get('/:id', templateController.getTemplateById);
router.put('/:id', templateController.updateTemplate);
router.delete('/:id', templateController.deleteTemplate);

module.exports = router;
