export async function register() {
  console.log('=== APP STARTING ===')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
  console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL)

  process.on('SIGTERM', () => {
    console.log('=== RECEIVED SIGTERM ===')
  })

  process.on('SIGINT', () => {
    console.log('=== RECEIVED SIGINT ===')
  })

  process.on('exit', (code) => {
    console.log('=== PROCESS EXIT WITH CODE:', code, '===')
  })

  process.on('uncaughtException', (err) => {
    console.log('=== UNCAUGHT EXCEPTION ===', err)
  })

  process.on('unhandledRejection', (reason) => {
    console.log('=== UNHANDLED REJECTION ===', reason)
  })
}
