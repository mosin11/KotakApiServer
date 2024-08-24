// logger.js
const winston = require('winston');

const customLevels = {
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    },
    colors: {
      error: 'red',
      warn: 'yellow',
      info: 'green',
      debug: 'blue'
    }
  };
  
  const logger = winston.createLogger({
    levels: customLevels.levels,
    format: winston.format.simple(),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });
  
  winston.addColors(customLevels.colors);
  module.exports = logger;
  