// Types for Next.js API routes (should be available when Next.js is installed)
interface NextApiRequest {
  method?: string;
  body: any;
}

interface NextApiResponse {
  status(statusCode: number): NextApiResponse;
  json(body: any): void;
  setHeader(name: string, value: string | string[]): void;
}
import { GitHubService } from './github';
import { ErrorLogEntry } from '../types';

interface LogRequest {
  logs: ErrorLogEntry[];
  config: {
    repository: string;
    owner: string;
  };
}

export async function handleErrorLogs(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { logs, config }: LogRequest = req.body;

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      res.status(400).json({ error: 'No logs provided' });
      return;
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('GITHUB_TOKEN environment variable is not set');
      res.status(500).json({ error: 'GitHub token not configured' });
      return;
    }

    const repository = config.repository || process.env.VERCEL_GIT_REPO_SLUG;
    const owner = config.owner || process.env.VERCEL_GIT_REPO_OWNER;

    if (!repository || !owner) {
      console.error('Repository information not available');
      res.status(400).json({ error: 'Repository information not available' });
      return;
    }

    const prNumber = logs[0]?.prNumber;
    if (!prNumber) {
      console.log('No PR number found, skipping GitHub comment');
      res.status(200).json({ message: 'Logs received but no PR number found' });
      return;
    }

    const githubService = new GitHubService(githubToken, owner, repository);
    
    const hasAccess = await githubService.verifyAccess();
    if (!hasAccess) {
      console.error('GitHub access verification failed');
      res.status(500).json({ error: 'GitHub access verification failed' });
      return;
    }

    await githubService.postOrUpdateErrorComment(prNumber, logs);

    res.status(200).json({ 
      message: 'Error logs processed successfully',
      prNumber,
      logCount: logs.length 
    });

  } catch (error) {
    console.error('Error processing logs:', error);
    res.status(500).json({ 
      error: 'Failed to process error logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export function createApiHandler(): typeof handleErrorLogs {
  return handleErrorLogs;
}