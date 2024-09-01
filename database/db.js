const { Pool } = require('pg');
const logger = require('../logger/logger');

// Create a new pool instance
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const desiredColumns = [
  'psymbol', 'pexchseg', 'psymbolname',
  'ptrdsymbol', 'poptiontype', 'pscriprefkey',
  'lexpirydate', 'dstrikeprice'
];


async function createTableFromCSVHeaders(tableName, headers) {
  const client = await pool.connect();
  logger.info(`Creating table "${tableName}"`);
  try {
    const allHeaders = headers.join(',').split(',').map(col => col.trim()).filter(col => col);
// Filter the headers based on desiredColumns
    const filteredHeaders = allHeaders.filter(header => desiredColumns.includes(header));
    const columns = filteredHeaders.map(col => col.trim()).filter(col => col); // Remove any empty strings
    if (columns.length === 0) {
      logger.error('No valid columns found in the CSV headers.');
      throw new Error('No valid columns found in the CSV headers.');
    }
    const columnss = columns.map(col => `${col} VARCHAR`).join(', ');
    logger.info(`Creating table columnss  ${columnss}`);
    
     // Ensure pSymbol is unique
     let uniqueConstraint = '';
     if (columns.includes('psymbol')) {
       uniqueConstraint = ', UNIQUE (psymbol)';
     }
    // Create table SQL statement
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id SERIAL PRIMARY KEY,
        ${columnss}
         ${uniqueConstraint}
      );
    `;
    // Execute the query to create the table
  // logger.info("createTableQuery "+createTableQuery)
    await client.query(createTableQuery);
    logger.info(`Table ${tableName} created successfully.`);
  } catch (err) {
    logger.error(`Error creating table "${tableName}":`, err);
  } finally {
    client.release();
    logger.info(`Database client released after creating table "${tableName}".`);
  }
}

async function insertRowIntoTable(tableName, row) {
  const client = await pool.connect(); 
   try {
   const tableExists = await checkIfTableExists(client, tableName);
   if (!tableExists) {
    logger.error(`Table "${tableName}" does not exist.`);
    return true;
    //throw new Error(`Table "${tableName}" does not exist.`);
  }
 // Retrieve table schema
 const columnsInTable = await getTableSchema(client, tableName);
 const columnNames = Object.keys(row).map(col => col.trim().toLowerCase());
  
  const invalidColumns = columnNames.filter(col => !columnsInTable.includes(col));
 if (invalidColumns.length > 0) {
  logger.error(`Invalid columns: ${invalidColumns.join(', ')}`);
  return true;
 }
  const columns = columnNames.map(col => `${col}`).join(', ');
  // Extract values from row 
  const values = columnNames.map(col => {
    const trimmedCol = col.trim();
    return row.hasOwnProperty(trimmedCol) ? row[trimmedCol] : null;
  });
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const insertQuery = `
      INSERT INTO ${tableName} (${columns})
      VALUES (${placeholders})
    `;
    try {
      //console.log("insertQuery, values", values)
      await client.query(insertQuery, values);
      logger.info(`Row inserted into table "${tableName}" successfully.`);
      return false;
    } catch (err) {
      if (err.code === '23505') { // Unique constraint violation error code
        logger.warn(`Unique constraint violation while inserting row into table "${tableName}": ${err.detail}`);
        // Skip this row and continue
      } else {
        logger.error("error in inserting data",err);
        return true;
      }
    }
  } catch (err) {
      logger.error(`Error inserting row into table "${tableName}":`, err);
      return true;
  } finally {
    client.release();
    logger.info(`Database client released after inserting row into table "${tableName}".`);
  }
}


async function checkIfTableExists(client, tableName, schemaName = 'public') {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = $1
      AND table_name = $2
    )
  `;
  const result = await client.query(query, [schemaName, tableName]);
  return result.rows[0].exists;
}

async function getTableSchema(client, tableName, schemaName = 'public') {
  const query = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1
    AND table_schema = $2
  `;
  const result = await client.query(query, [tableName, schemaName]);
  return result.rows.map(row => row.column_name);
}

// Export the query method for performing SQL queries
module.exports = {
  query: (text, params) => {
    logger.info(`Executing query: ${text} with params: ${params}`);
    return pool.query(text, params);
  },
  createTableFromCSVHeaders,
  insertRowIntoTable
};
