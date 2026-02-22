import { getPrismaClient } from '../../utils/prisma'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  // 1. Verify the user is logged in securely
  const token = getCookie(event, 'NoteApp')
  if (!token) throw createError({ statusCode: 401, message: "Unauthorized" })

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY)
    const userId = decoded.id

    // 2. Grab the Note ID from the URL and the new text from the body
    const noteId = parseInt(event.context.params.id)
    const body = await readBody(event)

    const prisma = getPrismaClient()

    // 3. Update the note in PostgreSQL
    // We strictly check the userId so a hacker can't edit someone else's note!
    const updatedNote = await prisma.note.update({
      where: { 
        id: noteId,
        userId: userId 
      },
      data: {
        title: body.title,
        content: body.content
      }
    })

    return { 
      success: true, 
      note: updatedNote 
    }
  } catch (error) {
    console.error("Failed to save note:", error)
    throw createError({ statusCode: 500, message: "Could not save note" })
  }
})