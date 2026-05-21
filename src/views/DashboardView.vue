<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const SESSION_KEY = 'dashboard_user'

const loginForm = ref({
  username: '',
  password: '',
})
const productPriceDisplay = ref('')
const imageInputRef = ref(null)
const isImageDragOver = ref(false)
const productImageName = ref('')
const MAX_IMAGE_FILE_SIZE = 6 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 1280
const MAX_IMAGE_DATA_URL_SIZE = 2 * 1024 * 1024
const loginError = ref('')
const loginLoading = ref(false)
const currentUser = ref(null)
const activeMenu = ref('dashboard')
const appLoading = ref(false)
const appError = ref('')

const stats = ref({
  totalProducts: 0,
  totalCategories: 0,
  activeProducts: 0,
  inactiveProducts: 0,
})

const categories = ref([])
const categoryLoading = ref(false)
const categoryError = ref('')
const categoryEditingId = ref(null)
const categoryForm = ref({
  name: '',
  description: '',
})

const products = ref([])
const productLoading = ref(false)
const productError = ref('')
const productEditingId = ref(null)
const productForm = ref({
  name: '',
  description: '',
  price: '',
  status: 'active',
  categoryId: '',
  imageUrl: '',
})
const productFilters = ref({
  search: '',
  categoryId: '',
  status: '',
})
const pagination = ref({
  page: 1,
  limit: 5,
  total: 0,
  totalPages: 1,
})

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let errorMessage = 'Terjadi kesalahan.'
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

const clearProductForm = () => {
  productEditingId.value = null
  productForm.value = {
    name: '',
    description: '',
    price: '',
    status: 'active',
    categoryId: '',
    imageUrl: '',
  }
  productPriceDisplay.value = ''
  productImageName.value = ''
  isImageDragOver.value = false
  if (imageInputRef.value) {
    imageInputRef.value.value = ''
  }
}

const clearCategoryForm = () => {
  categoryEditingId.value = null
  categoryForm.value = {
    name: '',
    description: '',
  }
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

const formatRupiahInput = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return `Rp ${Number.parseInt(digits, 10).toLocaleString('id-ID')}`
}

const handlePriceInput = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')

  if (!digits) {
    productForm.value.price = ''
    productPriceDisplay.value = ''
    return
  }

  const normalizedPrice = String(Number.parseInt(digits, 10))
  productForm.value.price = normalizedPrice
  productPriceDisplay.value = formatRupiahInput(normalizedPrice)
}

const toImageDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'))
    reader.readAsDataURL(file)
  })

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Gagal memproses gambar.'))
    image.src = src
  })

const estimateDataUrlBytes = (dataUrl) => {
  const base64Content = String(dataUrl || '').split(',')[1] || ''
  return Math.ceil((base64Content.length * 3) / 4)
}

const optimizeImageDataUrl = async (file) => {
  const sourceDataUrl = await toImageDataUrl(file)
  const image = await loadImageElement(sourceDataUrl)

  let width = image.width
  let height = image.height
  const largestDimension = Math.max(width, height)

  if (largestDimension > MAX_IMAGE_DIMENSION) {
    const scale = MAX_IMAGE_DIMENSION / largestDimension
    width = Math.max(1, Math.round(width * scale))
    height = Math.max(1, Math.round(height * scale))
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Browser tidak mendukung proses gambar.')
  }

  context.drawImage(image, 0, 0, width, height)

  let quality = 0.86
  let outputDataUrl = canvas.toDataURL('image/webp', quality)
  let outputSize = estimateDataUrlBytes(outputDataUrl)

  while (outputSize > MAX_IMAGE_DATA_URL_SIZE && quality > 0.45) {
    quality -= 0.08
    outputDataUrl = canvas.toDataURL('image/webp', quality)
    outputSize = estimateDataUrlBytes(outputDataUrl)
  }

  return { dataUrl: outputDataUrl, sizeBytes: outputSize }
}

const setProductImageFromFile = async (file) => {
  if (!file) return

  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar.')
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error('Ukuran file gambar maksimal 6 MB.')
  }

  const optimizedImage = await optimizeImageDataUrl(file)
  if (optimizedImage.sizeBytes > MAX_IMAGE_DATA_URL_SIZE) {
    throw new Error('Gambar terlalu besar setelah diproses. Pilih gambar lain.')
  }

  const imageDataUrl = optimizedImage.dataUrl
  productForm.value.imageUrl = imageDataUrl
  productImageName.value = file.name
}

const openImagePicker = () => {
  imageInputRef.value?.click()
}

const handleImageFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  productError.value = ''
  try {
    await setProductImageFromFile(file)
  } catch (error) {
    productError.value = error.message
  } finally {
    event.target.value = ''
  }
}

const handleImageDragOver = () => {
  isImageDragOver.value = true
}

const handleImageDragLeave = () => {
  isImageDragOver.value = false
}

const handleImageDrop = async (event) => {
  isImageDragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (!file) return

  productError.value = ''
  try {
    await setProductImageFromFile(file)
  } catch (error) {
    productError.value = error.message
  }
}

const clearProductImage = () => {
  productForm.value.imageUrl = ''
  productImageName.value = ''
  if (imageInputRef.value) {
    imageInputRef.value.value = ''
  }
}

const pageSummary = computed(() => {
  if (pagination.value.total === 0) return '0 data'
  const start = (pagination.value.page - 1) * pagination.value.limit + 1
  const end = Math.min(
    pagination.value.page * pagination.value.limit,
    pagination.value.total
  )
  return `${start}-${end} dari ${pagination.value.total} data`
})

const fetchStats = async () => {
  stats.value = await requestJson('/api/dashboard/stats')
}

const fetchCategories = async () => {
  categoryLoading.value = true
  categoryError.value = ''
  try {
    categories.value = await requestJson('/api/categories')
  } catch (error) {
    categoryError.value = error.message
  } finally {
    categoryLoading.value = false
  }
}

const fetchProducts = async () => {
  productLoading.value = true
  productError.value = ''
  try {
    const params = new URLSearchParams({
      page: String(pagination.value.page),
      limit: String(pagination.value.limit),
    })

    const search = productFilters.value.search.trim()
    if (search) params.set('search', search)
    if (productFilters.value.categoryId) {
      params.set('categoryId', productFilters.value.categoryId)
    }
    if (productFilters.value.status) {
      params.set('status', productFilters.value.status)
    }

    const result = await requestJson(`/api/products?${params.toString()}`)
    products.value = result.data
    pagination.value = {
      ...pagination.value,
      ...result.pagination,
    }
  } catch (error) {
    productError.value = error.message
  } finally {
    productLoading.value = false
  }
}

const initializeDashboard = async () => {
  appLoading.value = true
  appError.value = ''
  try {
    await Promise.all([fetchStats(), fetchCategories(), fetchProducts()])
  } catch (error) {
    appError.value = error.message
  } finally {
    appLoading.value = false
  }
}

const submitLogin = async () => {
  loginError.value = ''
  loginLoading.value = true
  try {
    const result = await requestJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginForm.value),
    })
    currentUser.value = result.user
    localStorage.setItem(SESSION_KEY, JSON.stringify(result.user))
    loginForm.value.password = ''
    await initializeDashboard()
  } catch (error) {
    loginError.value = error.message
  } finally {
    loginLoading.value = false
  }
}

const logout = () => {
  currentUser.value = null
  localStorage.removeItem(SESSION_KEY)
  activeMenu.value = 'dashboard'
  products.value = []
  categories.value = []
  clearProductForm()
  clearCategoryForm()
}

const applyProductFilters = async () => {
  pagination.value.page = 1
  await fetchProducts()
}

const resetProductFilters = async () => {
  productFilters.value = {
    search: '',
    categoryId: '',
    status: '',
  }
  pagination.value.page = 1
  await fetchProducts()
}

const changePage = async (page) => {
  if (page < 1 || page > pagination.value.totalPages) return
  pagination.value.page = page
  await fetchProducts()
}

const editProduct = (product) => {
  handlePriceInput(product.price)
  productEditingId.value = product.id
  productForm.value = {
    name: product.name,
    description: product.description || '',
    price: String(product.price ?? ''),
    status: product.status,
    categoryId: product.categoryId ? String(product.categoryId) : '',
    imageUrl: product.imageUrl || '',
  }
  productPriceDisplay.value = formatRupiahInput(productForm.value.price)
  productImageName.value = product.imageUrl ? 'Gambar tersimpan' : ''
  activeMenu.value = 'product-form'
}

const saveProduct = async () => {
  productError.value = ''
  const payload = {
    name: productForm.value.name,
    description: productForm.value.description,
    price: Number.parseFloat(productForm.value.price || '0'),
    status: productForm.value.status,
    categoryId: productForm.value.categoryId || null,
    imageUrl: productForm.value.imageUrl,
  }

  const isEditing = productEditingId.value !== null
  const endpoint = isEditing
    ? `/api/products/${productEditingId.value}`
    : '/api/products'

  try {
    await requestJson(endpoint, {
      method: isEditing ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    })
    clearProductForm()
    await Promise.all([fetchProducts(), fetchStats()])
  } catch (error) {
    productError.value = error.message
  }
}

const deleteProduct = async (id) => {
  const accepted = window.confirm('Yakin ingin menghapus produk ini?')
  if (!accepted) return

  productError.value = ''
  try {
    await requestJson(`/api/products/${id}`, { method: 'DELETE' })

    if (products.value.length === 1 && pagination.value.page > 1) {
      pagination.value.page -= 1
    }

    await Promise.all([fetchProducts(), fetchStats()])
  } catch (error) {
    productError.value = error.message
  }
}

const editCategory = (category) => {
  categoryEditingId.value = category.id
  categoryForm.value = {
    name: category.name,
    description: category.description || '',
  }
}

const saveCategory = async () => {
  categoryError.value = ''
  const isEditing = categoryEditingId.value !== null
  const endpoint = isEditing
    ? `/api/categories/${categoryEditingId.value}`
    : '/api/categories'

  try {
    await requestJson(endpoint, {
      method: isEditing ? 'PUT' : 'POST',
      body: JSON.stringify(categoryForm.value),
    })
    clearCategoryForm()
    await Promise.all([fetchCategories(), fetchProducts(), fetchStats()])
  } catch (error) {
    categoryError.value = error.message
  }
}

const deleteCategory = async (id) => {
  const accepted = window.confirm(
    'Yakin ingin menghapus kategori ini? Produk pada kategori ini akan jadi tanpa kategori.'
  )
  if (!accepted) return

  categoryError.value = ''
  try {
    await requestJson(`/api/categories/${id}`, { method: 'DELETE' })
    if (categoryEditingId.value === id) {
      clearCategoryForm()
    }
    await Promise.all([fetchCategories(), fetchProducts(), fetchStats()])
  } catch (error) {
    categoryError.value = error.message
  }
}

const switchMenu = async (menu) => {
  activeMenu.value = menu
  if (menu === 'product-list') {
    pagination.value.page = 1
    await fetchProducts()
  }
}

onMounted(async () => {
  const savedUser = localStorage.getItem(SESSION_KEY)
  if (!savedUser) return

  try {
    currentUser.value = JSON.parse(savedUser)
    await initializeDashboard()
  } catch {
    localStorage.removeItem(SESSION_KEY)
    currentUser.value = null
  }
})
</script>

<template>
  <main v-if="!currentUser" class="login-page">
    <div class="login-card themed">
      <div class="login-brand">
        <img src="/images/logo/logo-dark.png" alt="Logo Lotta Terra" />
        <h1>Login Dashboard Lotta Terra</h1>
      </div>
      <p>Masukkan username dan password untuk mengelola katalog.</p>
      <form class="form" @submit.prevent="submitLogin">
        <label>
          Username
          <input
            v-model="loginForm.username"
            type="text"
            placeholder="Masukkan username"
          />
        </label>
        <label>
          Password
          <input
            v-model="loginForm.password"
            type="password"
            placeholder="Masukkan password"
          />
        </label>
        <button type="submit" :disabled="loginLoading">
          <i
            class="fa-solid"
            :class="loginLoading ? 'fa-spinner fa-spin' : 'fa-right-to-bracket'"
          ></i>
          {{ loginLoading ? 'Memproses...' : 'Masuk' }}
        </button>
      </form>
      <p v-if="loginError" class="error">{{ loginError }}</p>
      <RouterLink class="ghost back-btn" to="/">
        <i class="fa-solid fa-arrow-left"></i>
        Kembali ke Halaman Visitor
      </RouterLink>
    </div>
  </main>

  <main v-else class="layout">
    <aside class="sidebar">
      <h2>Dashboard Admin</h2>
      <button
        :class="{ active: activeMenu === 'dashboard' }"
        @click="switchMenu('dashboard')"
      >
        <i class="fa-solid fa-chart-line"></i>
        Statistik Umum
      </button>
      <button
        :class="{ active: activeMenu === 'product-form' }"
        @click="switchMenu('product-form')"
      >
        <i class="fa-solid fa-box-open"></i>
        Tambah Produk
      </button>
      <button
        :class="{ active: activeMenu === 'product-list' }"
        @click="switchMenu('product-list')"
      >
        <i class="fa-solid fa-table-list"></i>
        Data Produk
      </button>
      <button
        :class="{ active: activeMenu === 'categories' }"
        @click="switchMenu('categories')"
      >
        <i class="fa-solid fa-tags"></i>
        Menu Kategori
      </button>
      <button class="danger" @click="logout">
        <i class="fa-solid fa-right-from-bracket"></i>
        Logout
      </button>
    </aside>

    <section class="content">
      <header class="topbar">
        <div>
          <h1>Dashboard Lotta Terra</h1>
          <p>Selamat datang, {{ currentUser.fullName }}</p>
        </div>
      </header>

      <p v-if="appLoading">Memuat data dashboard...</p>
      <p v-if="appError" class="error">{{ appError }}</p>

      <template v-if="activeMenu === 'dashboard'">
        <section class="card">
          <h2>Statistik Umum</h2>
          <div class="stats-grid">
            <article class="stat-item">
              <span>Total Produk</span>
              <strong>{{ stats.totalProducts }}</strong>
            </article>
            <article class="stat-item">
              <span>Total Kategori</span>
              <strong>{{ stats.totalCategories }}</strong>
            </article>
            <article class="stat-item">
              <span>Produk Aktif</span>
              <strong>{{ stats.activeProducts }}</strong>
            </article>
            <article class="stat-item">
              <span>Produk Tidak Aktif</span>
              <strong>{{ stats.inactiveProducts }}</strong>
            </article>
          </div>
        </section>
      </template>

      <template v-if="activeMenu === 'product-form'">
        <section class="card">
          <div class="section-heading">
            <h2>{{ productEditingId !== null ? 'Edit Produk' : 'Tambah Produk' }}</h2>
            <button type="button" class="ghost" @click="switchMenu('product-list')">
              <i class="fa-solid fa-table-list"></i>
              Lihat Data Produk
            </button>
          </div>
          <form class="form form-grid" @submit.prevent="saveProduct">
            <label>
              Nama Produk
              <input
                v-model="productForm.name"
                type="text"
                placeholder="Masukkan nama produk"
              />
            </label>
            <label>
              Kategori
              <select v-model="productForm.categoryId">
                <option value="">Tanpa Kategori</option>
                <option
                  v-for="category in categories"
                  :key="category.id"
                  :value="String(category.id)"
                >
                  {{ category.name }}
                </option>
              </select>
            </label>
            <label>
              Harga
              <input
                :value="productPriceDisplay"
                type="text"
                inputmode="numeric"
                placeholder="Contoh: Rp 15.000"
                @input="handlePriceInput($event.target.value)"
              />
            </label>
            <label>
              Status
              <select v-model="productForm.status">
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
              </select>
            </label>
            <label class="full-width">
              Gambar Produk (Drag & Drop)
              <input
                ref="imageInputRef"
                class="image-file-input"
                type="file"
                accept="image/*"
                @change="handleImageFileChange"
              />
              <div
                class="image-dropzone"
                :class="{ 'is-dragover': isImageDragOver }"
                @click="openImagePicker"
                @dragover.prevent="handleImageDragOver"
                @dragleave.prevent="handleImageDragLeave"
                @drop.prevent="handleImageDrop"
              >
                <p>Tarik gambar ke sini atau klik untuk pilih file.</p>
                <small>{{
                  productImageName || 'Maksimal file 6 MB • JPG, PNG, WEBP'
                }}</small>
              </div>
            </label>
            <div v-if="productForm.imageUrl" class="full-width image-preview-panel">
              <img
                :src="productForm.imageUrl"
                :alt="productForm.name || 'Preview gambar produk'"
                class="product-image product-image-preview"
              />
              <button type="button" class="ghost" @click="clearProductImage">
                <i class="fa-solid fa-trash-can"></i>
                Hapus Gambar
              </button>
            </div>
            <label class="full-width">
              Deskripsi
              <textarea
                v-model="productForm.description"
                rows="3"
                placeholder="Deskripsi produk"
              />
            </label>
            <div class="actions full-width">
              <button type="submit">
                <i class="fa-solid fa-floppy-disk"></i>
                {{ productEditingId !== null ? 'Update Produk' : 'Simpan Produk' }}
              </button>
              <button
                v-if="productEditingId !== null"
                type="button"
                class="secondary"
                @click="clearProductForm"
              >
                <i class="fa-solid fa-xmark"></i>
                Batal
              </button>
            </div>
          </form>
          <p v-if="productError" class="error">{{ productError }}</p>
        </section>
      </template>

      <template v-if="activeMenu === 'product-list'">
        <section class="card">
          <div class="section-heading">
            <h2>Data Produk</h2>
            <button type="button" class="ghost" @click="switchMenu('product-form')">
              <i class="fa-solid fa-square-plus"></i>
              Tambah Produk
            </button>
          </div>

          <div class="filters">
            <input
              v-model="productFilters.search"
              type="text"
              placeholder="Cari nama / deskripsi produk"
            />
            <select v-model="productFilters.categoryId" @change="applyProductFilters">
              <option value="">Semua Kategori</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="String(category.id)"
              >
                {{ category.name }}
              </option>
            </select>
            <select v-model="productFilters.status" @change="applyProductFilters">
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
            <button type="button" class="secondary" @click="applyProductFilters">
              <i class="fa-solid fa-magnifying-glass"></i>
              Cari
            </button>
            <button type="button" class="ghost" @click="resetProductFilters">
              <i class="fa-solid fa-rotate-left"></i>
              Reset
            </button>
          </div>

          <p v-if="productLoading">Memuat produk...</p>
          <p v-else-if="products.length === 0">Belum ada data produk.</p>
          <div v-else class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Gambar</th>
                  <th>Kategori</th>
                  <th>Harga</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="product in products" :key="product.id">
                  <td>{{ product.name }}</td>
                  <td>
                    <img
                      v-if="product.imageUrl"
                      :src="product.imageUrl"
                      :alt="product.name"
                      class="product-image"
                    />
                    <span v-else>-</span>
                  </td>
                  <td>{{ product.categoryName || '-' }}</td>
                  <td>{{ formatCurrency(product.price) }}</td>
                  <td>
                    <span
                      class="status-pill"
                      :class="
                        product.status === 'active'
                          ? 'status-active'
                          : 'status-inactive'
                      "
                    >
                      {{ product.status }}
                    </span>
                  </td>
                  <td class="row-actions">
                    <button class="secondary" @click="editProduct(product)">
                      <i class="fa-solid fa-pen"></i>
                      Edit
                    </button>
                    <button class="danger" @click="deleteProduct(product.id)">
                      <i class="fa-solid fa-trash"></i>
                      Hapus
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination">
            <p>{{ pageSummary }}</p>
            <div class="actions">
              <button
                type="button"
                class="secondary"
                :disabled="pagination.page <= 1"
                @click="changePage(pagination.page - 1)"
              >
                <i class="fa-solid fa-chevron-left"></i>
                Sebelumnya
              </button>
              <span>Halaman {{ pagination.page }} / {{ pagination.totalPages }}</span>
              <button
                type="button"
                class="secondary"
                :disabled="pagination.page >= pagination.totalPages"
                @click="changePage(pagination.page + 1)"
              >
                <i class="fa-solid fa-chevron-right"></i>
                Berikutnya
              </button>
            </div>
          </div>
        </section>
      </template>

      <template v-if="activeMenu === 'categories'">
        <section class="card">
          <h2>
            {{ categoryEditingId !== null ? 'Edit Kategori' : 'Tambah Kategori' }}
          </h2>
          <form class="form" @submit.prevent="saveCategory">
            <label>
              Nama Kategori
              <input
                v-model="categoryForm.name"
                type="text"
                placeholder="Masukkan nama kategori"
              />
            </label>
            <label>
              Deskripsi
              <textarea
                v-model="categoryForm.description"
                rows="3"
                placeholder="Deskripsi kategori"
              />
            </label>
            <div class="actions">
              <button type="submit">
                <i class="fa-solid fa-floppy-disk"></i>
                {{ categoryEditingId !== null ? 'Update Kategori' : 'Simpan Kategori' }}
              </button>
              <button
                v-if="categoryEditingId !== null"
                type="button"
                class="secondary"
                @click="clearCategoryForm"
              >
                <i class="fa-solid fa-xmark"></i>
                Batal
              </button>
            </div>
          </form>
          <p v-if="categoryError" class="error">{{ categoryError }}</p>
        </section>

        <section class="card">
          <h2>Data Kategori</h2>
          <p v-if="categoryLoading">Memuat kategori...</p>
          <p v-else-if="categories.length === 0">Belum ada data kategori.</p>
          <div v-else class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Deskripsi</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="category in categories" :key="category.id">
                  <td>{{ category.name }}</td>
                  <td>{{ category.description || '-' }}</td>
                  <td class="row-actions">
                    <button class="secondary" @click="editCategory(category)">
                      <i class="fa-solid fa-pen"></i>
                      Edit
                    </button>
                    <button class="danger" @click="deleteCategory(category.id)">
                      <i class="fa-solid fa-trash"></i>
                      Hapus
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </section>
  </main>
</template>