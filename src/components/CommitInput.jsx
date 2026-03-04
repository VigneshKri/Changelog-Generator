import React, { useState, useCallback } from 'react';
import { SAMPLE_COMMITS, SAMPLE_COMMITS_SMALL } from '../utils/changelogEngine';
import { parseRepoInput, fetchGitHubCommits, fetchRepoInfo } from '../utils/githubApi';

export default function CommitInput({ onCommitsReady, setLoading, setError }) {
  const [activeTab, setActiveTab] = useState('paste'); // 'paste' | 'github'
  const [commitText, setCommitText] = useState('');
  const [repoInput, setRepoInput] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [commitCount, setCommitCount] = useState(50);
  const [fetchingRepo, setFetchingRepo] = useState(false);

  const MAX_COMMITS = 500;
  const PASTE_WARN_THRESHOLD = 1000;

  const countCommits = useCallback((text) => {
    return text.split('\n').filter((l) => l.trim().length > 0 && !l.trim().startsWith('#')).length;
  }, []);

  const handlePasteGenerate = () => {
    if (!commitText.trim()) return;
    onCommitsReady(commitText);
  };

  const handleGitHubFetch = async () => {
    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
      setError('Invalid repository format. Use "owner/repo" or a GitHub URL.');
      return;
    }

    setFetchingRepo(true);
    setLoading(true);
    setError(null);

    try {
      // Fetch repo info (optional, for display)
      const repoInfo = await fetchRepoInfo(parsed.owner, parsed.repo, githubToken);

      // Fetch commits
      const commits = await fetchGitHubCommits(parsed.owner, parsed.repo, {
        token: githubToken,
        perPage: commitCount,
      });

      if (commits.length === 0) {
        setError('No commits found in this repository.');
        setFetchingRepo(false);
        setLoading(false);
        return;
      }

      // Convert to text format for our parser
      const commitMessages = commits.map((c) => c.message).join('\n');
      onCommitsReady(commitMessages, repoInfo);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetchingRepo(false);
      setLoading(false);
    }
  };

  const loadSample = (type) => {
    const sample = type === 'full' ? SAMPLE_COMMITS : SAMPLE_COMMITS_SMALL;
    setCommitText(sample);
    setActiveTab('paste');
  };

  const currentCommitCount = commitText ? countCommits(commitText) : 0;

  return (
    <div className="input-section">
      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'paste' ? 'active' : ''}`}
          onClick={() => setActiveTab('paste')}
        >
          ✏️ Paste Commits
        </button>
        <button
          className={`tab ${activeTab === 'github' ? 'active' : ''}`}
          onClick={() => setActiveTab('github')}
        >
          🔗 GitHub Repo
        </button>
      </div>

      {/* Paste Tab */}
      {activeTab === 'paste' && (
        <div className="input-card">
          <label className="input-label">Commit Messages</label>
          <span className="input-hint">
            Paste your git log output — one commit per line. Supports conventional commits (feat:, fix:, etc.) and plain messages.
          </span>
          <textarea
            className="commit-textarea"
            value={commitText}
            onChange={(e) => setCommitText(e.target.value)}
            placeholder={`feat: add dark mode toggle\nfix: resolve login timeout issue\nperf: optimize database queries\nfeat(api): add webhook support\n...`}
            spellCheck={false}
          />
          <div className="sample-commits-row">
            <button className="sample-btn" onClick={() => loadSample('full')}>
              📝 Load sample commits (22)
            </button>
            <button className="sample-btn" onClick={() => loadSample('small')}>
              📎 Load small sample (6)
            </button>
          </div>
          {currentCommitCount > PASTE_WARN_THRESHOLD && (
            <div className="input-warning">
              {currentCommitCount.toLocaleString()} commits detected — large inputs may be slow. Consider reducing to under {PASTE_WARN_THRESHOLD}.
            </div>
          )}
          <div className="generate-section">
            <div className="commit-count">
              <strong>{currentCommitCount}</strong> commits detected
            </div>
            <button
              className="btn btn-primary generate-btn"
              onClick={handlePasteGenerate}
              disabled={currentCommitCount === 0}
            >
              ✨ Generate Changelog
            </button>
          </div>
        </div>
      )}

      {/* GitHub Tab */}
      {activeTab === 'github' && (
        <div className="input-card">
          <label className="input-label">GitHub Repository</label>
          <span className="input-hint">
            Enter a public repo (owner/repo) or full GitHub URL. Add a token for private repos or higher rate limits.
          </span>
          <div className="github-input-group">
            <input
              className="github-input"
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="e.g., facebook/react or https://github.com/vercel/next.js"
            />
          </div>
          <input
            className="token-input"
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder="GitHub Personal Access Token (optional, for private repos)"
          />
          <div className="github-options">
            <div className="option-group">
              <label>Commits to fetch:</label>
              <input
                className="option-select"
                type="number"
                min={1}
                max={500}
                value={commitCount}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10);
                  if (!Number.isNaN(val) && val > 0) setCommitCount(Math.min(val, MAX_COMMITS));
                  else if (e.target.value === '') setCommitCount('');
                }}
                onBlur={() => {
                  if (!commitCount || commitCount < 1) setCommitCount(50);
                  else if (commitCount > MAX_COMMITS) setCommitCount(MAX_COMMITS);
                }}
                placeholder="e.g. 50"
              />
            </div>
          </div>
          <div className="generate-section">
            <div className="commit-count">
              Will fetch up to <strong>{commitCount}</strong> commits
            </div>
            <button
              className="btn btn-primary generate-btn"
              onClick={handleGitHubFetch}
              disabled={!repoInput.trim() || fetchingRepo}
            >
              {fetchingRepo ? '⏳ Fetching...' : '🔄 Fetch & Generate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
