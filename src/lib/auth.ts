import { NextAuthOptions } from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import type { Adapter } from 'next-auth/adapters'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
      authorization: {
        params: {
          scope: 'users.read tweet.read offline.access',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        // Fetch X username from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { xUsername: true, xUserId: true },
        })
        if (dbUser) {
          session.user.xUsername = dbUser.xUsername
          session.user.xUserId = dbUser.xUserId

          // If xUserId is missing, get it from Account table
          if (!dbUser.xUserId) {
            const account = await prisma.account.findFirst({
              where: { userId: user.id, provider: 'twitter' },
              select: { providerAccountId: true },
            })
            if (account) {
              session.user.xUserId = account.providerAccountId
              // Update user record for future
              await prisma.user.update({
                where: { id: user.id },
                data: { xUserId: account.providerAccountId },
              })
            }
          }
        }
      }
      return session
    },
    async signIn() {
      return true
    },
  },
  events: {
    async linkAccount({ user, account, profile }) {
      if (account.provider === 'twitter' && profile) {
        const twitterProfile = profile as { data?: { username?: string; id?: string } }
        const username = twitterProfile.data?.username
        const twitterUserId = twitterProfile.data?.id || account.providerAccountId

        if (username) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              xUsername: username,
              xUserId: twitterUserId,
            },
          })
        }
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
  },
  cookies: {
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
    state: {
      name: 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
