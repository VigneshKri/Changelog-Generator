// ============================================
// GitHub API Integration
// ============================================

const GITHUB_API = 'https://api.github.com';
const FETCH_TIMEOUT_MS = 15000;

/**
 * Fetch with timeout + friendly network error handling
 */
async function safeFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The GitHub API took too long to respond — please try again.');
    }
    throw new Error('Network error — check your internet connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Safely parse JSON from a response (guards against HTML error pages)
 */
async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    throw new Error('Unexpected response from GitHub (non-JSON). This is usually a temporary issue — try again shortly.');
  }
}

/**
 * Parse a GitHub repo URL or owner/repo string
 */
export function parseRepoInput(input) {
  const trimmed = input.trim();

  // owner/repo format
  const simpleMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (simpleMatch) {
    return { owner: simpleMatch[1], repo: simpleMatch[2] };
  }

  // Full URL format
  const urlMatch = trimmed.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
  }

  return null;
}

/**
 * Fetch commits from a GitHub repository (with pagination for 100+ commits)
 */
export async function fetchGitHubCommits(owner, repo, options = {}) {
  const { token, perPage = 50, since, until, branch } = options;

  const headers = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // GitHub caps per_page at 100 — paginate if user wants more
  const pageSize = Math.min(perPage, 100);
  const allCommits = [];
  let page = 1;

  while (allCommits.length < perPage) {
    const params = new URLSearchParams({
      per_page: String(pageSize),
      page: String(page),
    });

    if (since) params.set('since', since);
    if (until) params.set('until', until);
    if (branch) params.set('sha', branch);

    const url = `${GITHUB_API}/repos/${owner}/${repo}/commits?${params}`;
    const response = await safeFetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Repository not found. Make sure the repo exists and is public (or provide a token for private repos).');
      }
      if (response.status === 403) {
        const remaining = response.headers.get('X-RateLimit-Remaining');
        if (remaining === '0') {
          throw new Error('GitHub API rate limit exceeded. Add a personal access token to increase your limit.');
        }
        throw new Error('Access denied. The repository may be private — provide a GitHub token to access it.');
      }
      if (response.status === 401) {
        throw new Error('Invalid GitHub token. Please check your token and try again.');
      }
      if (response.status >= 500) {
        throw new Error('GitHub is experiencing issues (server error). Please try again in a moment.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await safeJson(response);

    if (!Array.isArray(data) || data.length === 0) break;

    allCommits.push(...data);
    page++;

    // If we got fewer than pageSize, we've reached the end
    if (data.length < pageSize) break;
  }

  return allCommits.slice(0, perPage).map((item) => ({
    sha: item.sha,
    message: item.commit.message.split('\n')[0], // First line only
    author: item.commit.author?.name || 'Unknown',
    date: item.commit.author?.date || '',
    url: item.html_url,
  }));
}

/**
 * Fetch repository info
 */
export async function fetchRepoInfo(owner, repo, token) {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await safeFetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });

    if (!response.ok) {
      return null;
    }

    const data = await safeJson(response);
    return {
      name: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      defaultBranch: data.default_branch,
      language: data.language,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch tags/releases
 */
export async function fetchTags(owner, repo, token) {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await safeFetch(`${GITHUB_API}/repos/${owner}/${repo}/tags?per_page=10`, { headers });

    if (!response.ok) return [];

    return safeJson(response);
  } catch {
    return [];
  }
}
