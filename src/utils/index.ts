export function extractPRNumberFromUrl(url: string): number | undefined {
  const patterns = [
    /pr-(\d+)/i,                    // Vercel preview URLs
    /pull\/(\d+)/,                  // GitHub PR URLs
    /pr(\d+)/i,                     // Alternative format
    /preview-(\d+)/i,               // Alternative preview format
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const prNumber = parseInt(match[1], 10);
      if (!isNaN(prNumber)) {
        return prNumber;
      }
    }
  }

  return undefined;
}

export function formatErrorForLogging(error: Error | string | unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\\n${error.stack}` : ''}`;
  }
  
  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export function isVercelEnvironment(): boolean {
  return !!(
    typeof process !== 'undefined' && 
    (process.env.VERCEL || process.env.VERCEL_ENV)
  );
}

export function getVercelEnvironmentInfo(): Record<string, string | undefined> {
  if (typeof process === 'undefined') {
    return {};
  }

  return {
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    vercelRegion: process.env.VERCEL_REGION,
    vercelGitProvider: process.env.VERCEL_GIT_PROVIDER,
    vercelGitRepoOwner: process.env.VERCEL_GIT_REPO_OWNER,
    vercelGitRepoSlug: process.env.VERCEL_GIT_REPO_SLUG,
    vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
    vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA,
  };
}

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func.apply(null, args);
    }, wait);
  };
}

export function sanitizeErrorMessage(message: string): string {
  // Remove potential sensitive information
  return message
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
    .replace(/token[=:]\s*[A-Za-z0-9\-._~+/]+=*/gi, 'token=[REDACTED]')
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/secret[=:]\s*\S+/gi, 'secret=[REDACTED]')
    .replace(/key[=:]\s*\S+/gi, 'key=[REDACTED]');
}