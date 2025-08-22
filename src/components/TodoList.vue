<template>
  <div class="max-w-2xl mx-auto p-6">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">TODO App (Beta)</h1>

      <div class="flex gap-2 mb-4">
        <input
          v-model="newTodoTitle"
          @keyup.enter="addNewTodo"
          placeholder="What needs to be done?"
          class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          @click="addNewTodo"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add
        </button>
      </div>

      <!-- 検索機能（未実装） -->
      <div class="flex gap-2 mb-4">
        <input
          v-model="searchQuery"
          placeholder="Search todos... (Not implemented yet)"
          class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 opacity-50 cursor-not-allowed"
          disabled
        />
        <button
          class="px-6 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
          disabled
        >
          Search
        </button>
      </div>

      <div v-if="todoStore.error" class="p-3 mb-4 bg-red-100 text-red-700 rounded-lg">
        {{ todoStore.error }}
      </div>
    </div>

    <div class="mb-4">
      <div class="flex gap-2 mb-4">
        <button
          @click="filter = 'all'"
          :class="[
            'px-4 py-2 rounded-lg transition-colors',
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          ]"
        >
          All ({{ todoStore.totalCount }})
        </button>
        <button
          @click="filter = 'active'"
          :class="[
            'px-4 py-2 rounded-lg transition-colors',
            filter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          ]"
        >
          Active ({{ todoStore.incompleteTodos.length }})
        </button>
        <button
          @click="filter = 'completed'"
          :class="[
            'px-4 py-2 rounded-lg transition-colors',
            filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
          ]"
        >
          Completed ({{ todoStore.completedCount }})
        </button>
      </div>
    </div>

    <div v-if="todoStore.loading" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <div v-else-if="filteredTodos.length === 0" class="text-center py-8 text-gray-500">
      No todos found
    </div>

    <div v-else class="space-y-2">
      <TodoItem
        v-for="todo in filteredTodos"
        :key="todo.id"
        :todo="todo"
        @toggle="todoStore.toggleTodo(todo.id)"
        @delete="todoStore.deleteTodo(todo.id)"
        @update="(title) => todoStore.updateTodoTitle(todo.id, title)"
      />
    </div>

    <div v-if="todoStore.completedCount > 0" class="mt-6">
      <button
        @click="todoStore.clearCompleted"
        class="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        Clear completed ({{ todoStore.completedCount }})
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTodoStore } from '@/stores/todos'
import TodoItem from './TodoItem.vue'

const todoStore = useTodoStore()
const newTodoTitle = ref('')
const searchQuery = ref('')
const filter = ref<'all' | 'active' | 'completed'>('all')

// TODO: 検索機能を実装する

const filteredTodos = computed(() => {
  switch (filter.value) {
    case 'active':
      return todoStore.incompleteTodos
    case 'completed':
      return todoStore.completedTodos
    default:
      return todoStore.todos
  }
})

const addNewTodo = async () => {
  if (!newTodoTitle.value.trim()) return
  
  await todoStore.addTodo(newTodoTitle.value)
  newTodoTitle.value = ''
}

onMounted(() => {
  todoStore.loadTodos()
})
</script>
