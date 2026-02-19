import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

let prismaClient

export function getPrismaClient() {
  if (prismaClient) {
    return prismaClient
  }

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured')
  }

  const adapter = new PrismaPg(new Pool({ connectionString }))
  prismaClient = new PrismaClient({ adapter })

  return prismaClient
}
