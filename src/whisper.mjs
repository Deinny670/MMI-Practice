const DEFAULT_MODEL = 'whisper-1';
const DEFAULT_PROXY_URL = 'http://localhost:8787/transcribe';

export function normalizeOpenAiConfig(raw = {}) {
  return {
    apiKey: String(raw.apiKey ?? raw.OPENAI_API_KEY ?? '').trim(),
    model: String(raw.model ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    baseUrl: String(raw.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, ''),
    proxyUrl: String(raw.proxyUrl ?? DEFAULT_PROXY_URL).trim(),
  };
}

export function getOpenAiConfig(globalLike = globalThis) {
  return normalizeOpenAiConfig(globalLike.__MMI_OPENAI__ ?? {});
}

export function isWhisperConfigured(config = getOpenAiConfig()) {
  return Boolean(config.apiKey || config.proxyUrl);
}

export async function loadOpenAiConfig({
  globalLike = globalThis,
  fetchImpl = globalThis.fetch?.bind(globalThis),
} = {}) {
  const fromWindow = normalizeOpenAiConfig(globalLike.__MMI_OPENAI__ ?? {});
  if (fromWindow.apiKey) return fromWindow;
  if (!fetchImpl) return fromWindow;

  try {
    const response = await fetchImpl('./openai-config.json', { cache: 'no-store' });
    if (!response.ok) return fromWindow;
    const fileConfig = normalizeOpenAiConfig(await response.json());
    return {
      apiKey: fileConfig.apiKey || fromWindow.apiKey,
      model: fileConfig.model || fromWindow.model,
      baseUrl: fileConfig.baseUrl || fromWindow.baseUrl,
      proxyUrl: fileConfig.proxyUrl || fromWindow.proxyUrl,
    };
  } catch {
    return fromWindow;
  }
}

export function whisperHealthUrl(proxyUrl = DEFAULT_PROXY_URL) {
  return String(proxyUrl).replace(/\/transcribe\/?$/, '/health');
}

export async function resolveWhisperAvailability(
  config = getOpenAiConfig(),
  { fetchImpl = globalThis.fetch?.bind(globalThis) } = {},
) {
  const normalized = normalizeOpenAiConfig(config);
  if (normalized.apiKey) {
    return { available: true, config: normalized };
  }

  if (!normalized.proxyUrl || !fetchImpl) {
    return {
      available: false,
      reason: 'OpenAI Whisper is not configured.',
      config: normalized,
    };
  }

  try {
    const response = await fetchImpl(whisperHealthUrl(normalized.proxyUrl), { cache: 'no-store' });
    if (!response.ok) {
      return {
        available: false,
        reason: 'Whisper proxy is unavailable.',
        config: normalized,
      };
    }
    const payload = await response.json();
    if (!payload.configured) {
      return {
        available: false,
        reason: 'Whisper proxy is running, but OPENAI_API_KEY is not set.',
        config: normalized,
      };
    }
    return { available: true, config: normalized };
  } catch {
    return {
      available: false,
      reason: 'Whisper proxy is not running. Start scripts/whisper-proxy.mjs with OPENAI_API_KEY.',
      config: normalized,
    };
  }
}

export async function transcribeAudioWithWhisper(
  audioBlob,
  config = getOpenAiConfig(),
  { fetchImpl = globalThis.fetch?.bind(globalThis) } = {},
) {
  if (!fetchImpl) {
    throw new Error('Fetch is unavailable for Whisper transcription.');
  }

  const normalized = normalizeOpenAiConfig(config);
  const formData = new FormData();
  formData.append('file', audioBlob, 'answer.webm');
  formData.append('model', normalized.model);

  if (normalized.apiKey) {
    const response = await fetchImpl(`${normalized.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${normalized.apiKey}`,
      },
      body: formData,
    });
    return readWhisperResponse(response, normalized.model);
  }

  if (!normalized.proxyUrl) {
    throw new Error('OpenAI Whisper is not configured.');
  }

  const proxyResponse = await fetchImpl(normalized.proxyUrl, {
    method: 'POST',
    body: formData,
  });
  return readWhisperResponse(proxyResponse, normalized.model);
}

async function readWhisperResponse(response, fallbackModel) {
  if (!response.ok) {
    const detail = await safeErrorText(response);
    throw new Error(detail || `Whisper request failed (${response.status}).`);
  }

  const payload = await response.json();
  const text = String(payload.text ?? '').trim();
  if (!text) throw new Error('Whisper returned an empty transcript.');
  return {
    text,
    model: payload.model ?? fallbackModel,
    provider: 'openai-whisper',
  };
}

async function safeErrorText(response) {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.error || payload?.message || '';
  } catch {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }
}

export { DEFAULT_MODEL, DEFAULT_PROXY_URL };
