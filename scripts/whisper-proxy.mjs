#!/usr/bin/env node
import http from 'node:http';
import { env } from 'node:process';

const PORT = Number(env.MMI_WHISPER_PROXY_PORT || 8787);
const OPENAI_API_KEY = env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const DEFAULT_MODEL = env.OPENAI_WHISPER_MODEL || 'whisper-1';

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  response.end(body);
}

function readRequestBuffer(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, {
      ok: true,
      configured: Boolean(OPENAI_API_KEY),
      model: DEFAULT_MODEL,
    });
    return;
  }

  if (request.method !== 'POST' || request.url !== '/transcribe') {
    sendJson(response, 404, { error: 'Not found. POST /transcribe with multipart audio.' });
    return;
  }

  if (!OPENAI_API_KEY) {
    sendJson(response, 503, {
      error: 'OPENAI_API_KEY is not set for the Whisper proxy.',
    });
    return;
  }

  try {
    const contentType = request.headers['content-type'] || '';
    const body = await readRequestBuffer(request);
    const upstream = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': contentType,
        'Content-Length': String(body.length),
      },
      body,
    });

    const text = await upstream.text();
    response.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    response.end(text);
  } catch (error) {
    sendJson(response, 502, {
      error: error?.message || 'Whisper proxy failed to reach OpenAI.',
    });
  }
});

server.listen(PORT, () => {
  console.log(`MMI Whisper proxy listening on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Transcribe: POST http://localhost:${PORT}/transcribe`);
  if (!OPENAI_API_KEY) {
    console.log('Warning: OPENAI_API_KEY is not set. /transcribe will return 503 until it is provided.');
  }
});
