
const axios = require('axios');
const Papa = require('papaparse');
const { Readable } = require('stream');
const db = require('../database/db'); // Import your db.js file
const logger = require('../logger/logger');
require('dotenv').config();

const desiredColumns = [
  'psymbol', 'pexchSeg', 'psymbolName',
  'ptrdsymbol', 'poptiontype', 'pscriprefkey',
  'lexpiryDate', 'dstrikeprice'
];

 // Function to create table
 async function createTableFromCSVHeadersInCSVfun(tableName,headers) {
    logger.info("Creating table from CSV headers");
    try {
        const headersRow = headers.map(col => col);
      await db.createTableFromCSVHeaders(tableName, headersRow);
    } catch (err) {
      logger.error(`Error creating table from CSV headers:`, err);
      throw err; // Propagate the error
    }
  }
 // Function to insert a row into the database
 async function insertRowIntoDB(tableName,row) {
    try {
         let status = await db.insertRowIntoTable(tableName, row);
      return status;
    } catch (err) {
      logger.error(`Error inserting row into table:`, err);
      return false;
      //throw err; // Propagate the error
    }
  }
  function renameKeysToLowercase(obj) {
    const renamedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Convert the key to lowercase and trim any surrounding whitespace
        const newKey = key.replace(/[\s;]+$/, '').trim().toLowerCase();
        renamedObj[newKey] = obj[key];
      }
    }
    return renamedObj;
  }



  function filterColumns(row, desiredColumns) {
    const filtered = {};
    const rowData =renameKeysToLowercase(row);
  // Normalize desiredColumns by removing unwanted characters
  const normalizedDesiredColumns = desiredColumns.map(col => col);
  for (const column of normalizedDesiredColumns) {
    const columnName = column.toLowerCase().trim();
    let value = rowData[columnName] || null;
    if (columnName === 'dstrikeprice' && value !== null) {
      value = parseInt(value, 10)/100; // Parse integer
    }
    
    if (columnName === 'lexpirydate' && value !== null) {
      value = parseInt(value, 10)+315513000; // Parse integer, or handle as needed
    }
    filtered[columnName] = value;
  }
    return filtered;
  }
  // Function to process CSV and insert data into DB
  async function processAndInsertCSV(csvData, tableName) {
    logger.info("Processing CSV data");
  
    // Parse the CSV data using PapaParse
    return new Promise((resolve, reject) => {
      Papa.parse(csvData, {
        header: true, // Automatically extract headers
        dynamicTyping: true, // Automatically typecast numeric values
        skipEmptyLines: true, // Skip empty lines
        complete: async (results) => {
          const headers = results.meta.fields.map(header => header.replace(/[\s;]+$/, '').trim().toLowerCase());
          try {
            // Create the table based on the extracted headers
            await createTableFromCSVHeadersInCSVfun(tableName, headers);
            logger.info("Table creation completed successfully.");
  
            // Process each row in the parsed data
           let statuscheck=false
            for (const row of results.data) {
                
              const filteredRow = filterColumns(row, desiredColumns);
              if (filteredRow) { // Only insert rows that match the filter condition
                statuscheck=   await insertRowIntoDB(tableName, filteredRow);
              }
              if(statuscheck){
                throw "error";
              }
       
    }
            logger.info("CSV processing and insertion completed.");
            resolve();
        
          } catch (err) {
            logger.error('Error during CSV processing or insertion:', err);
            reject(err);
          }
        },
        error: (err) => {
          logger.error('Error occurred while parsing CSV:', err); 
          reject(err);
        }
      });
    });
  }

async function processCsvFile(req, res) {
  try {
    // URLs to process
     // Prepare the table name
     const urls = req.body;
     const tableName = 'com_masterscript';
    //const urls = ['https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2024-08-31/transformed/nse_fo.csv'];
    logger.info(`Received URLs: ${JSON.stringify(urls)}`);

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'No URLs provided' });
    }
    // Process each URL
    for (const url of urls) {
      try {
        const response = await axios.get(url);
        const csvData = response.data;
        await processAndInsertCSV(csvData,tableName);
      } catch (error) {
        logger.error(`Error processing URL ${url}: ${error.message}`);
        return res.status(500).json({ error: `Error processing URL ${url}: ${error.message}` });
      }
    }

    res.status(200).json({ message: 'CSV data processed and inserted successfully.' });
  } catch (error) {
    logger.error(`Error processing CSV files: ${error.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { processCsvFile };
