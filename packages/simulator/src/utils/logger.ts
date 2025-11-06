/**
 * Logger Utility
 * Colored console logging with different levels
 */

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevel = levels.indexOf(this.level);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= currentLevel;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.log(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.log(chalk.red(`[ERROR] ${message}`), ...args);
    }
  }

  // Request/Response logging
  request(method: string, url: string, body?: any): void {
    if (this.shouldLog('debug')) {
      console.log(chalk.cyan(`→ ${method} ${url}`));
      if (body) {
        console.log(chalk.gray(JSON.stringify(body, null, 2)));
      }
    }
  }

  response(status: number, data?: any): void {
    if (this.shouldLog('debug')) {
      const color = status >= 200 && status < 300 ? chalk.green : chalk.red;
      console.log(color(`← ${status}`));
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  // Section headers
  section(title: string): void {
    console.log('\n' + chalk.bold.cyan(`=== ${title} ===`) + '\n');
  }

  // Key-value output
  kv(key: string, value: any): void {
    console.log(chalk.bold(key + ':'), chalk.white(value));
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

// Export singleton logger
export const logger = new Logger('debug');
