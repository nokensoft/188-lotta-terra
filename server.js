import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sqlite3 from 'sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
const dbPath = path.join(dataDir, 'crud.sqlite')
const distDir = path.join(__dirname, 'dist')
const distIndexPath = path.join(distDir, 'index.html')
const port = process.env.PORT || 3000

fs.mkdirSync(dataDir, { recursive: true })

sqlite3.verbose()
const db = new sqlite3.Database(dbPath)

const runQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error)
        return
      }

      resolve({
        id: this.lastID,
        changes: this.changes,
      })
    })
  })

const getQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error)
        return
      }

      resolve(row)
    })
  })

const allQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error)
        return
      }

      resolve(rows)
    })
  })

const normalizeText = (value) => String(value ?? '').trim()

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) return fallback
  return parsed
}

const parseOptionalCategoryId = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null
  }

  return parsed
}

const katalogPilihanSeed = [
  {
    name: 'Gaun Elegan Senja',
    categoryName: 'Gaun',
    price: 1299000,
    description: 'Siluet anggun untuk momen spesial',
    imageUrl: '/images/1.jpg',
  },
  {
    name: 'Mantel Wol Klasik',
    categoryName: 'Outerwear',
    price: 2449000,
    description: 'Hangat dan mewah untuk cuaca sejuk',
    imageUrl: '/images/2.jpg',
  },
  {
    name: 'Tas Kulit Signature',
    categoryName: 'Aksesori',
    price: 899000,
    description: 'Aksesori premium untuk tampilan berkelas',
    imageUrl: '/images/3.jpg',
  },
  {
    name: 'Maxi Dress Musim Panas',
    categoryName: 'Gaun',
    price: 779000,
    description: 'Ringan, nyaman, dan elegan',
    imageUrl: '/images/4.jpg',
  },
  {
    name: 'Jaket Trench Modern',
    categoryName: 'Outerwear',
    price: 1349000,
    description: 'Gaya timeless untuk berbagai acara',
    imageUrl: '/images/5.jpg',
  },
  {
    name: 'Scarf Sutra Artisanal',
    categoryName: 'Aksesori',
    price: 289000,
    description: 'Sentuhan akhir yang anggun',
    imageUrl: '/images/6.jpg',
  },
]

const kategoriKatalogPilihan = [
  {
    name: 'Gaun',
    description: 'Kategori gaun untuk katalog pilihan visitor.',
  },
  {
    name: 'Outerwear',
    description: 'Kategori outerwear untuk katalog pilihan visitor.',
  },
  {
    name: 'Aksesori',
    description: 'Kategori aksesori untuk katalog pilihan visitor.',
  },
]

const getOrCreateCategoryId = async (name, description = '') => {
  await runQuery(
    'INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)',
    [name, description]
  )
  const category = await getQuery('SELECT id FROM categories WHERE name = ?', [
    name,
  ])
  return category?.id ?? null
}

const seedKatalogPilihanProducts = async () => {
  const categoryIdByName = new Map()

  for (const category of kategoriKatalogPilihan) {
    const categoryId = await getOrCreateCategoryId(
      category.name,
      category.description
    )
    if (categoryId) {
      categoryIdByName.set(category.name, categoryId)
    }
  }

  for (const product of katalogPilihanSeed) {
    const categoryId = categoryIdByName.get(product.categoryName) ?? null
    const existingProduct = await getQuery(
      'SELECT id FROM products WHERE name = ? LIMIT 1',
      [product.name]
    )

    if (existingProduct) {
      continue
    }

    await runQuery(
      `
        INSERT INTO products (name, description, price, status, category_id, image_url)
        VALUES (?, ?, ?, 'active', ?, ?)
      `,
      [
        product.name,
        product.description,
        product.price,
        categoryId,
        product.imageUrl,
      ]
    )
  }
}

const app = express()
const REQUEST_BODY_LIMIT = '25mb'
app.use(cors())
app.use(express.json({ limit: REQUEST_BODY_LIMIT }))
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }))

await runQuery('PRAGMA foreign_keys = ON')

await runQuery(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT DEFAULT ''
  )
`)

await runQuery(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)

await runQuery(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    category_id INTEGER,
    image_url TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  )
`)

const productColumns = await allQuery('PRAGMA table_info(products)')
const hasImageColumn = productColumns.some((column) => column.name === 'image_url')
if (!hasImageColumn) {
  await runQuery("ALTER TABLE products ADD COLUMN image_url TEXT DEFAULT ''")
}

await runQuery(
  'INSERT OR IGNORE INTO users (username, password, full_name) VALUES (?, ?, ?)',
  ['admin', 'admin123', 'Administrator']
)

await runQuery(
  'INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)',
  ['Umum', 'Kategori default']
)

await seedKatalogPilihanProducts()

app.post('/api/auth/login', async (request, response) => {
  const username = normalizeText(request.body.username)
  const password = normalizeText(request.body.password)

  if (!username || !password) {
    response.status(400).json({ error: 'Username dan password wajib diisi.' })
    return
  }

  try {
    const user = await getQuery(
      `
        SELECT id, username, full_name
        FROM users
        WHERE username = ? AND password = ?
      `,
      [username, password]
    )

    if (!user) {
      response.status(401).json({ error: 'Username atau password salah.' })
      return
    }

    response.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name || user.username,
      },
    })
  } catch {
    response.status(500).json({ error: 'Terjadi kesalahan saat login.' })
  }
})
app.get('/healthz', (_request, response) => {
  response.json({ status: 'ok' })
})

const hasBuiltFrontend = fs.existsSync(distIndexPath)
if (hasBuiltFrontend) {
  app.use(express.static(distDir))
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api')) {
      next()
      return
    }

    response.sendFile(distIndexPath)
  })
}

app.get('/api/dashboard/stats', async (_request, response) => {
  try {
    const totalProductsResult = await getQuery(
      'SELECT COUNT(*) AS total FROM products'
    )
    const totalCategoriesResult = await getQuery(
      'SELECT COUNT(*) AS total FROM categories'
    )
    const activeProductsResult = await getQuery(
      "SELECT COUNT(*) AS total FROM products WHERE status = 'active'"
    )
    const inactiveProductsResult = await getQuery(
      "SELECT COUNT(*) AS total FROM products WHERE status = 'inactive'"
    )

    response.json({
      totalProducts: totalProductsResult?.total ?? 0,
      totalCategories: totalCategoriesResult?.total ?? 0,
      activeProducts: activeProductsResult?.total ?? 0,
      inactiveProducts: inactiveProductsResult?.total ?? 0,
    })
  } catch {
    response
      .status(500)
      .json({ error: 'Terjadi kesalahan saat mengambil statistik.' })
  }
})

app.get('/api/categories', async (_request, response) => {
  try {
    const categories = await allQuery(
      'SELECT id, name, description FROM categories ORDER BY id DESC'
    )
    response.json(categories)
  } catch {
    response
      .status(500)
      .json({ error: 'Terjadi kesalahan saat mengambil kategori.' })
  }
})

app.get('/api/categories/:id', async (request, response) => {
  try {
    const category = await getQuery(
      'SELECT id, name, description FROM categories WHERE id = ?',
      [request.params.id]
    )

    if (!category) {
      response.status(404).json({ error: 'Kategori tidak ditemukan.' })
      return
    }

    response.json(category)
  } catch {
    response
      .status(500)
      .json({ error: 'Terjadi kesalahan saat mengambil kategori.' })
  }
})

app.post('/api/categories', async (request, response) => {
  const name = normalizeText(request.body.name)
  const description = normalizeText(request.body.description)

  if (!name) {
    response.status(400).json({ error: 'Nama kategori wajib diisi.' })
    return
  }

  try {
    const result = await runQuery(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description]
    )
    const category = await getQuery(
      'SELECT id, name, description FROM categories WHERE id = ?',
      [result.id]
    )
    response.status(201).json(category)
  } catch (error) {
    if (error.message?.includes('UNIQUE')) {
      response.status(400).json({ error: 'Nama kategori sudah digunakan.' })
      return
    }

    response
      .status(500)
      .json({ error: 'Terjadi kesalahan saat menambah kategori.' })
  }
})

app.put('/api/categories/:id', async (request, response) => {
  const name = normalizeText(request.body.name)
  const description = normalizeText(request.body.description)

  if (!name) {
    response.status(400).json({ error: 'Nama kategori wajib diisi.' })
    return
  }

  try {
    const result = await runQuery(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description, request.params.id]
    )

    if (result.changes === 0) {
      response.status(404).json({ error: 'Kategori tidak ditemukan.' })
      return
    }

    const category = await getQuery(
      'SELECT id, name, description FROM categories WHERE id = ?',
      [request.params.id]
    )
    response.json(category)
  } catch (error) {
    if (error.message?.includes('UNIQUE')) {
      response.status(400).json({ error: 'Nama kategori sudah digunakan.' })
      return
    }

    response.status(500).json({ error: 'Terjadi kesalahan saat edit kategori.' })
  }
})

app.delete('/api/categories/:id', async (request, response) => {
  try {
    const result = await runQuery('DELETE FROM categories WHERE id = ?', [
      request.params.id,
    ])

    if (result.changes === 0) {
      response.status(404).json({ error: 'Kategori tidak ditemukan.' })
      return
    }

    response.status(204).end()
  } catch {
    response
      .status(500)
      .json({ error: 'Terjadi kesalahan saat menghapus kategori.' })
  }
})

app.get('/api/products', async (request, response) => {
  const search = normalizeText(request.query.search)
  const status = normalizeText(request.query.status)
  const categoryId = parseOptionalCategoryId(request.query.categoryId)
  const page = parsePositiveInt(request.query.page, 1)
  const limit = parsePositiveInt(request.query.limit, 5)
  const offset = (page - 1) * limit

  const whereClauses = []
  const params = []

  if (search) {
    whereClauses.push('(p.name LIKE ? OR p.description LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }

  if (status && ['active', 'inactive'].includes(status)) {
    whereClauses.push('p.status = ?')
    params.push(status)
  }

  if (categoryId) {
    whereClauses.push('p.category_id = ?')
    params.push(categoryId)
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  try {
    const totalResult = await getQuery(
      `SELECT COUNT(*) AS total FROM products p ${whereSql}`,
      params
    )

    const products = await allQuery(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.status,
          p.image_url AS imageUrl,
          p.category_id AS categoryId,
          c.name AS categoryName
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        ${whereSql}
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    )

    const total = totalResult?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / limit))

    response.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch {
    response.status(500).json({ error: 'Terjadi kesalahan saat mengambil produk.' })
  }
})

app.get('/api/products/:id', async (request, response) => {
  try {
    const product = await getQuery(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.status,
          p.image_url AS imageUrl,
          p.category_id AS categoryId,
          c.name AS categoryName
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?
      `,
      [request.params.id]
    )

    if (!product) {
      response.status(404).json({ error: 'Produk tidak ditemukan.' })
      return
    }

    response.json(product)
  } catch {
    response.status(500).json({ error: 'Terjadi kesalahan saat mengambil produk.' })
  }
})

app.post('/api/products', async (request, response) => {
  const name = normalizeText(request.body.name)
  const description = normalizeText(request.body.description)
  const status = normalizeText(request.body.status) || 'active'
  const price = Number.parseFloat(request.body.price)
  const imageUrl = normalizeText(request.body.imageUrl)
  const categoryId = parseOptionalCategoryId(request.body.categoryId)

  if (!name) {
    response.status(400).json({ error: 'Nama produk wajib diisi.' })
    return
  }

  if (Number.isNaN(price) || price < 0) {
    response.status(400).json({ error: 'Harga produk tidak valid.' })
    return
  }

  if (!['active', 'inactive'].includes(status)) {
    response.status(400).json({ error: 'Status produk tidak valid.' })
    return
  }

  try {
    if (categoryId) {
      const category = await getQuery(
        'SELECT id FROM categories WHERE id = ?',
        [categoryId]
      )

      if (!category) {
        response.status(400).json({ error: 'Kategori tidak ditemukan.' })
        return
      }
    }

    const result = await runQuery(
      `
        INSERT INTO products (name, description, price, status, category_id, image_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [name, description, price, status, categoryId, imageUrl]
    )

    const product = await getQuery(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.status,
          p.image_url AS imageUrl,
          p.category_id AS categoryId,
          c.name AS categoryName
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?
      `,
      [result.id]
    )

    response.status(201).json(product)
  } catch {
    response.status(500).json({ error: 'Terjadi kesalahan saat menambah produk.' })
  }
})

app.put('/api/products/:id', async (request, response) => {
  const name = normalizeText(request.body.name)
  const description = normalizeText(request.body.description)
  const status = normalizeText(request.body.status) || 'active'
  const price = Number.parseFloat(request.body.price)
  const imageUrl = normalizeText(request.body.imageUrl)
  const categoryId = parseOptionalCategoryId(request.body.categoryId)

  if (!name) {
    response.status(400).json({ error: 'Nama produk wajib diisi.' })
    return
  }

  if (Number.isNaN(price) || price < 0) {
    response.status(400).json({ error: 'Harga produk tidak valid.' })
    return
  }


  if (!['active', 'inactive'].includes(status)) {
    response.status(400).json({ error: 'Status produk tidak valid.' })
    return
  }

  try {
    if (categoryId) {
      const category = await getQuery(
        'SELECT id FROM categories WHERE id = ?',
        [categoryId]
      )

      if (!category) {
        response.status(400).json({ error: 'Kategori tidak ditemukan.' })
        return
      }
    }

    const result = await runQuery(
      `
        UPDATE products
        SET name = ?, description = ?, price = ?, status = ?, category_id = ?, image_url = ?
        WHERE id = ?
      `,
      [name, description, price, status, categoryId, imageUrl, request.params.id]
    )

    if (result.changes === 0) {
      response.status(404).json({ error: 'Produk tidak ditemukan.' })
      return
    }

    const product = await getQuery(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.status,
          p.image_url AS imageUrl,
          p.category_id AS categoryId,
          c.name AS categoryName
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?
      `,
      [request.params.id]
    )

    response.json(product)
  } catch {
    response.status(500).json({ error: 'Terjadi kesalahan saat edit produk.' })
  }
})

app.delete('/api/products/:id', async (request, response) => {
  try {
    const result = await runQuery('DELETE FROM products WHERE id = ?', [
      request.params.id,
    ])

    if (result.changes === 0) {
      response.status(404).json({ error: 'Produk tidak ditemukan.' })
      return
    }

    response.status(204).end()
  } catch {
    response.status(500).json({ error: 'Terjadi kesalahan saat hapus produk.' })
  }
})

app.listen(port, () => {
  if (hasBuiltFrontend) {
    console.log(`Server production siap di http://localhost:${port}`)
    console.log(`Health check: http://localhost:${port}/healthz`)
    return
  }

  console.log(`API berjalan di http://localhost:${port}`)
})
