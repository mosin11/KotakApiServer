// csvWorker.js
const { parentPort } = require('worker_threads');
const fastcsv = require('fast-csv');
const { Readable } = require('stream');

parentPort.on('message', async ({ csvChunk, desiredColumns }) => {
    try {
        const parsedResults = [];

        // Convert the chunk to a readable stream
        const stream = Readable.from(csvChunk);

        const csvStream = fastcsv.parse({
            headers: true,
            ignoreEmpty: true,
            strictColumnHandling: false,
            discardUnmappedColumns: true,
            trim: true,
        });

        stream.pipe(csvStream)
            .on('error', error => {
                parentPort.postMessage({ error: error.message });
            })
            .on('data', row => {
                const filteredRow = {};
                desiredColumns.forEach(column => {
                    filteredRow[column] = row[column] || ''; // Handle missing columns
                });
                if (filteredRow.pSymbolName === 'NIFTY') {
                    parsedResults.push(filteredRow);
                }
            })
            .on('end', rowCount => {
                parentPort.postMessage({ data: parsedResults, rowCount });
            });
    } catch (error) {
        parentPort.postMessage({ error: error.message });
    }
});
