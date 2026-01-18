/* eslint-disable no-console */
// Logger utility to centralize console usage and allow proper linting control

type LoggableValue = string | number | boolean | object | Error | null | undefined;

export const logger = {
  info: (message: string, ...args: LoggableValue[]): void => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  
  error: (message: string, ...args: LoggableValue[]): void => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: LoggableValue[]): void => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: LoggableValue[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};