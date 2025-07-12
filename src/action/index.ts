import * as core from '@actions/core';
import * as github from '@actions/github';
import { promises as fs } from 'fs';
import { join } from 'path';

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token', { required: true });
    const repository = core.getInput('repository') || github.context.repo.repo;
    const owner = core.getInput('owner') || github.context.repo.owner;
    const setupPath = core.getInput('setup-path') || '.';

    core.info(`Setting up PR Error Logger for ${owner}/${repository}`);

    await setupApiEndpoint(setupPath);
    await setupClientInitialization(setupPath);
    await updateEnvironmentVariables(setupPath, githubToken, owner, repository);

    core.info('✅ PR Error Logger setup completed successfully!');
    core.setOutput('setup-complete', 'true');
    core.setOutput('api-endpoint', '/api/log-error');

  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function setupApiEndpoint(basePath: string): Promise<void> {
  const apiDir = join(basePath, 'pages', 'api');
  const apiFile = join(apiDir, 'log-error.ts');

  try {
    await fs.access(apiDir);
  } catch {
    await fs.mkdir(apiDir, { recursive: true });
  }

  const apiContent = `import { createApiHandler } from '@your-org/pr-error-logger/server';

export default createApiHandler();
`;

  await fs.writeFile(apiFile, apiContent);
  core.info(`Created API endpoint at ${apiFile}`);
}

async function setupClientInitialization(basePath: string): Promise<void> {
  const appJsPath = join(basePath, 'pages', '_app.tsx');
  const appTsPath = join(basePath, 'pages', '_app.ts');
  
  let appPath = appJsPath;
  let appExists = true;

  try {
    await fs.access(appJsPath);
  } catch {
    try {
      await fs.access(appTsPath);
      appPath = appTsPath;
    } catch {
      appExists = false;
    }
  }

  if (appExists) {
    const content = await fs.readFile(appPath, 'utf-8');
    
    if (!content.includes('PRErrorLogger')) {
      const updatedContent = addErrorLoggerToApp(content);
      await fs.writeFile(appPath, updatedContent);
      core.info(`Updated ${appPath} with error logger initialization`);
    } else {
      core.info(`${appPath} already has error logger setup`);
    }
  } else {
    const newAppContent = createNewAppFile();
    await fs.writeFile(appJsPath, newAppContent);
    core.info(`Created new ${appJsPath} with error logger`);
  }
}

function addErrorLoggerToApp(content: string): string {
  const imports = content.match(/^import.*$/gm) || [];
  const lastImportIndex = content.lastIndexOf(imports[imports.length - 1]) + imports[imports.length - 1].length;
  
  const errorLoggerImport = "import { PRErrorLogger } from '@your-org/pr-error-logger/client';";
  const errorLoggerInit = `
if (typeof window !== 'undefined') {
  new PRErrorLogger({
    enableConsoleCapture: true,
    enableErrorCapture: true,
    enableWarningCapture: true,
  });
}`;

  const beforeImports = content.substring(0, lastImportIndex);
  const afterImports = content.substring(lastImportIndex);
  
  return beforeImports + '\\n' + errorLoggerImport + errorLoggerInit + afterImports;
}

function createNewAppFile(): string {
  return `import type { AppProps } from 'next/app';
import { PRErrorLogger } from '@your-org/pr-error-logger/client';

if (typeof window !== 'undefined') {
  new PRErrorLogger({
    enableConsoleCapture: true,
    enableErrorCapture: true,
    enableWarningCapture: true,
  });
}

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
`;
}

async function updateEnvironmentVariables(basePath: string, githubToken: string, owner: string, repository: string): Promise<void> {
  const envLocalPath = join(basePath, '.env.local');
  
  let envContent = '';
  try {
    envContent = await fs.readFile(envLocalPath, 'utf-8');
  } catch {
    // File doesn't exist, will create new one
  }

  const envVars = [
    `GITHUB_TOKEN=${githubToken}`,
    `VERCEL_GIT_REPO_OWNER=${owner}`,
    `VERCEL_GIT_REPO_SLUG=${repository}`,
  ];

  let updatedContent = envContent;
  
  envVars.forEach(envVar => {
    const [key] = envVar.split('=');
    const regex = new RegExp(`^${key}=.*$`, 'm');
    
    if (regex.test(updatedContent)) {
      updatedContent = updatedContent.replace(regex, envVar);
    } else {
      updatedContent += `\\n${envVar}`;
    }
  });

  await fs.writeFile(envLocalPath, updatedContent.trim());
  core.info(`Updated environment variables in ${envLocalPath}`);
}

if (require.main === module) {
  run();
}

export { run };