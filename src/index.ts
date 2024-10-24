type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
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

class ConsoleTransport implements LogTransport {
    async write(entry: LogEntry): Promise<void> {
        const message = `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`;
        
        switch (entry.level) {
            case 'debug':
                console.debug(message, entry.context);
                break;
            case 'info':
                console.info(message, entry.context);
                break;
            case 'warn':
                console.warn(message, entry.context);
                break;
            case 'error':
            case 'fatal':
                console.error(message, entry.error, entry.context);
                break;
        }
    }
}

class Logger {
    private readonly config: LoggerConfig;

    constructor(config: LoggerConfig) {
        this.config = {
            ...config,
            formatter: config.formatter ?? this.defaultFormatter,
            filters: config.filters ?? []
        };
    }

    private defaultFormatter(entry: LogEntry): string {
        const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
        const error = entry.error ? ` ${entry.error.stack}` : '';
        return `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}${context}${error}`;
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
    }

    private async writeToTransports(entry: LogEntry): Promise<void> {
        const formattedEntry = {
            ...entry,
            message: this.config.formatter!(entry)
        };

        if (!this.config.filters!.every(filter => filter(formattedEntry))) {
            return;
        }

        const writePromises = this.config.transports.map(async transport => {
            try {
                await transport.write(formattedEntry);
            } catch (error) {
                console.error(`Transport error: ${error}`);
            }
        });

        await Promise.all(writePromises);
    }

    async log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): Promise<void> {
        if (!this.shouldLog(level)) {
            return;
        }

        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date(),
            context: {
                ...this.config.defaultContext,
                ...context
            },
            error,
            tags: [],
            source: 'application'
        };

        await this.writeToTransports(entry);
    }

    debug(message: string, context?: Record<string, unknown>): Promise<void> {
        return this.log('debug', message, context);
    }

    info(message: string, context?: Record<string, unknown>): Promise<void> {
        return this.log('info', message, context);
    }

    warn(message: string, context?: Record<string, unknown>): Promise<void> {
        return this.log('warn', message, context);
    }

    error(message: string, error?: Error, context?: Record<string, unknown>): Promise<void> {
        return this.log('error', message, context, error);
    }

    fatal(message: string, error?: Error, context?: Record<string, unknown>): Promise<void> {
        return this.log('fatal', message, context, error);
    }

    child(defaultContext: Record<string, unknown>): Logger {
        return new Logger({
            ...this.config,
            defaultContext: {
                ...this.config.defaultContext,
                ...defaultContext
            }
        });
    }

    addTransport(transport: LogTransport): void {
        this.config.transports.push(transport);
    }

    removeTransport(transport: LogTransport): void {
        this.config.transports = this.config.transports.filter(t => t !== transport);
    }

    async shutdown(): Promise<void> {
        const shutdownPromises = this.config.transports
            .filter(transport => transport.shutdown)
            .map(transport => transport.shutdown!());
        
        await Promise.all(shutdownPromises);
    }
}

// Example usage
async function example() {
    const logger = new Logger({
        minLevel: 'info',
        transports: [new ConsoleTransport()],
        defaultContext: { app: 'MyApp' },
        filters: [
            (entry) => !entry.message.includes('password') // Filter out sensitive data
        ]
    });

    await logger.info('Application started', { version: '1.0.0' });
    
    const userLogger = logger.child({ userId: '123' });
    await userLogger.error('Failed to save', new Error('Database error'));

    await logger.shutdown();
}

example().catch(console.error);

async function example2() {
  const logger = new Logger({
      minLevel: 'info', // Logs everything from info and above
      transports: [new ConsoleTransport()],
      defaultContext: { app: 'MyApp' },
      filters: [
          (entry) => !entry.message.includes('password') // Filter out sensitive data
      ]
  });

  // Log an informational message
  await logger.info('Application started', { version: '1.0.0' });

  // Add a debug message to verify if the level is honored
  await logger.debug('This is a debug message', { environment: 'dev' }); // Should not print

  // Log an error message with an error object
  const userLogger = logger.child({ userId: '123' });
  await userLogger.error('Failed to save', new Error('Database error'));

  // Flush all logs and gracefully shutdown
  await logger.shutdown();
}
example2().catch(console.error);
