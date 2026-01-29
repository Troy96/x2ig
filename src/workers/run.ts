// Worker runner script
// Run this separately from the main Next.js app: npx tsx src/workers/run.ts

import 'dotenv/config'

console.log('Worker process started')
console.log('Redis URL:', process.env.REDIS_URL ? 'Set (hidden)' : 'NOT SET!')
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden)' : 'NOT SET!')

// Handle uncaught errors to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

// Import scheduler after error handlers are set up
import('./scheduler').then(() => {
  console.log('Scheduler loaded successfully')
  console.log('Waiting for jobs...')

  // Keep-alive log every 5 minutes
  setInterval(() => {
    console.log('Worker still running...', new Date().toISOString())
  }, 5 * 60 * 1000)
}).catch((err) => {
  console.error('Failed to load scheduler:', err)
  process.exit(1)
})
