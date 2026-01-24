// Worker runner script
// Run this separately from the main Next.js app: npx tsx src/workers/run.ts

import 'dotenv/config'
import './scheduler'

console.log('Worker process started')
console.log('Redis URL:', process.env.REDIS_URL || 'redis://localhost:6379')
console.log('Waiting for jobs...')
