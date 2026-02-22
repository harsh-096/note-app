<script setup>
defineProps({
  notes: Array,
  activeNoteId: Number
})

defineEmits(['selectNote', 'createNote'])

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="flex flex-col h-full bg-black/40">
    <div class="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
      <span class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Your Notes</span>
      <button @click="$emit('createNote')" class="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 border border-white/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all">
        +
      </button>
    </div>
    
    <div class="flex-1 overflow-y-auto p-3 space-y-2">
      <div 
        v-for="note in notes" :key="note.id"
        @click="$emit('selectNote', note.id)"
        :class="[
          'p-4 rounded-2xl cursor-pointer transition-all duration-300 border relative overflow-hidden group',
          activeNoteId === note.id 
            ? 'bg-purple-500/10 border-purple-500/30 text-white shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]' 
            : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 hover:border-white/10'
        ]"
      >
        <div v-if="activeNoteId === note.id" class="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
        <p class="text-sm font-semibold truncate">{{ note.title }}</p>
        <p class="text-[10px] text-zinc-600 mt-2 font-mono">{{ formatDate(note.updatedAt) }}</p>
      </div>
    </div>
  </div>
</template>