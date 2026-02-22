<script setup>
import { ref, onMounted } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import Swal from 'sweetalert2' 

const deleteNote = async (id) => {
  // 1. Ask for confirmation with a dark-themed alert
  const { isConfirmed } = await Swal.fire({
    title: 'Delete Note?',
    text: "You won't be able to revert this!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444', // Red for delete
    cancelButtonColor: '#3f3f46',
    confirmButtonText: 'Yes, delete it',
    background: '#18181b', // Dark background to match your theme
    color: '#fff'
  })

  if (!isConfirmed) return

  try {
    // 2. Call the new DELETE API
    const response = await $fetch(`/api/notes/${id}`, { method: 'DELETE' })
    
    if (response.success) {
      // 3. Remove it from the sidebar array instantly
      notes.value = notes.value.filter(n => n.id !== id)

      // 4. If they deleted the note they were currently looking at...
      if (activeNoteId.value === id) {
        if (notes.value.length > 0) {
          // Open the next available note
          await selectNote(notes.value[0].id)
        } else {
          // Or clear the screen if they have no notes left
          activeNoteId.value = null
          activeNoteTitle.value = ''
          rawMarkdown.value = ''
        }
      }
    }
  } catch (error) {
    console.error('Failed to delete note:', error)
  }
}

definePageMeta({
  middleware: ['auth'],
})

// Application State
const notes = ref([])
const activeNoteId = ref(null)
const activeNoteTitle = ref('Untitled Note')
const rawMarkdown = ref('')
const isSaving = ref(false)

// --- API CALLS ---
const fetchNotes = async () => {
  try {
    const response = await $fetch('/api/notes')
    if (response.success) {
      notes.value = response.notes
      if (notes.value.length > 0) {
        await selectNote(notes.value[0].id)
      }
    }
  } catch (error) {
    console.error('Error fetching notes:', error)
  }
}

const selectNote = async (id) => {
  activeNoteId.value = id
  try {
    const response = await $fetch(`/api/notes/${id}`)
    if (response.success) {
      rawMarkdown.value = response.note.content
      activeNoteTitle.value = response.note.title
    }
  } catch (error) {
    console.error('Failed to load note', error)
  }
}

const createNewNote = async () => {
  try {
    const response = await $fetch('/api/notes/create', { method: 'POST' })
    if (response.success) {
      notes.value.unshift(response.note)
      activeNoteId.value = response.note.id
      rawMarkdown.value = response.note.content 
      activeNoteTitle.value = response.note.title
    }
  } catch (error) {
    console.error('Error creating note:', error)
  }
}

const saveNote = async () => {
  if (!activeNoteId.value) return
  isSaving.value = true
  try {
    const response = await $fetch(`/api/notes/${activeNoteId.value}`, {
      method: 'PUT',
      body: { title: activeNoteTitle.value, content: rawMarkdown.value }
    })
    
    if (response.success) {
      const noteIndex = notes.value.findIndex(n => n.id === activeNoteId.value)
      if (noteIndex !== -1) {
        notes.value[noteIndex].title = activeNoteTitle.value
        notes.value[noteIndex].updatedAt = new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Failed to save note:', error)
  } finally {
    isSaving.value = false
  }
}

const handleLogout = async () => {
  await $fetch('/api/logout', { method: 'POST' })
  await navigateTo('/login')
}

onMounted(() => {
  fetchNotes()
})
</script>

<template>
  <div class="relative h-screen w-full overflow-hidden bg-[#0A0E13] text-zinc-200 flex flex-col">
    <div class="absolute inset-0 z-0 pointer-events-none">
      <div class="absolute -left-16 bottom-0 h-80 w-80 rounded-full bg-purple-400/18 blur-3xl"></div>
      <div class="absolute right-10 top-10 h-60 w-60 rounded-full bg-purple-300/12 blur-3xl"></div>
      <div class="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/5 to-transparent"></div>
    </div>

    <header class="relative z-10 h-16 border-b border-white/10 bg-zinc-950/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0 shadow-lg">
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30">
          <div class="h-3 w-3 rounded-full bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]"></div>
        </div>
        <span class="text-sm font-bold tracking-widest uppercase text-white">Note<span class="text-purple-400"> App</span></span>
      </div>
      
      <div class="flex items-center gap-6">
        <span class="text-xs tracking-widest text-zinc-500 uppercase hidden sm:block">Workspace</span>
        <div class="h-4 w-px bg-white/10 hidden sm:block"></div>
        
        <button 
          @click="saveNote" 
          :disabled="!activeNoteId || isSaving"
          class="text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-50"
          :class="isSaving ? 'text-zinc-500' : 'text-purple-400 hover:text-purple-300'"
        >
          {{ isSaving ? 'Saving...' : 'Save Note' }}
        </button>
        
        <div class="h-4 w-px bg-white/10"></div>
        <button @click="handleLogout" class="text-xs font-medium text-zinc-400 hover:text-white transition-colors">Log out</button>
      </div>
    </header>

    <div class="relative z-10 flex-1 overflow-hidden p-4 md:p-6 flex flex-col">
  <div class="flex-1 w-full rounded-3xl border border-white/10 bg-zinc-950/40 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl overflow-hidden flex flex-col">
    
    <Splitpanes class="flex-1 h-full w-full custom-splitpanes">
          
          <Pane min-size="15" size="20" max-size="30" class="border-r border-white/10">
            <Sidebar 
              :notes="notes" 
              :activeNoteId="activeNoteId" 
              @selectNote="selectNote" 
              @createNote="createNewNote"
              @deleteNote="deleteNote"
            />
          </Pane>

          <Pane min-size="20" size="40">
            <Editor 
              v-model:title="activeNoteTitle" 
              v-model:content="rawMarkdown" 
            />
          </Pane>

          <Pane min-size="20" size="40" class="border-l border-white/10">
            <Preview :rawMarkdown="rawMarkdown" />
          </Pane>

        </Splitpanes>
      </div>
    </div>
  </div>
</template>

<style>
/* KEEP YOUR SPLITPANES AND SCROLLBAR CSS EXACTLY AS IT WAS HERE */
.splitpanes{ 
  background-color: transparent !important; 
}
.splitpanes.custom-splitpanes {
  height: 100% !important;
  display: flex !important;
}
/* Ensure panes don't collapse or expand weirdly */
.custom-splitpanes .splitpanes__pane {
  background-color: transparent !important;
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
}
.splitpanes__pane { 
  background-color: transparent !important; 
}
.custom-splitpanes .splitpanes__splitter { 
  background-color: rgba(255, 255, 255, 0.02) !important; 
  border-left: 1px solid rgba(255, 255, 255, 0.05); 
  border-right: 1px solid rgba(255, 255, 255, 0.05); 
  width: 4px !important; 
  transition: all 0.3s ease; 
  position: relative; 
  z-index: 10; 
}
.custom-splitpanes .splitpanes__splitter:hover, .custom-splitpanes .splitpanes__splitter:active { 
  background-color: rgba(168, 85, 247, 0.5) !important; 
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); 
  width: 6px !important; 
}
.custom-splitpanes .splitpanes__splitter::before { 
  content: ''; 
  position: absolute; 
  top: 50%; 
  left: 50%; 
  transform: translate(-50%, -50%); 
  height: 30px; 
  width: 2px; 
  background-color: rgba(255, 255, 255, 0.1); 
  border-radius: 4px; 
  transition: background-color 0.3s; 
}
.custom-splitpanes .splitpanes__splitter:hover::before { 
  background-color: rgba(255, 255, 255, 0.8); 
}
::-webkit-scrollbar { 
  width: 8px; 
  height: 8px; 
}
::-webkit-scrollbar-track { 
  background: transparent; 
}
::-webkit-scrollbar-thumb { 
  background-color: rgba(255, 255, 255, 0.1); 
  border-radius: 10px; 
  transition: background-color 0.3s; 
}
::-webkit-scrollbar-thumb:hover { 
  background-color: rgba(168, 85, 247, 0.5); 
}
* { 
  scrollbar-width: thin; 
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent; 
  }
</style>