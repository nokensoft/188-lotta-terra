<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const selectedCategory = ref('all')
const activeNav = ref('home')
const heroTiles = ref([0, 1, 2, 3])
const visitorProducts = ref([])
const catalogLoading = ref(false)
const catalogError = ref('')
const WA_NUMBER = '6285243607549'
const WA_DISPLAY_NUMBER = '+62 852-4360-7549'
const INSTAGRAM_MAIN_URL = 'https://www.instagram.com/lotta.terra/'
const INSTAGRAM_CATALOG_URL = 'https://www.instagram.com/lot.taterracatalog/'
let heroTicker = null
let parallaxFrame = null

const heroImagePool = [
  '/images/1.jpg',
  '/images/2.jpg',
  '/images/3.jpg',
  '/images/4.jpg',
  '/images/5.jpg',
  '/images/6.jpg',
]

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options)
  if (!response.ok) {
    let message = 'Terjadi kesalahan saat memuat katalog.'
    try {
      const errorData = await response.json()
      message = errorData.error || message
    } catch {
      // ignore parse error
    }
    throw new Error(message)
  }
  return response.json()
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

const createOrderWhatsappLink = (productName) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    `Halo Lotta Terra, saya ingin memesan: ${productName}`
  )}`

const createGeneralWhatsappLink = () =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    'Halo Lotta Terra, saya ingin konsultasi produk.'
  )}`

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const updateParallaxLayers = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.parallax-layer').forEach((layer) => {
      layer.style.transform = 'translate3d(0, 0, 0)'
    })
    return
  }

  const viewportCenter = window.innerHeight / 2
  const sections = document.querySelectorAll('.parallax-section')
  sections.forEach((section) => {
    const layer = section.querySelector('.parallax-layer')
    if (!layer) {
      return
    }

    const rect = section.getBoundingClientRect()
    const speed = Number(section.getAttribute('data-parallax-speed') || 0.14)
    const distanceFromCenter = rect.top + rect.height / 2 - viewportCenter
    const rawOffset = -distanceFromCenter * speed * 0.18
    const offset = Math.max(-42, Math.min(42, rawOffset))

    layer.style.transform = `translate3d(0, ${offset}px, 0)`
  })
}

const scheduleParallaxUpdate = () => {
  if (parallaxFrame) {
    return
  }

  parallaxFrame = window.requestAnimationFrame(() => {
    updateParallaxLayers()
    parallaxFrame = null
  })
}

const focusCatalogItem = (productId, event) => {
  if (event?.target instanceof HTMLElement && event.target.closest('a, button')) {
    return
  }

  const targetItem = document.getElementById(`catalog-item-${productId}`)
  if (!targetItem) {
    return
  }

  targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' })
  targetItem.classList.remove('is-focused')
  window.requestAnimationFrame(() => {
    targetItem.classList.add('is-focused')
    window.setTimeout(() => {
      targetItem.classList.remove('is-focused')
    }, 900)
  })
}
const setActiveNav = (sectionId) => {
  activeNav.value = sectionId
  scheduleParallaxUpdate()
}

const getCategoryKey = (product) => {
  if (product.categoryId) {
    return `category-${product.categoryId}`
  }
  return 'uncategorized'
}

const fetchCatalogProducts = async () => {
  catalogLoading.value = true
  catalogError.value = ''
  try {
    const result = await requestJson('/api/products?status=active&page=1&limit=100')
    visitorProducts.value = (result.data || []).map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description || '',
      imageUrl: product.imageUrl || '/images/1.jpg',
      price: Number(product.price || 0),
      categoryName: product.categoryName || 'Lainnya',
      categoryKey: getCategoryKey(product),
    }))

    const categoryExists = visitorProducts.value.some(
      (product) => product.categoryKey === selectedCategory.value
    )
    if (selectedCategory.value !== 'all' && !categoryExists) {
      selectedCategory.value = 'all'
    }
  } catch (error) {
    catalogError.value = error.message
  } finally {
    catalogLoading.value = false
  }
}

const catalogFilterOptions = computed(() => {
  const uniqueCategory = new Map()
  for (const product of visitorProducts.value) {
    if (!uniqueCategory.has(product.categoryKey)) {
      uniqueCategory.set(product.categoryKey, product.categoryName)
    }
  }

  return [
    { key: 'all', label: 'Semua' },
    ...Array.from(uniqueCategory.entries()).map(([key, label]) => ({
      key,
      label,
    })),
  ]
})

const filteredVisitorProducts = computed(() =>
  selectedCategory.value === 'all'
    ? visitorProducts.value
    : visitorProducts.value.filter(
        (item) => item.categoryKey === selectedCategory.value
      )
)

onMounted(() => {
  heroTicker = window.setInterval(() => {
    const randomBox = Math.floor(Math.random() * 4)
    const randomImage = Math.floor(Math.random() * heroImagePool.length)
    heroTiles.value[randomBox] = randomImage
  }, 3000)

  fetchCatalogProducts()
  window.addEventListener('scroll', scheduleParallaxUpdate, { passive: true })
  window.addEventListener('resize', scheduleParallaxUpdate)
  window.addEventListener('hashchange', scheduleParallaxUpdate)
  scheduleParallaxUpdate()
})

onUnmounted(() => {
  if (heroTicker) {
    window.clearInterval(heroTicker)
  }

  if (parallaxFrame) {
    window.cancelAnimationFrame(parallaxFrame)
    parallaxFrame = null
  }

  window.removeEventListener('scroll', scheduleParallaxUpdate)
  window.removeEventListener('resize', scheduleParallaxUpdate)
  window.removeEventListener('hashchange', scheduleParallaxUpdate)
})
</script>

<template>
  <main>
    <header class="visitor-header">
      <div class="visitor-disclaimer" role="note" aria-live="polite">
        Website ini masih dalam tahap pengembangan. Data dan informasi masih terus dikembangkan
        serta diperbaharui.
      </div>
      <div class="container nav-wrap">
        <a href="#home" class="brand">
          <img src="/images/logo/logo-light.png" alt="Logo Lotta Terra" />
          <span class="brand-text">
            <span class="brand-title">LOTTA TERRA</span>
            <small class="brand-tagline">Be unique and authentic in modern world</small>
          </span>
        </a>
        <nav class="visitor-nav">
          <a href="#home" :class="{ active: activeNav === 'home' }" @click="setActiveNav('home')">
            Beranda
          </a>
          <a href="#about" :class="{ active: activeNav === 'about' }" @click="setActiveNav('about')">
            Tentang
          </a>
          <a
            href="#catalog"
            :class="{ active: activeNav === 'catalog' }"
            @click="setActiveNav('catalog')"
          >
            Katalog
          </a>
          <a
            href="#instagram"
            :class="{ active: activeNav === 'instagram' }"
            @click="setActiveNav('instagram')"
          >
            Instagram
          </a>
          <a
            href="#contact"
            :class="{ active: activeNav === 'contact' }"
            @click="setActiveNav('contact')"
          >
            Kontak
          </a>
        </nav>
      </div>
    </header>

    <section id="home" class="hero-section home-section parallax-section" data-parallax-speed="0.2">
      <div class="hero-overlay"></div>
      <div class="hero-bg-grid">
        <img
          v-for="image in heroImagePool"
          :key="image"
          :src="image"
          alt="Latar koleksi Lotta Terra"
        />
      </div>
      <div class="container hero-content parallax-layer">
        <div class="hero-text">
          <h1>LOTTA TERRA</h1>
          <p class="hero-tagline">Mode Abadi, Elegansi Sepanjang Masa</p>
          <p class="hero-desc">
            Jelajahi koleksi mode premium dengan sentuhan klasik dan karakter modern.
          </p>
          <div class="hero-cta">
            <a href="#catalog" class="primary-btn">
              <span class="hero-btn-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" focusable="false">
                  <path
                    d="M4.75 12a.75.75 0 0 1 .75-.75h10.69l-3.22-3.22a.75.75 0 1 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H5.5a.75.75 0 0 1-.75-.75Z"
                  />
                </svg>
              </span>
              <span>Lihat Koleksi</span>
            </a>
            <a
              :href="INSTAGRAM_MAIN_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="outline-btn light"
            >
              <span class="hero-btn-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" focusable="false">
                  <path
                    d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5Zm8.95 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
                  />
                </svg>
              </span>
              <span>Ikuti Instagram</span>
            </a>
          </div>
        </div>
        <div class="hero-cards">
          <article v-for="(tile, idx) in heroTiles" :key="idx" class="hero-card">
            <img :src="heroImagePool[tile]" :alt="`Produk unggulan ${idx + 1}`" />
          </article>
        </div>
      </div>
    </section>

    <section id="about" class="about-section home-section parallax-section" data-parallax-speed="0.14">
      <div class="container parallax-layer">
        <h2>Tentang Lotta Terra</h2>
        <p class="section-intro">
          Lotta Terra menghadirkan gaya modern yang tetap autentik untuk setiap momen berharga.
          Kami mengutamakan kualitas, kenyamanan, dan detail agar setiap koleksi terasa istimewa.
        </p>
        <div class="about-grid">
          <article class="about-item">
            <span class="about-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path
                  d="M12 2.5 4.5 5.2v5.95c0 4.78 3.04 9.18 7.5 10.86 4.46-1.68 7.5-6.08 7.5-10.86V5.2L12 2.5Zm0 1.59 6 2.16v4.9c0 4.04-2.48 7.78-6 9.42-3.52-1.64-6-5.38-6-9.42v-4.9l6-2.16Zm3.32 5.35-4.24 4.24-2.4-2.39-1.06 1.06 3.46 3.45 5.3-5.3-1.06-1.06Z"
                />
              </svg>
            </span>
            <h3>Kualitas Premium</h3>
            <p>Bahan terbaik dengan detail pengerjaan yang presisi.</p>
          </article>
          <article class="about-item">
            <span class="about-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path
                  d="M12 2.8 5 10l7 11.2L19 10 12 2.8Zm0 2.63L17.24 10 12 18.39 6.76 10 12 5.43ZM4.2 12.25h2v1.5h-2v-1.5Zm13.6 0h2v1.5h-2v-1.5ZM11.25 1h1.5v2h-1.5V1Zm0 20h1.5v2h-1.5v-2Z"
                />
              </svg>
            </span>
            <h3>Desain Eksklusif</h3>
            <p>Setiap koleksi menghadirkan karakter dan keanggunan yang kuat.</p>
          </article>
          <article class="about-item">
            <span class="about-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path
                  d="M19.6 4.4c-4.2.3-7 2.1-8.4 5.4-1.6-1-3.4-1.4-5.4-1.4v1.5c2.3 0 4.2.6 5.8 1.8-1 2.4-1.2 5.2-.7 8.3l1.47-.24c-.4-2.39-.28-4.55.35-6.45 1.31.9 2.37 2.18 3.14 3.83l1.36-.63c-.9-1.94-2.15-3.44-3.73-4.49 1.18-2.81 3.54-4.32 7.1-4.53l-.1-1.5Z"
                />
              </svg>
            </span>
            <h3>Fokus Berkelanjutan</h3>
            <p>Produksi etis dan pilihan material yang lebih bertanggung jawab.</p>
          </article>
          <article class="about-item">
            <span class="about-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path
                  d="M12 2.75a4.25 4.25 0 0 1 4.25 4.25c0 1.13-.44 2.2-1.21 3a8.2 8.2 0 0 1 4.46 7.27.75.75 0 1 1-1.5 0 6.75 6.75 0 0 0-13.5 0 .75.75 0 1 1-1.5 0A8.2 8.2 0 0 1 7.46 10a4.25 4.25 0 0 1 4.54-7.25Zm0 1.5a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z"
                />
              </svg>
            </span>
            <h3>Layanan Personal</h3>
            <p>Pendampingan ramah untuk membantu memilih produk yang sesuai karakter Anda.</p>
          </article>
          <article class="about-item">
            <span class="about-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path
                  d="M3.75 6.25A2.25 2.25 0 0 1 6 4h9.38a2.25 2.25 0 0 1 1.6.66l2.36 2.36A2.25 2.25 0 0 1 20 8.62V16a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 16V6.25Zm2.25-.75a.75.75 0 0 0-.75.75V16c0 .41.34.75.75.75h11.75c.41 0 .75-.34.75-.75V8.62a.75.75 0 0 0-.22-.53l-2.36-2.36a.75.75 0 0 0-.53-.22H6Zm1.75 3.25h8.5v1.5h-8.5v-1.5Zm0 3h8.5v1.5h-8.5v-1.5Z"
                />
              </svg>
            </span>
            <h3>Koleksi Terkurasi</h3>
            <p>Setiap rilisan dipilih secara ketat agar tetap relevan, elegan, dan mudah dipadukan.</p>
          </article>
          <article class="about-item">
            <span class="about-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path
                  d="M12 3.5 3.75 7.8V12c0 5.03 3.45 9.55 8.11 10.66a.75.75 0 0 0 .28 0C16.8 21.55 20.25 17.03 20.25 12V7.8L12 3.5Zm0 1.68 6.75 3.53V12c0 4.28-2.86 8.14-6.75 9.15C8.11 20.14 5.25 16.28 5.25 12V8.71L12 5.18Zm-1.1 8.32-1.7-1.7-1.06 1.06 2.23 2.23a.75.75 0 0 0 1.06 0l4.23-4.23-1.06-1.06-3.7 3.7Z"
                />
              </svg>
            </span>
            <h3>Pengiriman Aman</h3>
            <p>Produk dikemas rapi dengan standar keamanan agar tiba dalam kondisi terbaik.</p>
          </article>
        </div>
      </div>
    </section>
    <section
      id="catalog"
      class="catalog-section home-section parallax-section"
      data-parallax-speed="0.12"
    >
      <div class="container parallax-layer">
        <h2>Katalog Pilihan</h2>
        <p class="section-intro">
          Jelajahi koleksi pilihan kami yang terus diperbarui dengan model terkini dan kualitas
          premium.
        </p>
        <div class="catalog-filter">
          <button
            v-for="option in catalogFilterOptions"
            :key="option.key"
            :class="{ active: selectedCategory === option.key }"
            @click="selectedCategory = option.key"
          >
            <span class="filter-btn-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path
                  d="M3.75 5A.75.75 0 0 1 4.5 4.25h15a.75.75 0 0 1 .53 1.28l-5.78 5.78v6.44a.75.75 0 0 1-1.06.69l-2.5-1.1a.75.75 0 0 1-.44-.68v-5.35L3.97 5.53A.75.75 0 0 1 3.75 5Z"
                />
              </svg>
            </span>
            <span>{{ option.label }}</span>
          </button>
        </div>

        <p v-if="catalogLoading">Memuat katalog pilihan...</p>
        <p v-else-if="catalogError" class="error">{{ catalogError }}</p>
        <p v-else-if="filteredVisitorProducts.length === 0">
          Belum ada produk aktif untuk ditampilkan.
        </p>

        <div v-else class="catalog-grid">
          <article
            v-for="product in filteredVisitorProducts"
            :key="product.id"
            :id="`catalog-item-${product.id}`"
            class="catalog-card is-clickable"
            tabindex="0"
            role="button"
            @click="focusCatalogItem(product.id, $event)"
            @keydown.enter.prevent="focusCatalogItem(product.id, $event)"
            @keydown.space.prevent="focusCatalogItem(product.id, $event)"
          >
            <img :src="product.imageUrl" :alt="product.name" />
            <div class="catalog-content">
              <h3>{{ product.name }}</h3>
              <p>{{ product.description }}</p>
              <div class="catalog-meta">
                <strong>{{ formatCurrency(product.price) }}</strong>
                <a
                  :href="createOrderWhatsappLink(product.name)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pesan Sekarang
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section
      id="instagram"
      class="social-section home-section parallax-section"
      data-parallax-speed="0.1"
    >
      <div class="container parallax-layer">
        <h2>Ikuti Perjalanan Kami</h2>
        <p>Dapatkan inspirasi gaya harian dan katalog terbaru di Instagram resmi Lotta Terra.</p>
        <div class="social-actions">
          <a
            :href="INSTAGRAM_MAIN_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="primary-btn social-btn"
          >
            <span class="ig-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path
                  d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5Zm8.95 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
                />
              </svg>
            </span>
            <span>@lotta.terra</span>
          </a>
          <a
            :href="INSTAGRAM_CATALOG_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="outline-btn social-btn"
          >
            <span class="ig-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path
                  d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5Zm8.95 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
                />
              </svg>
            </span>
            <span>@lot.taterracatalog</span>
          </a>
        </div>
        <div class="social-mockup">
          <img src="/images/lotta-terra-ig-mockup.png" alt="Mockup Instagram Lotta Terra" />
        </div>
      </div>
    </section>
    <section id="faq" class="faq-section home-section parallax-section" data-parallax-speed="0.08">
      <div class="container parallax-layer">
        <h2>FAQ</h2>
        <p class="section-intro">
          Beberapa pertanyaan umum berikut dapat membantu Anda sebelum melakukan pemesanan.
        </p>
        <div class="faq-grid">
          <article class="faq-item">
            <h3>Bagaimana cara memesan produk Lotta Terra?</h3>
            <p>
              Anda dapat memilih produk di katalog lalu klik tombol “Pesan Sekarang” untuk langsung
              terhubung ke WhatsApp kami.
            </p>
          </article>
          <article class="faq-item">
            <h3>Metode pembayaran apa saja yang tersedia?</h3>
            <p>
              Pembayaran dapat dilakukan melalui transfer bank atau metode digital lain yang
              dikonfirmasi saat proses pemesanan.
            </p>
          </article>
          <article class="faq-item">
            <h3>Berapa lama estimasi pengiriman pesanan?</h3>
            <p>
              Estimasi pengiriman menyesuaikan lokasi tujuan, umumnya 2–7 hari kerja setelah
              pembayaran terverifikasi.
            </p>
          </article>
          <article class="faq-item">
            <h3>Apakah bisa tukar ukuran jika tidak sesuai?</h3>
            <p>
              Bisa, selama produk belum digunakan dan masih sesuai syarat penukaran yang berlaku.
              Silakan hubungi admin untuk proses lanjut.
            </p>
          </article>
          <article class="faq-item">
            <h3>Apakah ada update koleksi terbaru secara berkala?</h3>
            <p>
              Ya, koleksi terbaru diumumkan secara berkala melalui halaman katalog dan akun
              Instagram resmi Lotta Terra.
            </p>
          </article>
        </div>
      </div>
    </section>
    <section
      id="contact"
      class="contact-section home-section parallax-section"
      data-parallax-speed="0.1"
    >
      <div class="container parallax-layer">
        <h2>Kontak Kami</h2>
        <p class="section-intro">
          Kami siap membantu kebutuhan Anda melalui berbagai kanal komunikasi yang tersedia.
          Kunjungi lokasi Papua melalui peta berikut untuk orientasi area.
        </p>
        <div class="contact-grid">
          <article class="contact-item">
            <span class="contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path
                  d="M12 2a7.5 7.5 0 0 1 7.5 7.5c0 5.09-6.39 11.4-6.66 11.66a1.2 1.2 0 0 1-1.68 0C10.89 20.9 4.5 14.59 4.5 9.5A7.5 7.5 0 0 1 12 2Zm0 1.5A6 6 0 0 0 6 9.5c0 3.63 4.2 8.47 6 10.33 1.8-1.86 6-6.7 6-10.33a6 6 0 0 0-6-6Zm0 2.75a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Z"
                />
              </svg>
            </span>
            <h3>Alamat</h3>
            <p>Jayapura, Papua, Indonesia</p>
          </article>
          <article class="contact-item">
            <span class="contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path
                  d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5Zm8.95 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
                />
              </svg>
            </span>
            <h3>Instagram</h3>
            <div class="contact-links">
              <a :href="INSTAGRAM_MAIN_URL" target="_blank" rel="noopener noreferrer">@lotta.terra</a>
              <a :href="INSTAGRAM_CATALOG_URL" target="_blank" rel="noopener noreferrer">
                @lot.taterracatalog
              </a>
            </div>
          </article>
          <article class="contact-item">
            <span class="contact-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" focusable="false">
                <path
                  d="M8.57 3.75A2.25 2.25 0 0 1 10.65 5l1.03 2.25a2.25 2.25 0 0 1-.62 2.67l-1.2 1c1.12 2.13 2.9 3.91 5.03 5.03l1-1.2a2.25 2.25 0 0 1 2.67-.62L20.81 15a2.25 2.25 0 0 1 1.25 2.08V20a1.75 1.75 0 0 1-1.9 1.74C11.2 21.12 2.88 12.8 2.26 3.84A1.75 1.75 0 0 1 4 1.94h2.92a2.25 2.25 0 0 1 1.65.81ZM10.65 6.5a.75.75 0 0 0-.69-.42H7.04a.75.75 0 0 0-.74.82c.48 6.9 5.8 12.22 12.7 12.7a.75.75 0 0 0 .82-.74v-2.92a.75.75 0 0 0-.42-.69l-1.88-.86a.75.75 0 0 0-.89.2l-1.3 1.56a.75.75 0 0 1-.95.17 12.73 12.73 0 0 1-6.7-6.7.75.75 0 0 1 .17-.95l1.56-1.3a.75.75 0 0 0 .2-.89L10.65 6.5Z"
                />
              </svg>
            </span>
            <h3>Nomor HP / WA</h3>
            <a :href="createGeneralWhatsappLink()" target="_blank" rel="noopener noreferrer">
              {{ WA_DISPLAY_NUMBER }}
            </a>
          </article>
        </div>
        <div class="contact-map-wrap">
          <iframe
            title="Peta Papua"
            src="https://maps.google.com/maps?q=Papua%2C%20Indonesia&t=&z=6&ie=UTF8&iwloc=&output=embed"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </section>

    <footer class="visitor-footer">
      <p>© 2026 Lotta Terra. All right reserved.</p>
      <p class="footer-meta">
        <RouterLink to="/nokenpanel/dashboard">Login</RouterLink>
        <span aria-hidden="true"> | </span>
        Powered by
        <a href="https://nokensoft.com" target="_blank" rel="noopener noreferrer">Nokensoft.com</a>
      </p>
    </footer>

    <div class="floating-contact-actions">
      <a
        :href="createGeneralWhatsappLink()"
        class="floating-action-btn wa"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat WhatsApp"
        data-label="WhatsApp"
      >
        <span class="floating-action-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img" focusable="false">
            <path
              d="M19.08 4.92A9.9 9.9 0 0 0 12.02 2a10 10 0 0 0-8.59 15.11L2 22l5.03-1.31A10 10 0 1 0 19.08 4.92Zm-7.06 15.43a8.27 8.27 0 0 1-4.21-1.15l-.3-.18-2.98.78.8-2.9-.2-.3a8.25 8.25 0 1 1 7 3.75Zm4.53-6.17c-.25-.12-1.48-.73-1.7-.82-.23-.09-.4-.12-.56.13-.17.24-.65.82-.8.98-.15.16-.3.18-.56.06a6.72 6.72 0 0 1-1.98-1.22 7.46 7.46 0 0 1-1.37-1.71c-.14-.24-.02-.37.1-.5.12-.11.25-.3.37-.45.12-.14.17-.24.25-.4.08-.15.04-.29-.02-.4-.07-.12-.56-1.35-.77-1.84-.2-.49-.4-.42-.56-.43h-.48c-.16 0-.4.06-.62.29-.21.24-.82.8-.82 1.95 0 1.14.84 2.25.96 2.4.12.16 1.65 2.53 4 3.54.56.24.99.39 1.33.5.56.18 1.06.15 1.45.09.44-.07 1.48-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.28Z"
            />
          </svg>
        </span>
      </a>
      <a
        :href="INSTAGRAM_MAIN_URL"
        class="floating-action-btn instagram"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        data-label="Instagram"
      >
        <span class="floating-action-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img" focusable="false">
            <path
              d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5Zm8.95 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
            />
          </svg>
        </span>
      </a>
      <button type="button" class="floating-action-btn top" @click="scrollToTop" aria-label="Back to Top">
        <span class="floating-action-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img" focusable="false">
            <path
              d="M12 4.25a.75.75 0 0 1 .53.22l5 5a.75.75 0 1 1-1.06 1.06l-3.72-3.72V19a.75.75 0 0 1-1.5 0V6.81l-3.72 3.72a.75.75 0 0 1-1.06-1.06l5-5A.75.75 0 0 1 12 4.25Z"
            />
          </svg>
        </span>
      </button>
    </div>
  </main>
</template>