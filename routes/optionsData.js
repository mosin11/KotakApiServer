const express = require('express');
const router = express.Router();
const { optionchain, expirydatesData } = require('../controllers/optionsDataController');
const { processCsvFile } = require('../controllers/csvDataParse');

router.post('/optionchain', optionchain);
router.post('/expirydates', expirydatesData);
router.post('/process-csv', processCsvFile);
module.exports = router;

