"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
};
class ConsoleTransport {
    write(entry) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
}
class Logger {
    constructor(config) {
        var _a, _b;
        this.config = Object.assign(Object.assign({}, config), { formatter: (_a = config.formatter) !== null && _a !== void 0 ? _a : this.defaultFormatter, filters: (_b = config.filters) !== null && _b !== void 0 ? _b : [] });
    }
    defaultFormatter(entry) {
        const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
        const error = entry.error ? ` ${entry.error.stack}` : '';
        return `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}${context}${error}`;
    }
    shouldLog(level) {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
    }
    writeToTransports(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            const formattedEntry = Object.assign(Object.assign({}, entry), { message: this.config.formatter(entry) });
            if (!this.config.filters.every(filter => filter(formattedEntry))) {
                return;
            }
            const writePromises = this.config.transports.map((transport) => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield transport.write(formattedEntry);
                }
                catch (error) {
                    console.error(`Transport error: ${error}`);
                }
            }));
            yield Promise.all(writePromises);
        });
    }
    log(level, message, context, error) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.shouldLog(level)) {
                return;
            }
            const entry = {
                level,
                message,
                timestamp: new Date(),
                context: Object.assign(Object.assign({}, this.config.defaultContext), context),
                error,
                tags: [],
                source: 'application'
            };
            yield this.writeToTransports(entry);
        });
    }
    debug(message, context) {
        return this.log('debug', message, context);
    }
    info(message, context) {
        return this.log('info', message, context);
    }
    warn(message, context) {
        return this.log('warn', message, context);
    }
    error(message, error, context) {
        return this.log('error', message, context, error);
    }
    fatal(message, error, context) {
        return this.log('fatal', message, context, error);
    }
    child(defaultContext) {
        return new Logger(Object.assign(Object.assign({}, this.config), { defaultContext: Object.assign(Object.assign({}, this.config.defaultContext), defaultContext) }));
    }
    addTransport(transport) {
        this.config.transports.push(transport);
    }
    removeTransport(transport) {
        this.config.transports = this.config.transports.filter(t => t !== transport);
    }
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            const shutdownPromises = this.config.transports
                .filter(transport => transport.shutdown)
                .map(transport => transport.shutdown());
            yield Promise.all(shutdownPromises);
        });
    }
}
// Example usage
function example() {
    return __awaiter(this, void 0, void 0, function* () {
        const logger = new Logger({
            minLevel: 'info',
            transports: [new ConsoleTransport()],
            defaultContext: { app: 'MyApp' },
            filters: [
                (entry) => !entry.message.includes('password') // Filter out sensitive data
            ]
        });
        yield logger.info('Application started', { version: '1.0.0' });
        const userLogger = logger.child({ userId: '123' });
        yield userLogger.error('Failed to save', new Error('Database error'));
        yield logger.shutdown();
    });
}
example().catch(console.error);
function example2() {
    return __awaiter(this, void 0, void 0, function* () {
        const logger = new Logger({
            minLevel: 'info', // Logs everything from info and above
            transports: [new ConsoleTransport()],
            defaultContext: { app: 'MyApp' },
            filters: [
                (entry) => !entry.message.includes('password') // Filter out sensitive data
            ]
        });
        // Log an informational message
        yield logger.info('Application started', { version: '1.0.0' });
        // Add a debug message to verify if the level is honored
        yield logger.debug('This is a debug message', { environment: 'dev' }); // Should not print
        // Log an error message with an error object
        const userLogger = logger.child({ userId: '123' });
        yield userLogger.error('Failed to save', new Error('Database error'));
        // Flush all logs and gracefully shutdown
        yield logger.shutdown();
    });
}
example2().catch(console.error);
