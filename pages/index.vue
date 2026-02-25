<script setup>
import { ref, computed, onMounted } from 'vue'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import Swal from 'sweetalert2'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// --- CONFIGURATION ---
marked.use({
  gfm: true,
  breaks: true 
})

definePageMeta({
  middleware: ['auth'],
})

// --- STATE ---
const notes = ref([])
const activeNoteId = ref(null)
const activeNoteTitle = ref('Untitled Note')
const rawMarkdown = ref('')
const isSaving = ref(false)

// --- COMPUTED (Originally from Preview.vue) ---
const compiledMarkdown = computed(() => {
  if (!rawMarkdown.value) return ''
  
  try {
    // Split by code blocks to avoid processing newlines inside code
    const textParts = rawMarkdown.value.split(/(```[\s\S]*?```)/g)
    const processedText = textParts.map((part, index) => {
      if (index % 2 === 0) {
        // Replace triple newlines with breaks in regular text
        return part.replace(/\n{3,}/g, (match) => {
          return '\n\n' + '<br>\n\n'.repeat(match.length - 2)
        })
      }
      return part
    }).join('')

    const rawHtml = marked.parse(processedText)
    
    // SAFEGUARD: Only run DOMPurify on the client side
    if (process.client) {
      return DOMPurify.sanitize(rawHtml)
    }
    return ''
    
  } catch (error) {
    console.error("Markdown parsing error:", error)
    return '<p class="text-red-400">Error loading preview.</p>'
  }
})

// --- UTILITIES (Originally from Sidebar.vue) ---
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

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

const deleteNote = async (id) => {
  // Ask for confirmation
  const { isConfirmed } = await Swal.fire({
    title: 'Delete Note?',
    text: "You won't be able to revert this!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#3f3f46',
    confirmButtonText: 'Yes, delete it',
    background: '#18181b',
    color: '#fff'
  })

  if (!isConfirmed) return

  try {
    const response = await $fetch(`/api/notes/${id}`, { method: 'DELETE' })
    
    if (response.success) {
      notes.value = notes.value.filter(n => n.id !== id)
      if (activeNoteId.value === id) {
        if (notes.value.length > 0) {
          await selectNote(notes.value[0].id)
        } else {
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
            <div class="flex flex-col h-full min-h-0 bg-black/40">
              <div class="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
                <span class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Your Notes</span>
                <button @click="createNewNote" class="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 border border-white/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all">
                  +
                </button>
              </div>
              
              <div class="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                <div 
                  v-for="note in notes" :key="note.id"
                  @click="selectNote(note.id)"
                  :class="[
                    'p-4 rounded-2xl cursor-pointer transition-all duration-300 border relative overflow-hidden group',
                    activeNoteId === note.id 
                      ? 'bg-purple-500/10 border-purple-500/30 text-white shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]' 
                      : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 hover:border-white/10'
                  ]"
                >
                  <div v-if="activeNoteId === note.id" class="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                  
                  <div class="flex justify-between items-start gap-2">
                    <div class="overflow-hidden flex-1">
                      <p class="text-sm font-semibold truncate">{{ note.title }}</p>
                      <p class="text-[10px] text-zinc-600 mt-2 font-mono">{{ formatDate(note.updatedAt) }}</p>
                    </div>

                    <button 
                      @click.stop="deleteNote(note.id)"
                      class="text-zinc-500 hover:text-red-400 transition-all p-1 -mr-1 -mt-1"
                      title="Delete Note"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Pane>

          <Pane min-size="20" size="40">
            <div class="flex flex-col h-full min-h-0 bg-transparent">
              <div class="px-5 py-3 border-b border-white/5 bg-black/20 shrink-0 flex items-center">
                <input 
                  v-model="activeNoteTitle"
                  class="bg-transparent text-xs font-mono tracking-widest text-zinc-200 outline-none w-full focus:text-white transition-colors placeholder:text-zinc-500"
                  placeholder="name your note"
                />
              </div>
              <textarea
                v-model="rawMarkdown"
                class="flex-1 min-h-0 w-full h-full resize-none bg-transparent p-6 text-sm text-zinc-300 outline-none leading-relaxed placeholder:text-zinc-700 font-mono focus:ring-0"
                placeholder="Start typing your markdown here..."
              ></textarea>
            </div>
          </Pane>

          <Pane min-size="20" size="40" class="border-l border-white/10">
            <div class="flex flex-col h-full min-h-0 bg-zinc-900/20">
              <div class="px-5 py-3 border-b border-white/5 bg-black/20 text-xs font-mono uppercase tracking-widest text-zinc-300 shrink-0">
                Live Preview
              </div>
              <ClientOnly>
                <div 
                  class="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 prose prose-invert prose-purple max-w-none leading-snug prose-p:my-2 prose-headings:font-semibold prose-headings:mt-5 prose-headings:mb-2 prose-ul:my-2 prose-li:my-0 prose-pre:my-3 prose-pre:px-4 prose-pre:py-3 prose-blockquote:my-3 prose-blockquote:border-purple-500 prose-blockquote:bg-purple-500/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-a:text-purple-400 prose-hr:my-4"
                  v-html="compiledMarkdown"
                ></div>
                <template #fallback>
                  <div class="flex-1 min-h-0 p-8 text-sm text-zinc-500 font-mono animate-pulse">
                    Loading preview...
                  </div>
                </template>
              </ClientOnly>
            </div>
          </Pane>

        </Splitpanes>
      </div>
    </div>
  </div>
</template>

<style>
/* Splitpanes Global Overrides */
.splitpanes { background-color: transparent !important; }
.splitpanes.custom-splitpanes { height: 100% !important; display: flex !important; }
.custom-splitpanes .splitpanes__pane { background-color: transparent !important; display: flex !important; flex-direction: column !important; height: 100% !important; }
.splitpanes__pane { background-color: transparent !important; }
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
.custom-splitpanes .splitpanes__splitter:hover::before { background-color: rgba(255, 255, 255, 0.8); }

/* Scrollbar Styling */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; transition: background-color 0.3s; }
::-webkit-scrollbar-thumb:hover { background-color: rgba(168, 85, 247, 0.5); }
* { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.1) transparent; }
</style>