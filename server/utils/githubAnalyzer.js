/* ═══════════════════════════════════════════════════
   GITHUB PROJECT ANALYZER
   Automated analysis of GitHub repositories for
   project verification and ATP scoring
   ═══════════════════════════════════════════════════ */

/**
 * Analyze a GitHub repository for project verification.
 * Uses the GitHub REST API to assess:
 * - Repository statistics (commits, contributors, stars)
 * - Language breakdown → tech stack
 * - Code complexity estimation (file count, size)
 * - Originality signals (fork status, unique commits)
 *
 * NOTE: For full automated verification, a GitHub OAuth token
 * should be configured via GITHUB_TOKEN env variable.
 * Without it, public repos can still be analyzed with rate limits.
 */

const GITHUB_API = 'https://api.github.com';

/**
 * Parse a GitHub URL to extract owner and repo name.
 * Supports: github.com/owner/repo, github.com/owner/repo.git, etc.
 * @param {string} url - GitHub repository URL
 * @returns {Object|null} { owner, repo } or null if invalid
 */
function parseGitHubUrl(url) {
    if (!url) return null;
    const patterns = [
        /github\.com\/([^\/]+)\/([^\/\s.]+)/i,
        /github\.com:([^\/]+)\/([^\/\s.]+)/i
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
        }
    }
    return null;
}

/**
 * Fetch data from GitHub API with optional authentication.
 * @param {string} endpoint - API path (e.g., /repos/owner/repo)
 * @returns {Promise<Object>} API response data
 */
async function githubFetch(endpoint) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ATP-GitHub-Analyzer/1.0'
    };

    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(`${GITHUB_API}${endpoint}`, { headers });

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Analyze a GitHub repository comprehensively.
 * @param {string} githubUrl - Full GitHub repository URL
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeRepository(githubUrl) {
    const parsed = parseGitHubUrl(githubUrl);
    if (!parsed) {
        return { success: false, error: 'Invalid GitHub URL' };
    }

    const { owner, repo } = parsed;

    try {
        // Fetch repository info, languages, and commits in parallel
        const [repoData, languages, commitsData] = await Promise.all([
            githubFetch(`/repos/${owner}/${repo}`),
            githubFetch(`/repos/${owner}/${repo}/languages`),
            githubFetch(`/repos/${owner}/${repo}/commits?per_page=100`)
        ]);

        // Repository basics
        const isFork = repoData.fork === true;
        const stars = repoData.stargazers_count || 0;
        const forks = repoData.forks_count || 0;
        const size = repoData.size || 0; // in KB
        const createdAt = repoData.created_at;
        const updatedAt = repoData.pushed_at || repoData.updated_at;
        const description = repoData.description || '';
        const defaultBranch = repoData.default_branch || 'main';

        // Language analysis → tech stack
        const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
        const techStack = Object.entries(languages)
            .map(([lang, bytes]) => ({
                language: lang,
                percentage: Math.round((bytes / totalBytes) * 100),
                bytes
            }))
            .sort((a, b) => b.percentage - a.percentage);

        // Commit analysis — check if user is a significant contributor
        const commitCount = commitsData.length;
        const uniqueAuthors = new Set(
            commitsData.map(c => c.author?.login || c.commit?.author?.email || 'unknown')
        );
        const contributorCount = uniqueAuthors.size;

        // Estimate days of development
        let developmentDays = 0;
        if (commitsData.length >= 2) {
            const firstCommit = new Date(commitsData[commitsData.length - 1].commit?.author?.date);
            const lastCommit = new Date(commitsData[0].commit?.author?.date);
            developmentDays = Math.max(1, Math.ceil((lastCommit - firstCommit) / 86400000));
        }

        // Complexity estimation
        const complexity = estimateComplexity(size, commitCount, techStack.length, contributorCount);

        // Originality signals
        const originalityScore = calculateOriginality(
            isFork, commitCount, contributorCount, size, developmentDays
        );

        // ATP impact calculation
        const atpImpact = calculateProjectATPImpact(
            complexity, originalityScore, techStack.length, commitCount
        );

        return {
            success: true,
            repository: {
                name: repoData.full_name,
                description,
                url: repoData.html_url,
                isFork,
                stars,
                forks,
                sizeKB: size,
                createdAt,
                updatedAt,
                defaultBranch
            },
            techStack: techStack.map(t => t.language),
            techStackDetailed: techStack,
            metrics: {
                commitCount,
                contributorCount,
                developmentDays,
                estimatedLinesOfCode: estimateLOC(size, languages)
            },
            complexity,
            originality: {
                score: originalityScore,
                isLikelyOriginal: originalityScore > 50,
                isFork,
                signals: {
                    uniqueCommits: commitCount,
                    contributorRatio: contributorCount > 1 ? 'collaborative' : 'solo',
                    developmentSpan: `${developmentDays} days`
                }
            },
            atpImpact,
            analyzedAt: new Date().toISOString()
        };
    } catch (err) {
        console.error('[GitHubAnalyzer] Error:', err.message);
        return {
            success: false,
            error: err.message,
            repository: { url: githubUrl, owner, repo }
        };
    }
}

/**
 * Estimate project complexity from repository metrics.
 */
function estimateComplexity(sizeKB, commits, languageCount, contributors) {
    let score = 0;

    // Size factor
    if (sizeKB > 10000) score += 3;       // >10MB = complex
    else if (sizeKB > 1000) score += 2;   // >1MB = moderate
    else score += 1;                       // Small

    // Commit factor
    if (commits >= 100) score += 3;
    else if (commits >= 30) score += 2;
    else score += 1;

    // Language diversity
    if (languageCount >= 5) score += 2;
    else if (languageCount >= 3) score += 1;

    // Collaboration
    if (contributors >= 3) score += 2;
    else if (contributors >= 2) score += 1;

    if (score >= 8) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
}

/**
 * Calculate originality score (0-100).
 * Higher = more likely original work.
 */
function calculateOriginality(isFork, commits, contributors, sizeKB, devDays) {
    let score = 100;

    // Fork penalty
    if (isFork) score -= 40;

    // Too few commits = likely template/clone
    if (commits < 5) score -= 30;
    else if (commits < 15) score -= 15;

    // Single-day development = possibly generated
    if (devDays <= 1 && commits > 10) score -= 20;

    // Very small size = possibly scaffold only
    if (sizeKB < 50) score -= 15;

    // Positive signals
    if (commits > 50 && devDays > 14) score += 10;
    if (contributors >= 2) score += 5;

    return Math.max(0, Math.min(100, score));
}

/**
 * Estimate lines of code from repository size and languages.
 */
function estimateLOC(sizeKB, languages = {}) {
    // Rough estimate: 1KB ≈ 30 lines for code files
    // Adjust based on primary language
    const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
    const codeRatio = totalBytes / (sizeKB * 1024 || 1); // Ratio of code to total size
    const estimatedLOC = Math.round(totalBytes / 40); // ~40 bytes per line average
    return Math.max(estimatedLOC, Math.round(sizeKB * 15)); // Fallback
}

/**
 * Calculate ATP impact score from project analysis.
 */
function calculateProjectATPImpact(complexity, originalityScore, techCount, commits) {
    const complexityWeight = { low: 5, medium: 10, high: 20 };
    let impact = complexityWeight[complexity] || 10;

    // Originality multiplier
    if (originalityScore > 75) impact *= 1.5;
    else if (originalityScore > 50) impact *= 1.2;
    else if (originalityScore < 30) impact *= 0.5;

    // Tech diversity bonus
    if (techCount >= 4) impact += 5;

    // Active development bonus
    if (commits > 50) impact += 5;

    return Math.round(Math.min(30, impact));
}

module.exports = {
    parseGitHubUrl,
    analyzeRepository,
    estimateComplexity,
    calculateOriginality,
    calculateProjectATPImpact
};
