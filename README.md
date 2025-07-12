# PR Error Logger

A comprehensive TypeScript package for automatically logging browser errors, warnings, and console output to GitHub Pull Request comments. Perfect for debugging issues in Vercel preview deployments.

## Features

- 🔍 **Automatic Error Capture** - Catches all browser errors and unhandled promise rejections
- 📱 **Device Information** - Includes viewport, screen size, platform, and browser details
- 🚀 **Vercel Integration** - Automatically detects PR numbers from Vercel preview URLs
- 📝 **GitHub PR Comments** - Posts detailed error reports directly to the relevant PR
- ⚡ **TypeScript First** - Full TypeScript support with comprehensive type definitions
- 🧩 **Modular Design** - Separate client/server modules for flexible usage
- 🎯 **Framework Agnostic** - Works with Next.js App Router and Pages Router
- 🤖 **GitHub Action** - Automated setup for new projects

## Installation

### Option 1: GitHub Action (Recommended)

Add this to your `.github/workflows/setup-error-logging.yml`:

\`\`\`yaml
name: Setup PR Error Logger
on:
  push:
    branches: [main]

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/pr-error-logger@v1
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
\`\`\`

### Option 2: Manual Installation

\`\`\`bash
npm install @your-org/pr-error-logger
\`\`\`

## Quick Start

### 1. Set up the API endpoint

Create `pages/api/log-error.ts` (or `app/api/log-error/route.ts` for App Router):

\`\`\`typescript
import { createApiHandler } from '@your-org/pr-error-logger/server';

export default createApiHandler();
\`\`\`

### 2. Initialize the client

In your `pages/_app.tsx`:

\`\`\`typescript
import { PRErrorLogger } from '@your-org/pr-error-logger/client';

// Initialize error logging
if (typeof window !== 'undefined') {
  new PRErrorLogger({
    enableConsoleCapture: true,
    enableErrorCapture: true,
    enableWarningCapture: true,
  });
}

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
\`\`\`

### 3. Configure environment variables

Add to your `.env.local`:

\`\`\`
GITHUB_TOKEN=your_github_token_here
VERCEL_GIT_REPO_OWNER=your-username
VERCEL_GIT_REPO_SLUG=your-repo-name
\`\`\`

## Usage Examples

### Basic Error Logging

\`\`\`typescript
import { PRErrorLogger } from '@your-org/pr-error-logger/client';

const logger = new PRErrorLogger();

// Manual logging
logger.manualLog('Custom error message', 'error', { userId: 123 });

// Automatic error capture is enabled by default
throw new Error('This will be automatically logged');
\`\`\`

### Advanced Configuration

\`\`\`typescript
import { PRErrorLogger } from '@your-org/pr-error-logger/client';

const logger = new PRErrorLogger({
  apiEndpoint: '/api/custom-error-handler',
  enableConsoleCapture: true,
  enableErrorCapture: true,
  enableWarningCapture: false,
  maxLogEntries: 50,
  debounceMs: 2000,
});
\`\`\`

### Server-side Usage

\`\`\`typescript
import { GitHubService } from '@your-org/pr-error-logger/server';

const github = new GitHubService(
  process.env.GITHUB_TOKEN!,
  'owner',
  'repository'
);

await github.postErrorComment(123, errorLogs);
\`\`\`

## API Reference

### PRErrorLogger

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiEndpoint` | string | `/api/log-error` | Endpoint for sending logs |
| `enableConsoleCapture` | boolean | `true` | Capture console.log/warn/error |
| `enableErrorCapture` | boolean | `true` | Capture window errors |
| `enableWarningCapture` | boolean | `true` | Capture console warnings |
| `maxLogEntries` | number | `100` | Maximum logs to buffer |
| `debounceMs` | number | `1000` | Debounce time for sending logs |

### Methods

- `manualLog(message, level, data?)` - Manually log a message
- `flush()` - Force send all buffered logs
- `destroy()` - Clean up event listeners

## How It Works

1. **Error Capture**: The client automatically captures browser errors, console logs, and device information
2. **PR Detection**: Uses Vercel environment variables to identify the PR number
3. **Batching**: Logs are batched and sent to your API endpoint with debouncing
4. **GitHub Integration**: Server processes logs and posts formatted comments to the relevant PR
5. **Update Logic**: Existing error comments are updated rather than creating new ones

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub token with repo access | Yes |
| `VERCEL_GIT_REPO_OWNER` | Repository owner | Auto-detected |
| `VERCEL_GIT_REPO_SLUG` | Repository name | Auto-detected |
| `VERCEL_URL` | Deployment URL | Auto-detected |
| `VERCEL_ENV` | Environment (preview/production) | Auto-detected |

## TypeScript Support

Full TypeScript definitions are included:

\`\`\`typescript
import type { 
  ErrorLogEntry, 
  DeviceInfo, 
  LoggerConfig 
} from '@your-org/pr-error-logger';
\`\`\`

## Contributing

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the package: `npm run build`
4. Run tests: `npm test`

## Publishing

1. Update version in `package.json`
2. Build: `npm run build`
3. Publish: `npm publish`
4. Create GitHub release with tag for Action usage

## License

MIT License - see [LICENSE](LICENSE) file for details.