import { getPrismaClient } from '../../utils/prisma'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  // 1. Verify user
  const token = getCookie(event, 'NoteApp')
  if (!token) throw createError({ statusCode: 401, message: "Unauthorized" })

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY)
    const userId = decoded.id
    const noteId = parseInt(event.context.params.id)

    const prisma = getPrismaClient()

    // 2. Delete the note. 
    // We use deleteMany to ensure we only delete if BOTH the note ID and User ID match, preventing hackers from deleting other people's notes!
    const result = await prisma.note.deleteMany({
      where: { 
        id: noteId,
        userId: userId
      }
    })

    if (result.count === 0) {
      throw createError({ statusCode: 404, message: "Note not found or unauthorized" })
    }

    return { success: true, message: "Note deleted successfully" }
    
  } catch (error) {
    console.error("Failed to delete note:", error)
    throw createError({ statusCode: 500, message: "Could not delete note" })
  }
})