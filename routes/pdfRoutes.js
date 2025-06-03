const express = require('express');
const router = express.Router();
const { createPdf } = require('../controllers/pdfController');

router.post('/makePdf', createPdf);

module.exports = router;
