#!/usr/bin/env node

const http = require('http');
const https = require('https');

const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.replace(/\\n/gm, '\n');
      }
      value = value.replace(/(^['"]|['"]$)/g, '').trim();
      process.env[key] = value;
    }
  });
}

const API_KEY = process.env.MCP_API_KEY;
if (!API_KEY) {
  console.error("Missing MCP_API_KEY in environment variables.");
  process.exit(1);
}
const SERVER_URL = process.env.MCP_SERVER_URL || "http://127.0.0.1:5001";
const SSE_URL = `${SERVER_URL}/api/mcp/sse`;
let POST_URL = null;
const pendingMessages = [];

// 1. Connect to SSE
const sseProtocol = SSE_URL.startsWith('https') ? https : http;
const req = sseProtocol.request(SSE_URL, {
  method: 'GET',
  headers: {
    "x-mcp-api-key": API_KEY,
    "Accept": "text/event-stream"
  }
}, (res) => {
  let buffer = '';
  res.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep last incomplete line
    
    let currentEvent = null;
    let currentData = '';
    
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.substring(7).trim();
      } else if (line.startsWith('data: ')) {
        // SSE data can be split across multiple 'data: ' lines
        currentData += (currentData ? '\n' : '') + line.substring(6);
      } else if (line.trim() === '') {
        // Blank line means end of event
        if (currentEvent === 'endpoint') {
          // The endpoint URL might be relative or absolute
          const urlStr = currentData.trim();
          POST_URL = urlStr.startsWith('http') ? urlStr : `${SERVER_URL}${urlStr}`;
          
          // Send any pending messages that arrived before endpoint
          while(pendingMessages.length > 0) {
            postMessage(pendingMessages.shift());
          }
        } else if (currentEvent === 'message' && currentData) {
          // Claude Desktop requires valid JSON-RPC lines on stdout
          process.stdout.write(currentData + '\n');
        }
        currentEvent = null;
        currentData = '';
      }
    }
  });
});

req.on('error', (err) => {
  process.stderr.write(`SSE Connection Error: ${err.message}\n`);
  process.exit(1);
});
req.end();

// 2. Read from Stdin and POST to Messages
function postMessage(line) {
  if (!POST_URL) {
    pendingMessages.push(line);
    return;
  }
  
  const postProtocol = POST_URL.startsWith('https') ? https : http;
  const postReq = postProtocol.request(POST_URL, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "x-mcp-api-key": API_KEY
    }
  }, (postRes) => {
    // Consume response to free memory
    postRes.on('data', () => {});
  });
  
  postReq.on('error', (err) => {
    process.stderr.write(`POST Error: ${err.message}\n`);
  });
  
  postReq.write(line);
  postReq.end();
}

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false // Disable echoing
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  postMessage(line);
});
