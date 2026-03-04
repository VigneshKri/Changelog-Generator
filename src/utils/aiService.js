// ============================================
// AI Service — LLM Integration for Commit Humanization
// Supports: Ollama (local), Gemini (free), Groq (free),
//           WebLLM (browser), OpenAI, any OpenAI-compatible API
// ============================================

const AI_TIMEOUT_MS = 45000;

/**
 * Fetch with timeout for AI API calls
 */
async function aiFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('AI request timed out. The provider took too long to respond — try a smaller batch or a different model.');
    }
    throw new Error('Network error connecting to AI provider — check your connection and provider URL.');
  } finally {
    clearTimeout(timer);
  }
}

const PROVIDERS = {
  ollama: {
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.2',
    requiresKey: false,
    description: 'Free, runs locally. Install from ollama.com',
    category: 'local',
    icon: '🖥️',
  },
  webllm: {
    name: 'WebLLM (In-Browser)',
    baseUrl: '',
    defaultModel: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    requiresKey: false,
    description: 'Runs AI directly in your browser via WebGPU. No server needed!',
    category: 'local',
    icon: '🌐',
  },
  gemini: {
    name: 'Google Gemini (Free)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    requiresKey: true,
    description: 'Free tier: 15 RPM, 1M tokens/day. Get key from aistudio.google.com',
    category: 'cloud',
    icon: '💎',
  },
  groq: {
    name: 'Groq (Free Tier)',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-8b-instant',
    requiresKey: true,
    description: 'Fastest inference. Free tier available from console.groq.com',
    category: 'cloud',
    icon: '⚡',
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-3.5-turbo',
    requiresKey: true,
    description: 'Paid API. Get key from platform.openai.com',
    category: 'cloud',
    icon: '🔮',
  },
  custom: {
    name: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    defaultModel: '',
    requiresKey: false,
    description: 'Any OpenAI-compatible API endpoint',
    category: 'cloud',
    icon: '🔧',
  },
};

export { PROVIDERS };

// ============================================
// Ollama Local Model Detection
// ============================================

/**
 * Check if Ollama is running locally
 */
export async function checkOllamaRunning() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return { running: true, models: data.models || [] };
    }
    return { running: false, models: [] };
  } catch {
    return { running: false, models: [] };
  }
}

/**
 * Fetch list of locally installed Ollama models
 */
export async function getOllamaModels() {
  try {
    const res = await fetch('http://localhost:11434/api/tags');
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m) => ({
      id: m.name,
      name: m.name,
      size: formatBytes(m.size),
      modified: m.modified_at,
      family: m.details?.family || 'unknown',
      paramSize: m.details?.parameter_size || '',
      quantization: m.details?.quantization_level || '',
    }));
  } catch {
    return [];
  }
}

/**
 * Pull / download an Ollama model
 */
export async function pullOllamaModel(modelName, onProgress) {
  try {
    const res = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      body: JSON.stringify({ name: modelName, stream: false }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Failed to pull model');
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function formatBytes(bytes) {
  if (!bytes) return '?';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

// ============================================
// Gemini API Integration
// ============================================

/**
 * Call Google Gemini API
 */
async function callGemini(apiKey, model, messages, temperature = 0.3) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Convert OpenAI-style messages to Gemini format
  const systemInstruction = messages.find((m) => m.role === 'system');
  const userMessages = messages.filter((m) => m.role !== 'system');

  const body = {
    contents: userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction.content }],
    };
  }

  const response = await aiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 400) throw new Error('Invalid request. Check your API key and model name.');
    if (response.status === 403) throw new Error('API key invalid or Gemini API not enabled.');
    if (response.status === 429) throw new Error('Rate limit exceeded. Gemini free tier: 15 requests/min.');
    throw new Error(`Gemini API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

// ============================================
// Core LLM Functions
// ============================================

function buildSystemPrompt(tone) {
  const toneGuide = {
    professional: 'Write in a professional, polished tone suitable for official release notes.',
    casual: 'Write in a casual, friendly tone with personality. Use exclamations and warm language.',
    technical: 'Write in a precise, technical tone. Include technical details but make it readable.',
  };

  return `You are a changelog generator that converts raw git commit messages into user-friendly release notes.

RULES:
1. Transform each commit into a single clear, human-readable sentence.
2. ${toneGuide[tone] || toneGuide.professional}
3. Remove all technical jargon unless the tone is "technical".
4. Focus on WHAT changed for the user, not HOW it was implemented.
5. Keep each entry concise — one sentence, no more than 20 words.
6. Categorize each commit into exactly one category.

CATEGORIES (use these exact keys):
- features: New features or capabilities
- bugfixes: Bug fixes
- performance: Performance improvements
- breaking: Breaking changes
- docs: Documentation updates
- refactor: Code improvements (internal)
- chores: Maintenance, dependencies, CI/CD

RESPOND WITH VALID JSON ONLY. No markdown, no explanation. Format:
[
  {
    "original": "the original commit message",
    "category": "category_key",
    "humanized": "The user-friendly description"
  }
]`;
}

function buildUserPrompt(commitMessages) {
  return `Convert these git commit messages into user-friendly changelog entries:\n\n${commitMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}`;
}

/**
 * Call an OpenAI-compatible chat completion API
 */
async function callLLM(provider, apiKey, model, messages) {
  // Route Gemini calls to its own handler
  if (provider === 'gemini') {
    return callGemini(apiKey, model, messages);
  }

  // Route Ollama calls (use /v1 endpoint for OpenAI compat)
  const baseUrl = provider === 'ollama'
    ? 'http://localhost:11434/v1'
    : provider === 'custom'
      ? PROVIDERS.custom.baseUrl
      : PROVIDERS[provider]?.baseUrl;

  if (!baseUrl) throw new Error('Invalid provider or missing base URL');

  const url = `${baseUrl}/chat/completions`;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const body = {
    model: model || PROVIDERS[provider]?.defaultModel || 'llama3.2',
    messages,
    temperature: 0.3,
    max_tokens: 4096,
  };

  const response = await aiFetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 401) throw new Error('Invalid API key. Please check your credentials.');
    if (response.status === 429) throw new Error('Rate limit exceeded. Please wait and try again.');
    if (response.status === 404) {
      if (provider === 'ollama') {
        throw new Error(`Model "${model}" not found. Pull it first with: ollama pull ${model}`);
      }
      throw new Error('Model not found. Please check the model name.');
    }
    throw new Error(`AI API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Parse the LLM response into structured data
 */
function parseLLMResponse(text) {
  let jsonStr = text.trim();

  // Handle markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Handle cases where LLM adds text before/after JSON
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    jsonStr = arrayMatch[0];
  }

  // Fix common JSON issues from LLMs
  jsonStr = jsonStr
    .replace(/,\s*}/g, '}')
    .replace(/,\s*\]/g, ']');

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) throw new Error('Expected array');
    return parsed;
  } catch {
    throw new Error('AI returned invalid format. Please try again.');
  }
}

/**
 * Process commits using AI (unified entry point)
 * @param {string[]} commitMessages - Array of raw commit message strings
 * @param {object} aiConfig - { provider, apiKey, model, customBaseUrl }
 * @param {string} tone - 'professional' | 'casual' | 'technical'
 * @param {function} onProgress - Optional progress callback for WebLLM
 * @returns {Promise<Array>} - Parsed and humanized commits
 */
export async function processCommitsWithAI(commitMessages, aiConfig, tone = 'professional', onProgress) {
  const { provider, apiKey, model, customBaseUrl } = aiConfig;

  // WebLLM — delegate to its own service
  if (provider === 'webllm') {
    const { processCommitsWithWebLLM } = await import('./webLLMService');
    return processCommitsWithWebLLM(commitMessages, tone, model, onProgress);
  }

  // Set custom base URL if provided
  if (provider === 'custom' && customBaseUrl) {
    PROVIDERS.custom.baseUrl = customBaseUrl;
  }

  const systemPrompt = buildSystemPrompt(tone);

  // Truncate individual commits to prevent token overflow
  const MAX_COMMIT_LEN = 500;
  const safeMsgs = commitMessages.map((m) => m.length > MAX_COMMIT_LEN ? m.slice(0, MAX_COMMIT_LEN) + '...' : m);

  // Batch large sets — process in chunks of 25
  const BATCH_SIZE = 25;
  const batches = [];
  for (let i = 0; i < safeMsgs.length; i += BATCH_SIZE) {
    batches.push(safeMsgs.slice(i, i + BATCH_SIZE));
  }

  const allResults = [];
  let failedBatches = 0;

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    try {
      const userPrompt = buildUserPrompt(batch);
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];
      const raw = await callLLM(provider, apiKey, model, messages);
      const parsed = parseLLMResponse(raw);
      allResults.push(...parsed);
    } catch (err) {
      failedBatches++;
      console.warn(`AI batch ${b + 1}/${batches.length} failed:`, err.message);
      // For partial failures, fall back to raw commit messages for this batch
      allResults.push(
        ...batch.map((msg) => ({
          original: msg,
          category: 'chores',
          humanized: msg,
        }))
      );
    }
  }

  // If ALL batches failed, throw so the caller can fall back to the regex engine
  if (failedBatches === batches.length) {
    throw new Error('All AI batches failed — falling back to regex engine.');
  }

  return allResults;
}

/**
 * Test AI connection (any provider)
 */
export async function testAIConnection(aiConfig) {
  const { provider, apiKey, model, customBaseUrl } = aiConfig;

  // WebLLM test
  if (provider === 'webllm') {
    try {
      const { testWebLLM } = await import('./webLLMService');
      return testWebLLM(model);
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  // Ollama — first check if server is running
  if (provider === 'ollama') {
    const ollamaCheck = await checkOllamaRunning();
    if (!ollamaCheck.running) {
      return { success: false, message: 'Ollama is not running. Start it with: ollama serve' };
    }
  }

  // Gemini test
  if (provider === 'gemini') {
    try {
      const text = await callGemini(apiKey, model || 'gemini-2.0-flash', [
        { role: 'user', content: 'Respond with exactly one word: ok' },
      ]);
      return { success: true, message: `Connected! Response: "${text.trim().slice(0, 30)}"` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  if (provider === 'custom' && customBaseUrl) {
    PROVIDERS.custom.baseUrl = customBaseUrl;
  }

  try {
    const messages = [
      { role: 'user', content: 'Respond with exactly: {"status":"ok"}' },
    ];
    await callLLM(provider, apiKey, model, messages);
    return { success: true, message: 'Connection successful!' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Get/save AI config from localStorage
 */
export function loadAIConfig() {
  try {
    const saved = localStorage.getItem('changelog_ai_config');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    enabled: false,
    provider: 'ollama',
    apiKey: '',
    model: '',
    customBaseUrl: '',
  };
}

export function saveAIConfig(config) {
  try {
    localStorage.setItem('changelog_ai_config', JSON.stringify(config));
  } catch {}
}
