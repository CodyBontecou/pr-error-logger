export interface ErrorLogEntry {
  message: string;
  stack?: string;
  level: 'error' | 'warn' | 'info' | 'log';
  timestamp: string;
  url: string;
  userAgent: string;
  deviceInfo: DeviceInfo;
  prNumber?: number;
  deploymentUrl?: string;
  vercelEnv?: string;
}

export interface DeviceInfo {
  platform: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  screen: {
    width: number;
    height: number;
  };
  language: string;
  timezone: string;
  cookieEnabled: boolean;
  onlineStatus: boolean;
}

export interface GitHubPRComment {
  prNumber: number;
  repository: string;
  owner: string;
  body: string;
}

export interface VercelDeployment {
  url: string;
  env: string;
  prNumber?: number;
  commitSha?: string;
}

export interface LoggerConfig {
  githubToken?: string;
  repository?: string;
  owner?: string;
  apiEndpoint?: string;
  enableConsoleCapture?: boolean;
  enableErrorCapture?: boolean;
  enableWarningCapture?: boolean;
  maxLogEntries?: number;
  debounceMs?: number;
}

export interface GitHubActionInputs {
  githubToken: string;
  repository?: string;
  owner?: string;
  setupPath?: string;
}