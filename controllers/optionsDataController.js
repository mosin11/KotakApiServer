const axios = require('axios');
const qs = require('qs');
const logger = require('../logger/logger');

exports.optionchain = async (req, res) => { 
  logger.info("enter in optionchain");
const { symbol, expirydate } = req.body;

// Encode parameters to base64
const params = { symbol, expirydate };
const encodedParams = Buffer.from(JSON.stringify(params)).toString('base64');
logger.info("enter in optionchain encodedParams "+ encodedParams);
const url = `https://mksapi.kotaksecurities.com/60newserviceapi/cmots/derivative/option-chain/i/${encodedParams}`;

try {
  const response = await axios.get(url);
  if(symbol =='BANKNIFTY'){
    res.json({status: response.data.status, data:response.data.result.BANKNIFTYlist.BANKNIFTY});
  } else if(symbol =='NIFTY'){
    res.json({status: response.data.status, data:response.data.result.NIFTYlist.NIFTY});
  }
  else if(symbol =='FINNIFTY'){
    res.json({status: response.data.status, data:response.data.result.FINNIFTYlist.FINNIFTY});
  }
} catch (error) {
  logger.error("enter in optionchain error",error);
  res.status(500).send('Error fetching option chain data');
}
}



exports.expirydatesData = async (req, res) => { 
    try {
        const { symbol } = req.body;
        logger.info("enter in expirydatesData symbol is: "+ symbol);
        const response = await axios.get(`https://lapi.kotaksecurities.com/60masterscrip/expiry-info?instType=OPTIDX&symbol=${symbol}`);
        res.json(response.data);
      } catch (error) {
        logger.error('Error fetching expiry dates:', error);
        res.status(500).send('Internal Server Error');
      }
    }