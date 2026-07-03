import logger from "./logger.js";

const memoryStore = new Map();
const timeouts = new Map();

export const cacheGet = async (key) => {
  if (memoryStore.has(key)) {
    logger.info(`[CACHE] Hit for key: ${key}`);
    return memoryStore.get(key);
  }
  logger.info(`[CACHE] Miss for key: ${key}`);
  return null;
};

export const cacheSet = async (key, value, ttlSeconds = 3600) => {
  // Clear any existing timeout for this key
  if (timeouts.has(key)) {
    clearTimeout(timeouts.get(key));
  }

  memoryStore.set(key, value);
  logger.info(`[CACHE] Set key: ${key} with TTL: ${ttlSeconds}s`);

  const timeoutId = setTimeout(() => {
    memoryStore.delete(key);
    timeouts.delete(key);
    logger.info(`[CACHE] Expired key: ${key}`);
  }, ttlSeconds * 1000);

  // Unref the timeout so it doesn't block node process exit in tests
  if (timeoutId.unref) {
    timeoutId.unref();
  }
  
  timeouts.set(key, timeoutId);
  return true;
};

export const cacheDelete = async (key) => {
  if (timeouts.has(key)) {
    clearTimeout(timeouts.get(key));
    timeouts.delete(key);
  }
  const deleted = memoryStore.delete(key);
  logger.info(`[CACHE] Delete key: ${key} (Result: ${deleted})`);
  return deleted;
};
