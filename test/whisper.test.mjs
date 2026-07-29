import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getOpenAiConfig,
  isWhisperConfigured,
  normalizeOpenAiConfig,
  resolveWhisperAvailability,
  transcribeAudioWithWhisper,
  whisperHealthUrl,
} from '../src/whisper.mjs';

test('normalizes OpenAI config with Whisper defaults', () => {
  assert.deepEqual(normalizeOpenAiConfig({}), {
    apiKey: '',
    model: 'whisper-1',
    baseUrl: 'https://api.openai.com/v1',
    proxyUrl: 'http://localhost:8787/transcribe',
  });
});

test('reads OpenAI config from the global runtime source', () => {
  const config = getOpenAiConfig({
    __MMI_OPENAI__: {
      apiKey: 'sk-test',
      model: 'whisper-1',
      proxyUrl: 'http://localhost:9999/transcribe',
    },
  });

  assert.equal(config.apiKey, 'sk-test');
  assert.equal(config.proxyUrl, 'http://localhost:9999/transcribe');
  assert.equal(isWhisperConfigured(config), true);
});

test('builds the Whisper proxy health URL from the transcribe endpoint', () => {
  assert.equal(whisperHealthUrl('http://localhost:8787/transcribe'), 'http://localhost:8787/health');
});

test('marks Whisper available when an API key is present', async () => {
  const result = await resolveWhisperAvailability({
    apiKey: 'sk-test',
    model: 'whisper-1',
    proxyUrl: 'http://localhost:8787/transcribe',
  });

  assert.equal(result.available, true);
});

test('marks Whisper unavailable when the proxy is not running', async () => {
  const result = await resolveWhisperAvailability(
    {
      apiKey: '',
      model: 'whisper-1',
      proxyUrl: 'http://localhost:8787/transcribe',
    },
    {
      fetchImpl: async () => {
        throw new Error('connect refused');
      },
    },
  );

  assert.equal(result.available, false);
  assert.match(result.reason, /proxy is not running/i);
});

test('transcribes audio through the Whisper proxy adapter', async () => {
  const audioBlob = new Blob(['audio'], { type: 'audio/webm' });
  let sawMultipart = false;

  const result = await transcribeAudioWithWhisper(
    audioBlob,
    {
      apiKey: '',
      model: 'whisper-1',
      proxyUrl: 'http://localhost:8787/transcribe',
    },
    {
      fetchImpl: async (url, options) => {
        assert.equal(url, 'http://localhost:8787/transcribe');
        assert.equal(options.method, 'POST');
        assert.ok(options.body instanceof FormData);
        sawMultipart = true;
        return {
          ok: true,
          async json() {
            return { text: 'I would speak privately first.', model: 'whisper-1' };
          },
        };
      },
    },
  );

  assert.equal(sawMultipart, true);
  assert.deepEqual(result, {
    text: 'I would speak privately first.',
    model: 'whisper-1',
    provider: 'openai-whisper',
  });
});

test('surfaces Whisper failure without inventing transcript text', async () => {
  await assert.rejects(
    () =>
      transcribeAudioWithWhisper(
        new Blob(['audio'], { type: 'audio/webm' }),
        { apiKey: 'sk-test', model: 'whisper-1', baseUrl: 'https://api.openai.com/v1', proxyUrl: '' },
        {
          fetchImpl: async () => ({
            ok: false,
            status: 401,
            async json() {
              return { error: { message: 'Incorrect API key provided' } };
            },
          }),
        },
      ),
    /Incorrect API key provided/,
  );
});
