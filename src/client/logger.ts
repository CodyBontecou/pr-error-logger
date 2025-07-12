import { ErrorLogEntry, DeviceInfo, LoggerConfig } from '../types';

export class PRErrorLogger {
  private config: Required<LoggerConfig>;
  private logBuffer: ErrorLogEntry[] = [];
  private originalConsole: {
    error: typeof console.error;
    warn: typeof console.warn;
    log: typeof console.log;
    info: typeof console.info;
  };
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      githubToken: config.githubToken || '',
      repository: config.repository || this.getRepositoryFromEnv(),
      owner: config.owner || this.getOwnerFromEnv(),
      apiEndpoint: config.apiEndpoint || '/api/log-error',
      enableConsoleCapture: config.enableConsoleCapture ?? true,
      enableErrorCapture: config.enableErrorCapture ?? true,
      enableWarningCapture: config.enableWarningCapture ?? true,
      maxLogEntries: config.maxLogEntries || 100,
      debounceMs: config.debounceMs || 1000,
    };

    this.originalConsole = {
      error: console.error,
      warn: console.warn,
      log: console.log,
      info: console.info,
    };

    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    this.setupErrorHandlers();
    this.setupConsoleInterception();
  }

  private setupErrorHandlers(): void {
    if (!this.config.enableErrorCapture) return;

    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        stack: event.error?.stack,
        level: 'error',
        url: event.filename || window.location.href,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        level: 'error',
        url: window.location.href,
      });
    });
  }

  private setupConsoleInterception(): void {
    if (!this.config.enableConsoleCapture) return;

    console.error = (...args: unknown[]): void => {
      this.originalConsole.error(...args);
      this.logError({
        message: this.formatConsoleArgs(args),
        level: 'error',
        url: window.location.href,
      });
    };

    console.warn = (...args: unknown[]): void => {
      this.originalConsole.warn(...args);
      if (this.config.enableWarningCapture) {
        this.logError({
          message: this.formatConsoleArgs(args),
          level: 'warn',
          url: window.location.href,
        });
      }
    };

    console.info = (...args: unknown[]): void => {
      this.originalConsole.info(...args);
      this.logError({
        message: this.formatConsoleArgs(args),
        level: 'info',
        url: window.location.href,
      });
    };

    console.log = (...args: unknown[]): void => {
      this.originalConsole.log(...args);
      this.logError({
        message: this.formatConsoleArgs(args),
        level: 'log',
        url: window.location.href,
      });
    };
  }

  private formatConsoleArgs(args: unknown[]): string {
    return args
      .map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return `${arg.message}\n${arg.stack}`;
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      })
      .join(' ');
  }

  private logError(partial: Omit<ErrorLogEntry, 'timestamp' | 'userAgent' | 'deviceInfo' | 'prNumber' | 'deploymentUrl' | 'vercelEnv'>): void {
    const entry: ErrorLogEntry = {
      ...partial,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      deviceInfo: this.getDeviceInfo(),
      prNumber: this.getPRNumber(),
      deploymentUrl: this.getDeploymentUrl(),
      vercelEnv: this.getVercelEnv(),
    };

    this.logBuffer.push(entry);

    if (this.logBuffer.length > this.config.maxLogEntries) {
      this.logBuffer.shift();
    }

    this.debouncedSend();
  }

  private debouncedSend(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.sendLogs();
    }, this.config.debounceMs);
  }

  private async sendLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          config: {
            repository: this.config.repository,
            owner: this.config.owner,
          },
        }),
      });
    } catch (error) {
      this.originalConsole.error('Failed to send error logs:', error);
      this.logBuffer.unshift(...logsToSend);
    }
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      screen: {
        width: screen.width,
        height: screen.height,
      },
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: navigator.cookieEnabled,
      onlineStatus: navigator.onLine,
    };
  }

  private getPRNumber(): number | undefined {
    const vercelUrl = process.env.VERCEL_URL || window.location.href;
    const prMatch = vercelUrl.match(/pr-(\d+)/);
    return prMatch ? parseInt(prMatch[1], 10) : undefined;
  }

  private getDeploymentUrl(): string | undefined {
    return process.env.VERCEL_URL || window.location.href;
  }

  private getVercelEnv(): string | undefined {
    return process.env.VERCEL_ENV;
  }

  private getRepositoryFromEnv(): string {
    return process.env.VERCEL_GIT_REPO_SLUG || '';
  }

  private getOwnerFromEnv(): string {
    return process.env.VERCEL_GIT_REPO_OWNER || '';
  }

  public manualLog(message: string, level: ErrorLogEntry['level'] = 'info', additionalData?: Record<string, unknown>): void {
    this.logError({
      message: `${message}${additionalData ? `\n${JSON.stringify(additionalData, null, 2)}` : ''}`,
      level,
      url: window.location.href,
    });
  }

  public flush(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    return this.sendLogs();
  }

  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
  }
}