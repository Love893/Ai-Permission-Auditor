// utils/logger.js
const format = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta) : ''
  }`;
};

export const logger = {
  info: (msg, meta) => console.log(format('INFO', msg, meta)),
  warn: (msg, meta) => console.warn(format('WARN', msg, meta)),
  error: (msg, meta) => console.error(format('ERROR', msg, meta)),
  debug: (msg, meta) => {
    if (process.env.FORGE_DEBUG === 'true') {
      console.log(format('DEBUG', msg, meta));
    }
  },
};