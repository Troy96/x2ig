/**
 * Instagram Token Refresh Worker
 *
 * Runs periodically to refresh Instagram access tokens before they expire.
 * Tokens are valid for 60 days, and we refresh them when they have less than 7 days remaining.
 *
 * Run this as a cron job: `0 0 * * *` (daily at midnight)
 */

import { PrismaClient } from '@prisma/client'
import { refreshAccessToken } from '../lib/instagram'

const prisma = new PrismaClient()

// Refresh tokens expiring within this many days
const REFRESH_THRESHOLD_DAYS = 7

async function refreshExpiringTokens() {
  console.log('Starting Instagram token refresh job...')

  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() + REFRESH_THRESHOLD_DAYS)

  // Find all accounts with tokens expiring soon
  const expiringAccounts = await prisma.instagramAccount.findMany({
    where: {
      tokenExpiresAt: {
        lte: thresholdDate,
      },
    },
    include: {
      user: {
        select: {
          email: true,
          xUsername: true,
        },
      },
    },
  })

  console.log(`Found ${expiringAccounts.length} accounts with expiring tokens`)

  let successCount = 0
  let failCount = 0

  for (const account of expiringAccounts) {
    try {
      console.log(`Refreshing token for @${account.username} (user: ${account.user.xUsername || account.userId})...`)

      // Check if token is already expired
      if (new Date() > account.tokenExpiresAt) {
        console.log(`  Token already expired for @${account.username}, skipping`)
        // Could send notification to user to reconnect
        failCount++
        continue
      }

      const result = await refreshAccessToken(account.accessToken)

      // Calculate new expiration date
      const newExpiresAt = new Date(Date.now() + result.expiresIn * 1000)

      // Update the account with new token
      await prisma.instagramAccount.update({
        where: { id: account.id },
        data: {
          accessToken: result.accessToken,
          tokenExpiresAt: newExpiresAt,
          updatedAt: new Date(),
        },
      })

      console.log(`  Successfully refreshed. New expiry: ${newExpiresAt.toISOString()}`)
      successCount++
    } catch (error) {
      console.error(`  Failed to refresh token for @${account.username}:`, error)
      failCount++

      // Create notification about failed refresh
      await prisma.notification.create({
        data: {
          userId: account.userId,
          type: 'REMINDER',
          title: 'Instagram Token Expiring',
          body: 'Your Instagram connection is expiring. Please reconnect in Settings.',
        },
      })
    }
  }

  console.log(`Token refresh complete. Success: ${successCount}, Failed: ${failCount}`)

  return { total: expiringAccounts.length, success: successCount, failed: failCount }
}

// Run if executed directly
if (require.main === module) {
  refreshExpiringTokens()
    .then((result) => {
      console.log('Job finished:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('Job failed:', error)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}

export { refreshExpiringTokens }
