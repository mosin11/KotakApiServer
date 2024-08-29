const express = require('express');
const axios = require('axios');
const { Worker } = require('worker_threads');
const { Readable } = require('stream');
const logger = require('../logger/logger');
const path = require('path');  // Include path module


// Desired columns
const desiredColumns = [
  'pSymbol', 'pExchSeg', 'pSymbolName',
  'pTrdSymbol', 'pOptionType', 'pScripRefKey',
  'lExpiryDate ', 'dStrikePrice'
];
//const worker = new Worker(path.resolve(__dirname, '../csvWorkerController/csvWorker.js'));  // Use path.resolve
// Function to process a chunk using a worker
function processChunkInWorker(csvChunk) {
  return new Promise((resolve, reject) => {
      const worker = new Worker(path.resolve(__dirname, '../csvWorkerController/csvWorker.js'));

      worker.on('message', (message) => {
          if (message.error) {
              reject(new Error(message.error));
          } else {
              resolve(message.data);
          }
      });

      worker.on('error', (error) => {
          reject(error);
      });

      worker.on('exit', (code) => {
          if (code !== 0) {
              reject(new Error(`Worker stopped with exit code ${code}`));
          }
      });

      worker.postMessage({ csvChunk, desiredColumns });
  });
}

async function processCsvFile(req, res) {
  try {
      const urls = req.body; // Get URLs from request body
      logger.info(`Received URLs: ${JSON.stringify(urls)}`);

      if (!Array.isArray(urls) || urls.length === 0) {
          return res.status(400).json({ error: 'No URLs provided' });
      }

      console.time('CSV Processing Time');

      const results = [];

      for (const url of urls) {
          console.time(`Processing ${url}`);
          try {
              const response = await axios.get(url);
              const csvData = response.data;

              // Define chunk size (number of lines per chunk)
              const CHUNK_SIZE = 1000; // Adjust based on your data size and system capabilities

              const lines = csvData.split(/\r?\n/);
              const headerLine = lines.shift(); // Extract header line
              const chunks = [];

              // Prepare chunks with headers
              for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
                  const chunkLines = lines.slice(i, i + CHUNK_SIZE);
                  const chunk = [headerLine, ...chunkLines].join('\n');
                  chunks.push(chunk);
              }

              // Process chunks in parallel with a concurrency limit
              const concurrencyLimit = 5; // Adjust based on system capabilities
              const chunkResults = [];

              while (chunks.length > 0) {
                  const chunkBatch = chunks.splice(0, concurrencyLimit);
                  const processedChunks = await Promise.all(chunkBatch.map(processChunkInWorker));
                  chunkResults.push(...processedChunks);
              }

              results.push(...chunkResults.flat());

              console.timeEnd(`Processing ${url}`);
          } catch (error) {
              logger.error(`Error processing URL ${url}: ${error.message}`);
              return res.status(500).json({ error: `Error processing URL ${url}: ${error.message}` });
          }
      }

      console.timeEnd('CSV Processing Time');

      res.status(200).json(results);
  } catch (error) {
      logger.error(`Error processing CSV files: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { processCsvFile };
