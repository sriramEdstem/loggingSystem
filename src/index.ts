type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export const LoggerLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
};
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
  tags?: string[];
  source?: string;
}

interface LogTransport {
  write(entry: LogEntry): Promise<void>;
  flush?(): Promise<void>;
  shutdown?(): Promise<void>;
}

interface LoggerConfig {
  minLevel: LogLevel;
  transports: LogTransport[];
  defaultContext?: Record<string, unknown>;
  formatter?: (entry: LogEntry) => string;
  filters?: Array<(entry: LogEntry) => boolean>;
}

class Logger {
  config: LoggerConfig;
  constructor(config: LoggerConfig) {
    this.config = config;
  }

  async log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    const fullMessage = `${message}`;
    let consoleFunction = console.error;
    if (level === "debug") {
      consoleFunction = console.debug;
    } else if (level === "info") {
      consoleFunction = console.info;
    } else if (level === "warn") {
      consoleFunction = console.warn;
    }
    consoleFunction.call(console, fullMessage);
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
    };
    for (const transport of this.config.transports) {
      transport.write(entry);
    }
  }
  debug(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log("debug", message, context);
  }
  info(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log("info", message, context);
  }
  warn(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log("warn", message, context);
  }
  error(
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    return this.log("error", message, context);
  }

  child(defaultContexts: Record<string, unknown>): Logger {
    return new Logger({
      ...this.config,
      defaultContext: { ...this.config.defaultContext, ...defaultContexts },
    });
  }

  addTransport(transport: LogTransport): void {
    this.config.transports.push(transport);
  }
  removeTransport(transport: LogTransport): void {
    this.config.transports = this.config.transports.filter(
      (item) => item !== transport
    );
  }
}
