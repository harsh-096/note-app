import bcrypt from 'bcryptjs'
import { getPrismaClient } from '../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const prisma = getPrismaClient()

  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(body.password, salt)

  try {
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: passwordHash,
        salt: salt,
      },
    })

    return { success: true, user }
  } catch (error) {
    console.error('Registration error:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message,
    })
  }
})
