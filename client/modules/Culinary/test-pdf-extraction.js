#!/usr/bin/env node

/**
 * PDF Extraction Test Script
 * 
 * Usage:
 *   node test-pdf-extraction.js <pdf-file> [--debug|--upload] [--title "Book Title"]
 * 
 * Examples:
 *   node test-pdf-extraction.js food-lovers-companion.pdf
 *   node test-pdf-extraction.js food-lovers-companion.pdf --upload
 *   node test-pdf-extraction.js food-lovers-companion.pdf --debug --title "Food Lovers Companion"
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5173, // Change to your API port if different
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(bodyStr);
    }

    req.end();
  });
}

async function testDebug(pdfFile, title) {
  log(colors.yellow, '\n=== Testing Debug Endpoint ===\n');

  try {
    // Read PDF file
    log(colors.blue, `Reading PDF file: ${pdfFile}`);
    if (!fs.existsSync(pdfFile)) {
      log(colors.red, `Error: File not found: ${pdfFile}`);
      process.exit(1);
    }

    const pdfBuffer = fs.readFileSync(pdfFile);
    const pdfBase64 = pdfBuffer.toString('base64');

    log(colors.green, `✓ PDF read (${pdfBuffer.length} bytes)`);

    // Send debug request
    log(colors.blue, 'Sending debug request...');
    const response = await makeRequest('POST', '/pdf-library/debug', {
      pdfBase64: pdfBase64,
      pdfName: path.basename(pdfFile),
      title: title || 'The Food Lovers Companion',
    });

    log(colors.green, `✓ Response received (status: ${response.status})`);

    // Display results
    console.log('\n' + JSON.stringify(response.data, null, 2));

    // Analysis
    if (response.data.textExtraction) {
      log(colors.yellow, '\n=== Text Extraction Analysis ===');
      const te = response.data.textExtraction;
      log(te.success ? colors.green : colors.red, `Success: ${te.success}`);
      log(colors.blue, `Text length: ${te.textLength} characters`);
      log(colors.blue, `Line count: ${te.lineCount}`);
      if (te.error) {
        log(colors.red, `Error: ${te.error}`);
      }
    }

    if (response.data.definitionExtraction) {
      log(colors.yellow, '\n=== Definition Extraction Analysis ===');
      const de = response.data.definitionExtraction;
      log(de.success ? colors.green : colors.red, `Success: ${de.success}`);
      log(colors.blue, `Terms extracted: ${de.termsExtracted}`);
      log(colors.blue, `Average confidence: ${de.averageConfidence}`);
      if (de.error) {
        log(colors.red, `Error: ${de.error}`);
      }
    }

    if (response.data.recommendations) {
      log(colors.yellow, '\n=== Recommendations ===');
      response.data.recommendations.forEach((rec) => {
        log(colors.blue, `• ${rec}`);
      });
    }
  } catch (error) {
    log(colors.red, `Error: ${error.message}`);
    process.exit(1);
  }
}

async function testUpload(pdfFile, title) {
  log(colors.yellow, '\n=== Testing Upload Endpoint ===\n');

  try {
    // Read PDF file
    log(colors.blue, `Reading PDF file: ${pdfFile}`);
    if (!fs.existsSync(pdfFile)) {
      log(colors.red, `Error: File not found: ${pdfFile}`);
      process.exit(1);
    }

    const pdfBuffer = fs.readFileSync(pdfFile);
    const pdfBase64 = pdfBuffer.toString('base64');

    log(colors.green, `✓ PDF read (${pdfBuffer.length} bytes)`);

    // Send upload request
    log(colors.blue, 'Sending upload request...');
    const response = await makeRequest('POST', '/pdf-library/upload', {
      pdfBase64: pdfBase64,
      pdfName: path.basename(pdfFile),
      title: title || 'The Food Lovers Companion',
      author: 'Unknown',
      cuisine: 'General',
    });

    log(colors.green, `✓ Response received (status: ${response.status})`);

    // Display results
    console.log('\n' + JSON.stringify(response.data, null, 2));

    if (response.data.import) {
      log(colors.yellow, '\n=== Import Results ===');
      const imp = response.data.import;
      log(colors.blue, `File: ${imp.file}`);
      log(colors.blue, `Source: ${imp.source}`);
      log(colors.blue, `Terms extracted: ${imp.termsExtracted}`);
      log(colors.blue, `Terms added: ${imp.termsAdded}`);
      log(colors.blue, `Text extracted: ${imp.textExtracted} characters`);
      log(colors.blue, `Average confidence: ${imp.averageConfidence}`);
    }

    if (response.data.dictionaryUpdate) {
      log(colors.yellow, '\n=== Dictionary Update ===');
      log(colors.green, response.data.dictionaryUpdate.message);
      log(colors.blue, `Total terms: ${response.data.dictionaryUpdate.totalTerms}`);
    }
  } catch (error) {
    log(colors.red, `Error: ${error.message}`);
    process.exit(1);
  }
}

async function checkStatus() {
  log(colors.yellow, '\n=== Checking Dictionary Status ===\n');

  try {
    const response = await makeRequest('GET', '/pdf-library/status');
    console.log('\n' + JSON.stringify(response.data, null, 2));
  } catch (error) {
    log(colors.red, `Error: ${error.message}`);
    process.exit(1);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    log(colors.yellow, 'PDF Extraction Test Script');
    log(colors.blue, '\nUsage:');
    log(colors.reset, '  node test-pdf-extraction.js <pdf-file> [--debug|--upload] [--title "Title"]');
    log(colors.blue, '\nOptions:');
    log(colors.reset, '  --debug    Test debug endpoint (default)');
    log(colors.reset, '  --upload   Test upload endpoint');
    log(colors.reset, '  --status   Check dictionary status');
    log(colors.reset, '  --title    Set custom title (default: "The Food Lovers Companion")');
    log(colors.blue, '\nExamples:');
    log(colors.reset, '  node test-pdf-extraction.js food-lovers-companion.pdf');
    log(colors.reset, '  node test-pdf-extraction.js food-lovers-companion.pdf --upload');
    log(colors.reset, '  node test-pdf-extraction.js food-lovers-companion.pdf --title "My Cookbook"');
    process.exit(1);
  }

  const pdfFile = args[0];
  const mode = args.includes('--upload') ? 'upload' : args.includes('--status') ? 'status' : 'debug';
  let title = 'The Food Lovers Companion';

  // Parse title if provided
  const titleIndex = args.indexOf('--title');
  if (titleIndex !== -1 && titleIndex + 1 < args.length) {
    title = args[titleIndex + 1];
  }

  if (mode === 'status') {
    await checkStatus();
  } else if (mode === 'upload') {
    await testUpload(pdfFile, title);
  } else {
    await testDebug(pdfFile, title);
  }
}

main().catch((error) => {
  log(colors.red, `Fatal error: ${error.message}`);
  process.exit(1);
});
