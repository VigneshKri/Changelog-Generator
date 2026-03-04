// ============================================
// WebLLM Service — In-Browser AI using WebGPU/WASM
// Runs small LLMs directly in the browser, no server needed
// ============================================

// Available models — curated for changelog generation (small, fast)
export const WEBLLM_MODELS = [
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 360M (Fastest)',
    size: '~250MB',
    description: 'Ultra-fast, good for simple commits',
    speed: 'fastest',
  },
  {
    id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 1.7B (Balanced)',
    size: '~1GB',
    description: 'Good quality with reasonable speed',
    speed: 'fast',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini (Best Quality)',
    size: '~2.2GB',
    description: 'Best quality, larger download',
    speed: 'moderate',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 1.5B',
    size: '~1GB',
    description: 'Good multilingual support',
    speed: 'fast',
  },
  {
    id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
    name: 'TinyLlama 1.1B',
    size: '~650MB',
    description: 'Compact Llama variant, decent quality',
    speed: 'fast',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B',
    size: '~700MB',
    description: 'Latest Llama, good instruction following',
    speed: 'fast',
  },
];

// Singleton engine instance
let engineInstance = null;
let currentModelId = null;
let loadingPromise = null;

/**
 * Check if WebGPU is available
 */
export function isWebGPUAvailable() {
  return typeof navigator !== 'undefined' && !!navigator.gpu;
}

/**
 * Get loading status
 */
export function getWebLLMStatus() {
  if (!isWebGPUAvailable()) return { ready: false, reason: 'WebGPU not supported in this browser' };
  if (engineInstance && currentModelId) return { ready: true, model: currentModelId };
  if (loadingPromise) return { ready: false, reason: 'Loading model...' };
  return { ready: false, reason: 'No model loaded' };
}

/**
 * Initialize WebLLM engine with a model
 * @param {string} modelId - Model ID from WEBLLM_MODELS
 * @param {function} onProgress - Progress callback (progress) => void
 */
export async function initWebLLM(modelId, onProgress) {
  if (!isWebGPUAvailable()) {
    throw new Error('WebGPU is not supported in this browser. Try Chrome 113+ or Edge 113+.');
  }

  // Already loaded this model
  if (engineInstance && currentModelId === modelId) {
    return engineInstance;
  }

  // If loading a different model, unload first
  if (engineInstance) {
    try {
      await engineInstance.unload();
    } catch {}
    engineInstance = null;
    currentModelId = null;
  }

  if (loadingPromise) {
    // Wait for ongoing load
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      // Dynamic import to keep bundle small when not used
      const webllm = await import('@mlc-ai/web-llm');

      const engine = new webllm.MLCEngine();

      engine.setInitProgressCallback((report) => {
        if (onProgress) {
          onProgress({
            text: report.text,
            progress: report.progress || 0,
          });
        }
      });

      await engine.reload(modelId);

      engineInstance = engine;
      currentModelId = modelId;
      loadingPromise = null;
      return engine;
    } catch (err) {
      loadingPromise = null;
      throw new Error(`Failed to load WebLLM model: ${err.message}`);
    }
  })();

  return loadingPromise;
}

/**
 * Unload the current model to free memory
 */
export async function unloadWebLLM() {
  if (engineInstance) {
    try {
      await engineInstance.unload();
    } catch {}
    engineInstance = null;
    currentModelId = null;
  }
}

/**
 * Process commits using WebLLM
 * @param {string[]} commitMessages - Array of raw commit strings
 * @param {string} tone - 'professional' | 'casual' | 'technical'
 * @param {string} modelId - Model to use
 * @param {function} onProgress - Loading progress callback
 * @returns {Promise<Array>} - Processed commits
 */
export async function processCommitsWithWebLLM(commitMessages, tone, modelId, onProgress) {
  const engine = await initWebLLM(modelId, onProgress);

  const toneGuide = {
    professional: 'professional and polished',
    casual: 'casual and friendly with personality',
    technical: 'precise and technical',
  };

  const systemPrompt = `You are a changelog generator. Convert git commit messages into user-friendly release notes.
Rules:
- One clear sentence per commit, max 20 words
- Tone: ${toneGuide[tone] || 'professional'}
- Focus on WHAT changed for users
- Categorize each: features, bugfixes, performance, breaking, docs, refactor, chores
- Respond ONLY with a JSON array, no other text

Format: [{"original":"commit","category":"key","humanized":"description"}]`;

  // Process in small batches for small models
  const BATCH_SIZE = 10;
  const allResults = [];

  for (let i = 0; i < commitMessages.length; i += BATCH_SIZE) {
    const batch = commitMessages.slice(i, i + BATCH_SIZE);
    const userPrompt = `Convert these commits:\n${batch.map((m, j) => `${j + 1}. ${m}`).join('\n')}`;

    const response = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const text = response.choices?.[0]?.message?.content || '';

    try {
      const parsed = parseWebLLMResponse(text);
      allResults.push(...parsed);
    } catch {
      // If parsing fails, create basic entries from the batch
      for (const msg of batch) {
        allResults.push({
          original: msg,
          category: 'chores',
          humanized: msg,
        });
      }
    }
  }

  return allResults;
}

/**
 * Parse WebLLM response (more forgiving than server-based)
 */
function parseWebLLMResponse(text) {
  let jsonStr = text.trim();

  // Remove markdown code blocks
  const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1].trim();

  // Find the JSON array
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) jsonStr = arrayMatch[0];

  // Try to fix common LLM JSON issues
  jsonStr = jsonStr
    .replace(/,\s*}/g, '}')  // trailing comma in object
    .replace(/,\s*\]/g, ']') // trailing comma in array
    .replace(/'/g, '"');       // single quotes to double

  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error('Expected array');
  return parsed;
}

/**
 * Test if WebLLM works with current model
 */
export async function testWebLLM(modelId, onProgress) {
  try {
    const engine = await initWebLLM(modelId, onProgress);
    const response = await engine.chat.completions.create({
      messages: [{ role: 'user', content: 'Say "ok" in one word.' }],
      temperature: 0,
      max_tokens: 10,
    });
    const text = response.choices?.[0]?.message?.content || '';
    return { success: true, message: `Model loaded! Response: "${text.trim()}"` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
