import IORedis from 'ioredis'

import { config } from '../config.js'

export const redis = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})
