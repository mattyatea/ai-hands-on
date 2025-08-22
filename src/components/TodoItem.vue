<template>
  <div class="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
    <input
      type="checkbox"
      :checked="todo.completed"
      @change="$emit('toggle')"
      class="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
    
    <div v-if="!editing" class="flex-1">
      <span 
        :class="{ 'line-through text-gray-400': todo.completed }"
        @dblclick="startEdit"
        class="cursor-pointer"
      >
        {{ todo.title }}
      </span>
    </div>
    
    <input
      v-else
      v-model="editTitle"
      @keyup.enter="saveEdit"
      @keyup.esc="cancelEdit"
      @blur="saveEdit"
      class="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      ref="editInput"
    />
    
    <button
      @click="$emit('delete')"
      class="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
    >
      削除
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { Todo } from '@/services/database'

const props = defineProps<{
  todo: Todo
}>()

const emit = defineEmits<{
  toggle: []
  delete: []
  update: [title: string]
}>()

const editing = ref(false)
const editTitle = ref('')
const editInput = ref<HTMLInputElement>()

const startEdit = () => {
  editing.value = true
  editTitle.value = props.todo.title
  nextTick(() => {
    editInput.value?.focus()
    editInput.value?.select()
  })
}

const saveEdit = () => {
  if (editTitle.value.trim() && editTitle.value !== props.todo.title) {
    emit('update', editTitle.value.trim())
  }
  editing.value = false
}

const cancelEdit = () => {
  editing.value = false
  editTitle.value = ''
}
</script>