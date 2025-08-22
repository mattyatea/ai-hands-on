import initSqlJs from 'sql.js'

export interface Todo {
  id: number
  title: string
  completed: boolean
  created_at: string
}

class DatabaseService {
  private db: any = null
  private sqlModule: any = null

  async init() {
    if (this.db) return

    this.sqlModule = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    })

    // TODO: IndexedDBやlocalStorageを使用して永続化する
    this.db = new this.sqlModule.Database()

    this.db.run(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  async getAllTodos(): Promise<Todo[]> {
    await this.init()
    const stmt = this.db.prepare('SELECT * FROM todos ORDER BY created_at DESC')
    const todos: Todo[] = []

    while (stmt.step()) {
      const row = stmt.getAsObject()
      todos.push({
        id: row.id,
        title: row.title,
        completed: Boolean(row.completed),
        created_at: row.created_at
      })
    }
    stmt.free()
    return todos
  }

  async addTodo(title: string): Promise<Todo> {
    await this.init()
    this.db.run('INSERT INTO todos (title) VALUES (?)', [title])

    const stmt = this.db.prepare('SELECT * FROM todos WHERE id = last_insert_rowid()')
    stmt.step()
    const row = stmt.getAsObject()
    stmt.free()

    return {
      id: row.id,
      title: row.title,
      completed: Boolean(row.completed),
      created_at: row.created_at
    }
  }

  async updateTodo(id: number, updates: Partial<Todo>): Promise<void> {
    await this.init()
    const fields = []
    const values = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      values.push(updates.title)
    }

    if (updates.completed !== undefined) {
      fields.push('completed = ?')
      values.push(updates.completed ? 1 : 0)
    }

    values.push(id)
    this.db.run(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`, values)
  }

  async deleteTodo(id: number): Promise<void> {
    await this.init()
    this.db.run('DELETE FROM todos WHERE id = ?', [id])
  }
}

export const dbService = new DatabaseService()
