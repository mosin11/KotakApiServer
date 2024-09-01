const { parentPort } = require('worker_threads');
const db = require('../database/db'); // Import your db.js file
const csv = require('csv-parser');
const { Readable } = require('stream');
const logger = require('../logger/logger');
require('dotenv').config();


parentPort.on('message', async ({ csvChunk, desiredColumns,workerId  }) => {
  try {
    const tableName= 'com_masterscript';
    //logger.info("enter in parentPort "+workerId) 
    let headers = await getCsvHeaders(csvChunk);
    logger.info("headers creates",headers);
    const filteredHeaders = await filterHeaders(headers, desiredColumns);
    logger.info("filteredHeaders are "+filteredHeaders)
    await createTableFromCSVHeaders(tableName, filteredHeaders);
    const results = await parseCsvAndInsert(csvChunk, desiredColumns,tableName);
    parentPort.postMessage({ data: results });
  } catch (error) {
    logger.error(`Worker ${workerId}: Error in worker thread:`, error);
    parentPort.postMessage({ error: error.message ,workerId :workerId });
  }
});
async function getCsvHeaders(csvChunk) {
  logger.info("Entering getCsvHeaders function");
  
  return new Promise((resolve, reject) => {
      const headers = [];
      let headersExtracted = false;
      Readable.from(csvChunk)
          .pipe(csv({ separator: ';' }))
          .on('headers', (headerList) => {
              if (!headersExtracted) { // Ensure we only capture headers once
                  headersExtracted = true;
                  
                  const cleanedHeadersList = headerList.map(header => header.trim().replace(/;$/, ''));
                  logger.info("CSV headers extracted cleanedHeadersList: ",cleanedHeadersList);
                  headers.push(...cleanedHeadersList);
              }
          })
          .on('end', () => {
              if (headersExtracted) {
                  logger.info("CSV headers extraction completed: ");
                  resolve(headers);
              } else {
                  logger.error("Failed to extract headers");
                  reject(new Error("Failed to extract headers"));
              }
          })
          .on('error', (err) => {
              logger.error("Error occurred while extracting CSV headers:", err);
              reject(err);
          });
  });
}


function filterHeaders(headers, desiredColumns) {
    logger.info("Entering filterHeaders function");
    // Ensure headers are trimmed and unique
    const trimmedHeaders = headers.map(header => header.trim());
    logger.info("Trimmed headers: ", trimmedHeaders);
    
    const filteredHeaders = trimmedHeaders.filter(header => {
        const isDesired = desiredColumns.includes(header);
        if (isDesired) {
            logger.info(`Header '${header}' is included in desired columns.`);
        } else {
            logger.info(`Header '${header}' is not included in desired columns.`);
        }
        return isDesired;
    });
    
    logger.info("Filtered headers: ", filteredHeaders);
    return filteredHeaders;
}


  async function createTableFromCSVHeaders(tableName, headers) {
    logger.info("enter createTableFromCSVHeaders");
     // Drop table if it exists
    // await dropTableIfExists(tableName);
    const client = await db.pool.connect();
    logger.info("created client");
    try {
      // Convert CSV headers to SQL columns (assuming all columns are text)
      const columns = headers.map(header => `"${header.replace(/"/g, '""')}" TEXT`).join(', ');
  
      // Create table SQL statement
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${tableName}" (
          id SERIAL PRIMARY KEY,
          ${columns}
        );
      `;
  
      // Execute the query to create the table
      await client.query(createTableQuery);
      logger.info(`Table "${tableName}" created or already exists.`);
    } catch (err) {
      logger.error('Error creating table:', err);
      throw new Error(`Failed to create table: ${err.message}`);
    } finally {
      client.release();
    }
  }



  async function parseCsvAndInsert(csvChunk, desiredColumns, tableName) {
    logger.info("enter parseCsvAndInsert");
    const results = [];
    const stream = Readable.from(csvChunk);
    
    for await (const row of stream.pipe(csv())) {
      try {
        const filteredRow = filterColumns(row, desiredColumns);
        results.push(filteredRow);
        await insertRowIntoDB(filteredRow, tableName);
      } catch (err) {
        logger.error("Error processing row:", err);
        throw err;
      }
    }
  
    return results;
  }
  

function filterColumns(row, desiredColumns) {
  const filtered = {};
  for (const column of desiredColumns) {
    filtered[column.trim()] = row[column.trim()];
  }
  return filtered;
}

async function insertRowIntoDB(row) {
    logger.info("enter insertRowIntoDB")
  const columns = Object.keys(row).map(col => `"${col}"`).join(', ');
  const values = Object.values(row);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const query = `
    INSERT INTO "${tableName}" (${columns})
    VALUES (${placeholders})
  `;

  const client =await db.pool.connect();
  try {
    
    const resData= await client.query(query, values);
    logger.info("inserted data "+query +"and Values are"+values+"resData is"+resData)
  } catch (err) {
    logger.error("error",err);
    throw new Error(`Failed to insert row into DB: ${err.message}`);
  } finally {
    client.release();
  }
}

async function dropTableIfExists(tableName) {
    logger.info("enter dropTableIfExists")
    const client = await db.pool.connect();
    try {
      const dropTableQuery = `DROP TABLE IF EXISTS "${tableName}";`;
      await client.query(dropTableQuery);
      logger.info(`Table "${tableName}" dropped if it existed.`);
    } catch (err) {
      logger.error('Error dropping table:', err);
      throw new Error(`Failed to drop table: ${err.message}`);
    } finally {
      client.release();
    }
}
