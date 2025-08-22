import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbService, type Todo } from '@/services/database'

export const useTodoStore = defineStore('todos', () => {
  const todos = ref<Todo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const completedTodos = computed(() => 
    todos.value.filter(todo => todo.completed)
  )

  const incompleteTodos = computed(() => 
    todos.value.filter(todo => !todo.completed)
  )

  const totalCount = computed(() => todos.value.length)
  const completedCount = computed(() => completedTodos.value.length)

  async function loadTodos() {
    loading.value = true
    error.value = null
    try {
      todos.value = await dbService.getAllTodos()
    } catch (e) {
      error.value = 'Failed to load todos'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function addTodo(title: string) {
    if (!title.trim()) return
    
    loading.value = true
    error.value = null
    try {
      const newTodo = await dbService.addTodo(title)
      todos.value.unshift(newTodo)
    } catch (e) {
      error.value = 'Failed to add todo'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function toggleTodo(id: number) {
    const todo = todos.value.find(t => t.id === id)
    if (!todo) return

    try {
      await dbService.updateTodo(id, { completed: !todo.completed })
      todo.completed = !todo.completed
    } catch (e) {
      error.value = 'Failed to update todo'
      console.error(e)
    }
  }

  async function updateTodoTitle(id: number, title: string) {
    const todo = todos.value.find(t => t.id === id)
    if (!todo || !title.trim()) return

    try {
      await dbService.updateTodo(id, { title })
      todo.title = title
    } catch (e) {
      error.value = 'Failed to update todo'
      console.error(e)
    }
  }

  async function deleteTodo(id: number) {
    try {
      await dbService.deleteTodo(id)
      const index = todos.value.findIndex(t => t.id === id)
      if (index > -1) {
        todos.value.splice(index, 1)
      }
    } catch (e) {
      error.value = 'Failed to delete todo'
      console.error(e)
    }
  }

  function clearCompleted() {
    const completed = completedTodos.value
    completed.forEach(todo => deleteTodo(todo.id))
  }

  return {
    todos,
    loading,
    error,
    completedTodos,
    incompleteTodos,
    totalCount,
    completedCount,
    loadTodos,
    addTodo,
    toggleTodo,
    updateTodoTitle,
    deleteTodo,
    clearCompleted
  }
})