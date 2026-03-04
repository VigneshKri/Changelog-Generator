import React, { useState, useEffect, useCallback } from 'react';
import {
  PROVIDERS,
  testAIConnection,
  loadAIConfig,
  saveAIConfig,
  checkOllamaRunning,
  getOllamaModels,
} from '../utils/aiService';
import {
  WEBLLM_MODELS,
  isWebGPUAvailable,
  getWebLLMStatus,
  initWebLLM,
  unloadWebLLM,
} from '../utils/webLLMService';

export default function AIConfigPanel({ aiConfig, onConfigChange }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // Ollama state
  const [ollamaRunning, setOllamaRunning] = useState(null); // null = not checked yet
  const [ollamaModels, setOllamaModels] = useState([]);
  const [ollamaChecking, setOllamaChecking] = useState(false);

  // WebLLM state
  const [webGPUSupported, setWebGPUSupported] = useState(null);
  const [webllmProgress, setWebllmProgress] = useState(null); // { text, progress }
  const [webllmLoading, setWebllmLoading] = useState(false);
  const [webllmStatus, setWebllmStatus] = useState(null); // from getWebLLMStatus()

  useEffect(() => {
    const saved = loadAIConfig();
    if (saved) onConfigChange(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check WebGPU support on mount
  useEffect(() => {
    setWebGPUSupported(isWebGPUAvailable());
  }, []);

  // Check Ollama and WebLLM status when panel opens or provider changes
  useEffect(() => {
    if (!isOpen || !aiConfig.enabled) return;
    if (aiConfig.provider === 'ollama') {
      refreshOllama();
    }
    if (aiConfig.provider === 'webllm') {
      setWebllmStatus(getWebLLMStatus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, aiConfig.provider, aiConfig.enabled]);

  const refreshOllama = useCallback(async () => {
    setOllamaChecking(true);
    const status = await checkOllamaRunning();
    setOllamaRunning(status.running);
    if (status.running) {
      const models = await getOllamaModels();
      setOllamaModels(models);
      // Auto-select first model if none selected
      if (models.length > 0 && !aiConfig.model) {
        handleChange('model', models[0].id);
      }
    }
    setOllamaChecking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiConfig.model]);

  const handleChange = (field, value) => {
    const updated = { ...aiConfig, [field]: value };
    if (field === 'provider' && PROVIDERS[value]) {
      updated.model = PROVIDERS[value].defaultModel;
      setTestResult(null);
    }
    onConfigChange(updated);
    saveAIConfig(updated);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testAIConnection(aiConfig);
    setTestResult(result);
    setTesting(false);
  };

  // WebLLM: load model
  const handleLoadWebLLM = async () => {
    setWebllmLoading(true);
    setWebllmProgress({ text: 'Initializing...', progress: 0 });
    try {
      await initWebLLM(
        aiConfig.model || PROVIDERS.webllm.defaultModel,
        (report) => {
          setWebllmProgress({
            text: report.text || 'Loading...',
            progress: report.progress != null ? Math.round(report.progress * 100) : null,
          });
        }
      );
      setWebllmStatus(getWebLLMStatus());
      setWebllmProgress(null);
    } catch (err) {
      setWebllmProgress({ text: `Error: ${err.message}`, progress: null });
    }
    setWebllmLoading(false);
  };

  const handleUnloadWebLLM = () => {
    unloadWebLLM();
    setWebllmStatus(getWebLLMStatus());
  };

  const provider = PROVIDERS[aiConfig.provider] || PROVIDERS.ollama;

  // Group providers by category
  const localProviders = Object.entries(PROVIDERS).filter(([, p]) => p.category === 'local');
  const cloudProviders = Object.entries(PROVIDERS).filter(([, p]) => p.category === 'cloud');

  return (
    <div className="ai-config-panel">
      <div className="ai-config-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="ai-config-title">
          <span>AI Processing</span>
          <span className={`ai-badge ${aiConfig.enabled ? 'ai-badge-active' : ''}`}>
            {aiConfig.enabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {isOpen ? '▼' : '▶'}
        </span>
      </div>

      {isOpen && (
        <div className="ai-config-body">
          {/* Enable Toggle */}
          <div className="ai-config-row">
            <label>Enable AI</label>
            <div
              className={`toggle-switch ${aiConfig.enabled ? 'active' : ''}`}
              onClick={() => handleChange('enabled', !aiConfig.enabled)}
              role="switch"
              aria-checked={aiConfig.enabled}
              tabIndex={0}
            >
              <div className="toggle-track">
                <div className="toggle-thumb" />
              </div>
              <span className="toggle-label">
                {aiConfig.enabled ? 'LLM-powered' : 'Enhanced Regex'}
              </span>
            </div>
          </div>

          {!aiConfig.enabled && (
            <div className="ai-config-note">
              ⚡ Enhanced regex engine active — 80+ patterns for smart commit humanization without any AI. Enable AI above for even better results.
            </div>
          )}

          {aiConfig.enabled && (
            <>
              {/* Provider Selection */}
              <div className="ai-config-row">
                <label>Provider</label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => handleChange('provider', e.target.value)}
                >
                  <optgroup label="Local / Free (no server needed)">
                    {localProviders.map(([key, p]) => (
                      <option key={key} value={key}>{p.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Cloud APIs">
                    {cloudProviders.map(([key, p]) => (
                      <option key={key} value={key}>{p.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="ai-provider-hint">
                {provider.icon} {provider.description}
              </div>

              {/* ===== WEBLLM-SPECIFIC UI ===== */}
              {aiConfig.provider === 'webllm' && (
                <div className="ai-provider-section webllm-section">
                  {/* WebGPU check */}
                  {webGPUSupported === false && (
                    <div className="ai-warning">
                      ⚠️ Your browser doesn't support WebGPU. Try Chrome 113+ or Edge 113+.
                    </div>
                  )}

                  {webGPUSupported !== false && (
                    <>
                      {/* Model picker */}
                      <div className="ai-config-row">
                        <label>Model</label>
                        <select
                          value={aiConfig.model || PROVIDERS.webllm.defaultModel}
                          onChange={(e) => handleChange('model', e.target.value)}
                        >
                          {WEBLLM_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.size})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Model description */}
                      {(() => {
                        const selected = WEBLLM_MODELS.find(
                          (m) => m.id === (aiConfig.model || PROVIDERS.webllm.defaultModel)
                        );
                        return selected ? (
                          <div className="webllm-model-info">
                            <span className="webllm-model-desc">{selected.description}</span>
                            <span className="webllm-model-vram">VRAM: ~{selected.vram}</span>
                          </div>
                        ) : null;
                      })()}

                      {/* Load / Unload buttons */}
                      <div className="ai-config-actions webllm-actions">
                        {!webllmStatus?.loaded ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={handleLoadWebLLM}
                            disabled={webllmLoading}
                          >
                            {webllmLoading ? 'Loading...' : 'Load Model'}
                          </button>
                        ) : (
                          <>
                            <span className="webllm-loaded-badge">
                              ✅ {webllmStatus.modelId?.split('-').slice(0, 2).join(' ')} loaded
                            </span>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={handleUnloadWebLLM}
                            >
                              Unload
                            </button>
                          </>
                        )}
                      </div>

                      {/* Progress bar */}
                      {webllmProgress && (
                        <div className="webllm-progress">
                          <div className="webllm-progress-text">{webllmProgress.text}</div>
                          {webllmProgress.progress != null && (
                            <div className="webllm-progress-bar">
                              <div
                                className="webllm-progress-fill"
                                style={{ width: `${webllmProgress.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="ai-config-note">
                        🧠 Model runs entirely in your browser. First load downloads the model (~50–800 MB).
                        Subsequent loads use cache.
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ===== OLLAMA-SPECIFIC UI ===== */}
              {aiConfig.provider === 'ollama' && (
                <div className="ai-provider-section ollama-section">
                  {/* Warn when running on a hosted site (non-localhost) */}
                  {typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                    <div className="ai-warning" style={{ marginBottom: 10 }}>
                      ⚠️ <strong>Ollama only works when this app is running on localhost.</strong><br />
                      Your browser blocks requests from hosted sites to <code>localhost:11434</code> (mixed content / CORS).<br />
                      <strong>Options:</strong>
                      <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: 12 }}>
                        <li>Run this app locally: <code>npm run dev</code></li>
                        <li>Or use a cloud AI provider (Gemini, Groq) — they work everywhere</li>
                      </ul>
                    </div>
                  )}

                  <div className="ai-config-actions ollama-status-row">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={refreshOllama}
                      disabled={ollamaChecking}
                    >
                      {ollamaChecking ? 'Checking...' : 'Detect Ollama'}
                    </button>
                    {ollamaRunning === true && (
                      <span className="ollama-status ollama-running">✅ Running</span>
                    )}
                    {ollamaRunning === false && (
                      <span className="ollama-status ollama-stopped">❌ Not running</span>
                    )}
                  </div>

                  {ollamaRunning === false && (
                    <div className="ai-warning">
                      Ollama is not running. Start it with: <code>ollama serve</code><br />
                      Install from <a href="https://ollama.com" target="_blank" rel="noreferrer">ollama.com</a>
                    </div>
                  )}

                  {ollamaRunning && ollamaModels.length > 0 && (
                    <div className="ai-config-row">
                      <label>Model</label>
                      <select
                        value={aiConfig.model || ''}
                        onChange={(e) => handleChange('model', e.target.value)}
                      >
                        {ollamaModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.size}{m.paramSize ? ` — ${m.paramSize}` : ''})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {ollamaRunning && ollamaModels.length === 0 && !ollamaChecking && (
                    <div className="ai-warning">
                      No models found. Pull one with: <code>ollama pull llama3.2</code>
                    </div>
                  )}
                </div>
              )}

              {/* ===== GEMINI-SPECIFIC UI ===== */}
              {aiConfig.provider === 'gemini' && (
                <div className="ai-provider-section gemini-section">
                  <div className="ai-config-row">
                    <label>API Key</label>
                    <input
                      type="password"
                      value={aiConfig.apiKey}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      placeholder="AIza..."
                    />
                  </div>
                  <div className="ai-config-row">
                    <label>Model</label>
                    <select
                      value={aiConfig.model || 'gemini-2.0-flash'}
                      onChange={(e) => handleChange('model', e.target.value)}
                    >
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash (fast, free)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (reliable)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (best quality)</option>
                    </select>
                  </div>
                  <div className="ai-config-note">
                    💎 Get a free API key from{' '}
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                      aistudio.google.com
                    </a>
                    . Free tier: 15 req/min, 1M tokens/day.
                  </div>
                </div>
              )}

              {/* ===== GROQ / OPENAI — Standard key + model ===== */}
              {(aiConfig.provider === 'groq' || aiConfig.provider === 'openai') && (
                <div className="ai-provider-section">
                  <div className="ai-config-row">
                    <label>API Key</label>
                    <input
                      type="password"
                      value={aiConfig.apiKey}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      placeholder="sk-..."
                    />
                  </div>
                  <div className="ai-config-row">
                    <label>Model</label>
                    <input
                      type="text"
                      value={aiConfig.model || provider.defaultModel}
                      onChange={(e) => handleChange('model', e.target.value)}
                      placeholder={provider.defaultModel || 'model-name'}
                    />
                  </div>
                </div>
              )}

              {/* ===== CUSTOM PROVIDER ===== */}
              {aiConfig.provider === 'custom' && (
                <div className="ai-provider-section">
                  <div className="ai-config-row">
                    <label>Base URL</label>
                    <input
                      type="text"
                      value={aiConfig.customBaseUrl}
                      onChange={(e) => handleChange('customBaseUrl', e.target.value)}
                      placeholder="https://api.example.com/v1"
                    />
                  </div>
                  <div className="ai-config-row">
                    <label>API Key</label>
                    <input
                      type="password"
                      value={aiConfig.apiKey}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="ai-config-row">
                    <label>Model</label>
                    <input
                      type="text"
                      value={aiConfig.model}
                      onChange={(e) => handleChange('model', e.target.value)}
                      placeholder="model-name"
                    />
                  </div>
                </div>
              )}

              {/* Test Connection (not for webllm when already loaded) */}
              {!(aiConfig.provider === 'webllm' && webllmStatus?.loaded) && (
                <div className="ai-config-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleTest}
                    disabled={testing}
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  {testResult && (
                    <span className={`ai-test-result ${testResult.success ? 'success' : 'error'}`}>
                      {testResult.success ? '✅' : '❌'} {testResult.message}
                    </span>
                  )}
                </div>
              )}

              <div className="ai-config-note">
                💡 When AI is enabled, commits will be processed by the selected LLM for
                more accurate categorization and humanization. Falls back to enhanced regex if AI fails.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
