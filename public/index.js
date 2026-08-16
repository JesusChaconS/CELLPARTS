// State Management
const state = {
  searchQuery: '',
  filters: {
    providers: [],
    brands: [],
    categories: [],
    minPrice: null,
    maxPrice: null
  },
  sorting: 'price-asc',
  pagination: {
    page: 1,
    limit: 21, // Múltiplo de 3 para cuadrículas estéticas de 3 columnas
    totalPages: 1
  },
  facets: {
    minPrice: 0,
    maxPrice: 1000000,
    brands: [],
    categories: [],
    providers: []
  },
  isScraping: false
};

const PLACEHOLDER_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMyNzI3MmEiLz48cGF0aCBkPSJNMTAwIDcwYy0xMSAwLTIwIDktMjAgMjBzOSAyMCAyMCAyMCAyMCAyMC05IDIwLTIwLTktMjAtMjAtMjB6bTAgMzBjLTUuNSAwLTEwLTQuNS0xMC0xMHM0LjUtMTAgMTAtMTAgMTAgQy41IDEwIDEwLTQuNSAxMC0xMC00LjUgMTAtMTAgMTB6bTM1LTQBoLTE1bC01LThIODVsLTUgOEg2NWMtOC4zIDAtMTUgNi43LTE1IDE1djUwYzAgOC4zIDYuNyAxNSAxNSAxNWg3MGM4LjMgMCAxNS02LjcsMTUtMTVWNzVjMC04LjMtNi43LTE1LTE1LTE1em01IDY1YzAgMi44LTIuMiA1LTUgNUg2NWMtMi44IDAtNS0yLjItNS01Vjc1YzAtMi44IDIuMi01IDUtNWgxNy44bDUtOGgyNC40bDUgOEgxMzVjMi44IDAgNSAyLjIgNSA1djUweiIgZmlsbD0iIzUyNTI1YiIvPjx0ZXh0IHg9IjUwJSIgeT0iMTUwIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic3lzdGVtLXVpLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmb250LXdlaWdodD0iODAwIiBmaWxsPSIjNTI1MjViIiBsZXR0ZXItc3BhY2luZz0iMSI+SU1BR0VOIE5PIERJU1BPTklCTEU8L3RleHQ+PC9zdmc+";

// Debounce timer
let debounceTimer;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const resultsCount = document.getElementById('resultsCount');
const resultsSortingContainer = document.getElementById('resultsSortingContainer');
const sortBySelect = document.getElementById('sortBySelect');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const exploreGrid = document.getElementById('exploreGrid');
const paginationContainer = document.getElementById('paginationContainer');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const paginationInfo = document.getElementById('paginationInfo');
const serverStatus = document.getElementById('serverStatus');
const statusDot = serverStatus ? serverStatus.querySelector('.status-dot') : null;
const statusText = serverStatus ? serverStatus.querySelector('.status-text') : null;
const toastNotification = document.getElementById('toastNotification');

const homePromoSection = document.getElementById('homePromoSection');
const searchResultSection = document.getElementById('searchResultSection');

// Mobile drawer elements
const filterDrawerOverlay = document.getElementById('filterDrawerOverlay');
const filterDrawer = document.getElementById('filterDrawer');

// Price filter inputs - Desktop
const minPriceInput = document.getElementById('minPriceInput');
const maxPriceInput = document.getElementById('maxPriceInput');
const priceRangeSliderMin = document.getElementById('priceRangeSliderMin');
const priceRangeSliderMax = document.getElementById('priceRangeSliderMax');
const sliderTrack = document.getElementById('sliderTrack');
const sliderRange = document.getElementById('sliderRange');
const applyPriceFilterBtn = document.getElementById('applyPriceFilterBtn');

// Price filter inputs - Mobile
const minPriceInputMobile = document.getElementById('minPriceInputMobile');
const maxPriceInputMobile = document.getElementById('maxPriceInputMobile');
const priceRangeSliderMinMobile = document.getElementById('priceRangeSliderMinMobile');
const priceRangeSliderMaxMobile = document.getElementById('priceRangeSliderMaxMobile');
const sliderTrackMobile = document.getElementById('sliderTrackMobile');
const sliderRangeMobile = document.getElementById('sliderRangeMobile');
const applyPriceFilterBtnMobile = document.getElementById('applyPriceFilterBtnMobile');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkScraperStatus();
  
  // Intervalo de liveness de 15 segundos
  setInterval(checkScraperStatus, 15000);
});

// Event Listeners Binding
function setupEventListeners() {
  // Buscador Input
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    state.searchQuery = val;
    
    if (val.length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.pagination.page = 1;
      // Al cambiar la búsqueda de texto, recalculamos las facetas
      fetchFacets().then(() => fetchData());
    }, 450);
  });

  // Limpiar Búsqueda
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    resetFilters();
    state.pagination.page = 1;
    fetchFacets().then(() => fetchData());
  });

  // Ordenamiento
  sortBySelect.addEventListener('change', (e) => {
    state.sorting = e.target.value;
    state.pagination.page = 1;
    fetchData();
  });

  // Paginación
  prevPageBtn.addEventListener('click', () => {
    if (state.pagination.page > 1) {
      state.pagination.page--;
      fetchData();
      scrollToResults();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (state.pagination.page < state.pagination.totalPages) {
      state.pagination.page++;
      fetchData();
      scrollToResults();
    }
  });

  // Event Delegation para Checkboxes Dinámicos
  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('filter-checkbox')) {
      const val = e.target.value;
      const type = e.target.dataset.type;
      const isChecked = e.target.checked;
      
      let list = [];
      if (type === 'brand') list = state.filters.brands;
      else if (type === 'category') list = state.filters.categories;
      else if (type === 'provider') list = state.filters.providers;

      if (isChecked) {
        if (!list.includes(val)) list.push(val);
      } else {
        const idx = list.indexOf(val);
        if (idx > -1) list.splice(idx, 1);
      }

      // Sincronizar estado visual entre checkboxes del cajón móvil y la barra lateral de PC
      syncCheckboxStates(type, val, isChecked);

      state.pagination.page = 1;
      fetchData();
    }
  });

  // Slider de Precios - Desktop
  if (priceRangeSliderMin && priceRangeSliderMax) {
    priceRangeSliderMin.addEventListener('input', (e) => {
      const minVal = parseInt(priceRangeSliderMin.value);
      const maxVal = parseInt(priceRangeSliderMax.value);
      if (minVal >= maxVal) {
        priceRangeSliderMin.value = maxVal - 500;
      }
      minPriceInput.value = priceRangeSliderMin.value;
      updateSliderUI('desktop');
    });

    priceRangeSliderMax.addEventListener('input', (e) => {
      const minVal = parseInt(priceRangeSliderMin.value);
      const maxVal = parseInt(priceRangeSliderMax.value);
      if (maxVal <= minVal) {
        priceRangeSliderMax.value = minVal + 500;
      }
      maxPriceInput.value = priceRangeSliderMax.value;
      updateSliderUI('desktop');
    });

    applyPriceFilterBtn.addEventListener('click', () => {
      state.filters.minPrice = parseFloat(minPriceInput.value) || null;
      state.filters.maxPrice = parseFloat(maxPriceInput.value) || null;
      state.pagination.page = 1;
      fetchData();
    });
  }

  // Slider de Precios - Móvil
  if (priceRangeSliderMinMobile && priceRangeSliderMaxMobile) {
    priceRangeSliderMinMobile.addEventListener('input', (e) => {
      const minVal = parseInt(priceRangeSliderMinMobile.value);
      const maxVal = parseInt(priceRangeSliderMaxMobile.value);
      if (minVal >= maxVal) {
        priceRangeSliderMinMobile.value = maxVal - 500;
      }
      minPriceInputMobile.value = priceRangeSliderMinMobile.value;
      updateSliderUI('mobile');
    });

    priceRangeSliderMaxMobile.addEventListener('input', (e) => {
      const minVal = parseInt(priceRangeSliderMinMobile.value);
      const maxVal = parseInt(priceRangeSliderMaxMobile.value);
      if (maxVal <= minVal) {
        priceRangeSliderMaxMobile.value = minVal + 500;
      }
      maxPriceInputMobile.value = priceRangeSliderMaxMobile.value;
      updateSliderUI('mobile');
    });

    applyPriceFilterBtnMobile.addEventListener('click', () => {
      state.filters.minPrice = parseFloat(minPriceInputMobile.value) || null;
      state.filters.maxPrice = parseFloat(maxPriceInputMobile.value) || null;
      state.pagination.page = 1;
      fetchData();
      closeFiltersDrawer();
    });
  }

  // Sincronizar inputs manuales con sliders al salir del campo
  if (minPriceInput && maxPriceInput) {
    minPriceInput.addEventListener('change', () => {
      priceRangeSliderMin.value = minPriceInput.value;
      updateSliderUI('desktop');
    });
    maxPriceInput.addEventListener('change', () => {
      priceRangeSliderMax.value = maxPriceInput.value;
      updateSliderUI('desktop');
    });
  }

  // Teclado sugeridos rápidos
  document.querySelectorAll('.suggestion-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      const search = e.target.dataset.search;
      searchInput.value = search;
      state.searchQuery = search;
      clearSearchBtn.classList.remove('hidden');
      state.pagination.page = 1;
      fetchFacets().then(() => fetchData());
    });
  });

  // Cerrar Drawer móvil al hacer clic fuera del panel
  filterDrawerOverlay.addEventListener('click', (e) => {
    if (e.target === filterDrawerOverlay) closeFiltersDrawer();
  });

  // Botón actualizar de escritorio
  const desktopUpdateBtn = document.getElementById('desktopUpdateScrapersBtn');
  if (desktopUpdateBtn) {
    desktopUpdateBtn.addEventListener('click', triggerScrapeMobile);
  }
}

// Resetea todos los filtros locales
function resetFilters() {
  state.filters.providers = [];
  state.filters.brands = [];
  state.filters.categories = [];
  state.filters.minPrice = null;
  state.filters.maxPrice = null;
  
  if (minPriceInput) minPriceInput.value = '';
  if (maxPriceInput) maxPriceInput.value = '';
  if (minPriceInputMobile) minPriceInputMobile.value = '';
  if (maxPriceInputMobile) maxPriceInputMobile.value = '';
}

// Sincroniza visualmente los checkboxes de la barra de escritorio y del drawer móvil
function syncCheckboxStates(type, value, isChecked) {
  const checkboxes = document.querySelectorAll(`input[type="checkbox"][value="${value}"][data-type="${type}"]`);
  checkboxes.forEach(cb => {
    cb.checked = isChecked;
    const span = cb.nextElementSibling;
    if (span) {
      if (isChecked) {
        span.classList.add('text-brand', 'font-semibold');
      } else {
        span.classList.remove('text-brand', 'font-semibold');
      }
    }
  });
}

// Reset al inicio
function resetToHome() {
  searchInput.value = '';
  state.searchQuery = '';
  clearSearchBtn.classList.add('hidden');
  resetFilters();
  state.pagination.page = 1;
  
  homePromoSection.classList.remove('hidden');
  searchResultSection.classList.add('hidden');
}

// Activa una categoría específica y salta al listado
function triggerQuickCategory(categoryName) {
  resetFilters();
  state.filters.categories = [categoryName];
  state.searchQuery = '';
  searchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  state.pagination.page = 1;
  fetchFacets().then(() => fetchData());
}

// Activa una marca específica y salta al listado
function triggerQuickBrand(brandName) {
  resetFilters();
  state.filters.brands = [brandName];
  state.searchQuery = '';
  searchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  state.pagination.page = 1;
  fetchFacets().then(() => fetchData());
}

// Activa un proveedor específico al hacer clic en su logotipo
function triggerQuickProvider(providerName) {
  resetFilters();
  state.filters.providers = [providerName];
  state.searchQuery = '';
  searchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  state.pagination.page = 1;
  fetchFacets().then(() => fetchData());
}

// Cambiar la ordenación de forma imperativa
function triggerSortBy(sortVal) {
  sortBySelect.value = sortVal;
  state.sorting = sortVal;
  state.pagination.page = 1;
  fetchData();
}

// Scroll suave hasta el encabezado del listado
function scrollToResults() {
  searchResultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Controladores para el Cajón Deslizable Móvil (Slide-Up Drawer)
function openFiltersDrawer() {
  filterDrawerOverlay.classList.remove('hidden');
  // Pequeño timeout para permitir que la animación CSS se dispare
  setTimeout(() => {
    filterDrawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }, 10);
}

function closeFiltersDrawer() {
  filterDrawerOverlay.classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(() => {
    filterDrawerOverlay.classList.add('hidden');
  }, 350);
}

// Limpiar todos los filtros activos
function clearAllFilters() {
  resetFilters();
  // Desmarcar todos los checkboxes visibles
  document.querySelectorAll('.filter-checkbox').forEach(cb => {
    cb.checked = false;
    if (cb.nextElementSibling) {
      cb.nextElementSibling.classList.remove('text-brand', 'font-semibold');
    }
  });
  
  // Reiniciar sliders de precio a sus rangos originales
  priceRangeSliderMin.value = state.facets.minPrice;
  priceRangeSliderMax.value = state.facets.maxPrice;
  minPriceInput.value = state.facets.minPrice;
  maxPriceInput.value = state.facets.maxPrice;
  updateSliderUI('desktop');

  if (priceRangeSliderMinMobile) {
    priceRangeSliderMinMobile.value = state.facets.minPrice;
    priceRangeSliderMaxMobile.value = state.facets.maxPrice;
    minPriceInputMobile.value = state.facets.minPrice;
    maxPriceInputMobile.value = state.facets.maxPrice;
    updateSliderUI('mobile');
  }

  state.pagination.page = 1;
  fetchData();
}

// Actualizar barra y posición visual del slider doble
function updateSliderUI(view = 'desktop') {
  if (view === 'desktop' && priceRangeSliderMin && priceRangeSliderMax) {
    const minVal = parseInt(priceRangeSliderMin.value);
    const maxVal = parseInt(priceRangeSliderMax.value);
    const maxLimit = parseInt(priceRangeSliderMax.max) || 1000000;
    const percent1 = (minVal / maxLimit) * 100;
    const percent2 = (maxVal / maxLimit) * 100;
    sliderRange.style.left = percent1 + '%';
    sliderRange.style.width = (percent2 - percent1) + '%';
  } else if (view === 'mobile' && priceRangeSliderMinMobile && priceRangeSliderMaxMobile) {
    const minVal = parseInt(priceRangeSliderMinMobile.value);
    const maxVal = parseInt(priceRangeSliderMaxMobile.value);
    const maxLimit = parseInt(priceRangeSliderMaxMobile.max) || 1000000;
    const percent1 = (minVal / maxLimit) * 100;
    const percent2 = (maxVal / maxLimit) * 100;
    sliderRangeMobile.style.left = percent1 + '%';
    sliderRangeMobile.style.width = (percent2 - percent1) + '%';
  }
}

// Fetch Dinámico de Facetas (Precios y recuentos de marcas/categorías)
async function fetchFacets() {
  try {
    const res = await fetch(`/api/products/facets?q=${encodeURIComponent(state.searchQuery)}`);
    const payload = await res.json();
    
    if (payload.success && payload.data) {
      state.facets = payload.data;
      
      // Actualizar rangos de precio en los sliders
      const min = Math.floor(state.facets.minPrice || 0);
      const max = Math.ceil(state.facets.maxPrice || 1000000);
      
      // Desktop range sliders
      priceRangeSliderMin.min = min;
      priceRangeSliderMin.max = max;
      priceRangeSliderMax.min = min;
      priceRangeSliderMax.max = max;
      
      // Si el usuario no ha puesto filtros manuales, seteamos los valores por defecto del rango absoluto
      if (state.filters.minPrice === null) {
        priceRangeSliderMin.value = min;
        minPriceInput.value = min;
      }
      if (state.filters.maxPrice === null) {
        priceRangeSliderMax.value = max;
        maxPriceInput.value = max;
      }
      updateSliderUI('desktop');

      // Mobile range sliders
      if (priceRangeSliderMinMobile) {
        priceRangeSliderMinMobile.min = min;
        priceRangeSliderMinMobile.max = max;
        priceRangeSliderMaxMobile.min = min;
        priceRangeSliderMaxMobile.max = max;
        
        if (state.filters.minPrice === null) {
          priceRangeSliderMinMobile.value = min;
          minPriceInputMobile.value = min;
        }
        if (state.filters.maxPrice === null) {
          priceRangeSliderMaxMobile.value = max;
          maxPriceInputMobile.value = max;
        }
        updateSliderUI('mobile');
      }

      // Renderizar listas de checkboxes de filtros dinámicamente
      renderFilterCheckboxes('brandFilterCheckboxes', state.facets.brands, 'brand', state.filters.brands);
      renderFilterCheckboxes('categoryFilterCheckboxes', state.facets.categories, 'category', state.filters.categories);
      renderFilterCheckboxes('providerFilterCheckboxes', state.facets.providers, 'provider', state.filters.providers);
      
      // Versión móvil
      renderFilterCheckboxes('brandFilterCheckboxesMobile', state.facets.brands, 'brand', state.filters.brands);
      renderFilterCheckboxes('categoryFilterCheckboxesMobile', state.facets.categories, 'category', state.filters.categories);
      renderFilterCheckboxes('providerFilterCheckboxesMobile', state.facets.providers, 'provider', state.filters.providers);
    }
  } catch (err) {
    console.error('Error cargando facetas dinámicas:', err);
  }
}

// Renderizar Checkboxes
function renderFilterCheckboxes(containerId, list, type, activeList) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (list.length === 0) {
    container.innerHTML = '<p class="text-zinc-600 text-xs italic py-1">No disponible</p>';
    return;
  }
  
  container.innerHTML = list.map(item => {
    const value = item[type] || item.provider || item.category || item.brand;
    const count = item.count;
    const isChecked = activeList.includes(value);
    
    let label = value;
    if (type === 'provider') {
      const providerMap = {
        'mundoparts': 'Mundo Parts',
        'fastcheap': 'Fast Cheap',
        'i2c': 'i2C Mayorista',
        'uniontools': 'Uniontools',
        'oneservice': 'OneService'
      };
      label = providerMap[value] || value;
    }
    
    return `
      <label class="flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer select-none py-0.5 group">
        <div class="flex items-center gap-2">
          <input type="checkbox" value="${value}" data-type="${type}" ${isChecked ? 'checked' : ''} 
                 class="w-3.5 h-3.5 bg-zinc-950 border-zinc-800 rounded text-brand focus:ring-brand accent-brand filter-checkbox">
          <span class="transition ${isChecked ? 'text-brand font-semibold' : ''}">${label}</span>
        </div>
        <span class="text-zinc-600 font-semibold text-[10px] group-hover:text-zinc-500">(${count})</span>
      </label>
    `;
  }).join('');
}

// Fetch and render products data
async function fetchData() {
  showLoading(true);
  
  // Si hay alguna búsqueda o algún filtro activo, colapsamos el inicio y mostramos resultados
  const hasActiveFilters = state.searchQuery.length > 0 || 
                           state.filters.providers.length > 0 || 
                           state.filters.brands.length > 0 || 
                           state.filters.categories.length > 0 || 
                           state.filters.minPrice !== null || 
                           state.filters.maxPrice !== null;

  if (hasActiveFilters) {
    homePromoSection.classList.add('hidden');
    searchResultSection.classList.remove('hidden');
  } else {
    homePromoSection.classList.remove('hidden');
    searchResultSection.classList.add('hidden');
    showLoading(false);
    return; // No es necesario cargar grilla vacía
  }
  
  try {
    const sortMap = {
      'price-asc': 'price&order=ASC',
      'price-desc': 'price&order=DESC',
      'scraped_at-desc': 'scraped_at&order=DESC'
    };
    const [sortBy, order] = sortMap[state.sorting].split('&order=');
    
    let queryParams = `limit=${state.pagination.limit}&page=${state.pagination.page}&sortBy=${sortBy}&order=${order}`;
    
    if (state.searchQuery) queryParams += `&q=${encodeURIComponent(state.searchQuery)}`;
    if (state.filters.providers.length > 0) queryParams += `&provider=${state.filters.providers.join(',')}`;
    if (state.filters.brands.length > 0) queryParams += `&brand=${state.filters.brands.join(',')}`;
    if (state.filters.categories.length > 0) queryParams += `&category=${state.filters.categories.join(',')}`;
    if (state.filters.minPrice !== null) queryParams += `&minPrice=${state.filters.minPrice}`;
    if (state.filters.maxPrice !== null) queryParams += `&maxPrice=${state.filters.maxPrice}`;
    
    const res = await fetch(`/api/products?${queryParams}`);
    const payload = await res.json();
    
    if (payload.success && payload.data && payload.data.length > 0) {
      renderExplore(payload.data, payload.pagination);
    } else {
      renderEmpty();
    }
  } catch (error) {
    console.error('Error cargando repuestos:', error);
    renderEmpty('Ocurrió un error al cargar los datos.');
  } finally {
    showLoading(false);
  }
}

// Renderizar grilla de productos (Estilo Teclados de la imagen)
function renderExplore(products, pagination) {
  exploreGrid.innerHTML = '';
  emptyState.classList.add('hidden');
  
  const queryLabel = state.searchQuery ? `"${state.searchQuery}"` : 'los filtros seleccionados';
  resultsCount.textContent = `${pagination.total} resultados para ${queryLabel}`;
  
  // Actualizar controles de paginación
  state.pagination.totalPages = pagination.pages;
  paginationInfo.textContent = `Página ${pagination.page} de ${pagination.pages}`;
  prevPageBtn.disabled = pagination.page <= 1;
  nextPageBtn.disabled = pagination.page >= pagination.pages;
  paginationContainer.classList.remove('hidden');
  
  products.forEach((product, index) => {
    
    // Inyectar banner patrocinado intermedio al estilo HardGamers
    if (index === 6) {
      const sponsoredCard = document.createElement('div');
      sponsoredCard.className = 'col-span-2 md:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden relative shadow-md';
      sponsoredCard.innerHTML = `
        <div class="absolute inset-0 bg-gradient-to-r from-purpleDark/20 to-transparent z-0"></div>
        <div class="z-10 max-w-lg">
          <span class="text-[9px] font-extrabold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20 uppercase tracking-widest">Patrocinado</span>
          <h3 class="text-base font-extrabold text-white mt-2">¿Estás buscando herramientas profesionales para soldadura?</h3>
          <p class="text-zinc-400 text-xs mt-1">Encontrá el mejor equipamiento en marcas líderes Sunshine, Baku y Yaxun en nuestros distribuidores afiliados.</p>
        </div>
        <button onclick="triggerQuickCategory('Herramientas')" class="z-10 bg-brand hover:bg-brand-dark text-zinc-950 font-bold text-xs px-4 py-2.5 rounded-lg whitespace-nowrap transition shadow-md shadow-brand/20">Ver herramientas</button>
      `;
      exploreGrid.appendChild(sponsoredCard);
    }

    const card = document.createElement('div');
    card.className = 'bg-zinc-900 border border-zinc-850 hover:border-zinc-750 rounded-2xl p-3 flex flex-col justify-between transition-all duration-300 relative product-card-zoom group shadow-md hover:shadow-lg';
    
    const isOutOfStock = product.stock === 0;
    const providerMap = {
      'mundoparts': 'Mundo Parts',
      'fastcheap': 'Fast Cheap',
      'i2c': 'i2C Mayorista',
      'uniontools': 'Uniontools',
      'oneservice': 'OneService'
    };
    const providerLabel = providerMap[product.provider] || product.provider;
    
    // Si no tiene imagen o falla, se inyecta el marcador gris con comillas correctas
    const sampleImage = product.image_url || PLACEHOLDER_SVG;
    
    card.innerHTML = `
      <!-- Botón de favorito/estrella arriba a la derecha -->
      <button class="absolute top-3.5 right-3.5 z-20 text-zinc-600 hover:text-yellow-500 transition-colors" title="Agregar a favoritos">
        <svg class="w-4 h-4 fill-transparent hover:fill-current" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
      </button>

      <!-- Imagen contenedora de ancho completo cuadrada -->
      <div class="w-full aspect-square bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden flex items-center justify-center mb-3.5 relative">
        <img src="${sampleImage}" referrerpolicy="no-referrer" alt="${product.original_name}" class="max-w-[90%] max-h-[90%] object-contain" onerror="this.onerror=null; this.src='${PLACEHOLDER_SVG}';">
        ${isOutOfStock ? `
          <div class="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span class="bg-red-950 border border-red-800 text-red-400 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded">Sin Stock</span>
          </div>
        ` : ''}
      </div>

      <!-- Cuerpo de la tarjeta -->
      <div class="flex flex-col flex-grow justify-between gap-3 px-1">
        
        <div>
          <!-- Nombre del Distribuidor en mayúsculas pequeñas -->
          <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">${providerLabel}</span>
          
          <!-- Título en Mayúsculas y Negrita -->
          <h3 class="text-xs font-bold text-zinc-200 uppercase leading-snug tracking-wide line-clamp-3 group-hover:text-white transition" title="${product.original_name}">
            ${product.original_name}
          </h3>
          
          <!-- Metadata pequeña -->
          <span class="text-[10px] text-zinc-500 mt-1 block">
            ${product.brand || 'Genérico'} ${product.model ? `• ${product.model}` : ''}
          </span>
        </div>

        <!-- Precio y Botón en fila -->
        <div class="flex items-center justify-between mt-1 pt-2 border-t border-zinc-850">
          <div class="flex flex-col">
            <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Precio</span>
            <span class="text-base font-extrabold text-white leading-tight">
              $${Math.floor(product.price).toLocaleString('es-AR')}
            </span>
          </div>
          <a href="${product.url}" target="_blank" class="bg-zinc-800 hover:bg-brand hover:text-zinc-950 text-white font-extrabold text-xs px-3 py-2 rounded-lg transition-all flex items-center gap-1 shadow border border-zinc-700 hover:border-brand">
            Ver 
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </a>
        </div>

      </div>
    `;
    exploreGrid.appendChild(card);
  });
}

// Render Empty/Error State
function renderEmpty(errorMessage) {
  resultsCount.textContent = 'Sin resultados';
  exploreGrid.innerHTML = '';
  paginationContainer.classList.add('hidden');
  resultsSortingContainer.classList.add('hidden');
  
  if (errorMessage) {
    emptyState.querySelector('.empty-description').textContent = errorMessage;
  } else {
    emptyState.querySelector('.empty-description').textContent = 'No encontramos repuestos que coincidan con los filtros seleccionados. Intenta otra palabra clave.';
  }
  
  emptyState.classList.remove('hidden');
}

// Loading display toggle
function showLoading(show) {
  if (show) {
    loadingState.classList.remove('hidden');
    exploreGrid.classList.add('hidden');
    emptyState.classList.add('hidden');
    paginationContainer.classList.add('hidden');
  } else {
    loadingState.classList.add('hidden');
    exploreGrid.classList.remove('hidden');
  }
}

// Check Background Scrapers status
function checkScraperStatus() {
  fetch('/api/products/scrape-status')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        if (data.is_scraping) {
          state.isScraping = true;
          if (statusDot) statusDot.className = 'status-dot w-2 h-2 rounded-full bg-amber-500 animate-pulse';
          if (statusText) statusText.textContent = 'Actualizando Catálogos...';
          toastNotification.classList.remove('hidden');
        } else {
          state.isScraping = false;
          if (statusDot) statusDot.className = 'status-dot w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
          if (statusText) statusText.textContent = 'Conectado';
          toastNotification.classList.add('hidden');
        }
      }
    })
    .catch(err => {
      console.error('Error verificando estado del servidor:', err);
      if (statusDot) statusDot.className = 'status-dot w-2 h-2 rounded-full bg-red-500';
      if (statusText) statusText.textContent = 'Error de Red';
    });
}

// Trigger Scrape from frontend
function triggerScrapeMobile() {
  if (state.isScraping) return;
  
  if (confirm('¿Deseas iniciar la actualización de los catálogos en segundo plano? Esto puede tomar unos minutos.')) {
    fetch('/api/products/scrape', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        showToast(data.message || 'Scraping iniciado.');
        checkScraperStatus();
      })
      .catch(err => console.error('Error disparando scraper:', err));
  }
}

// Show toast notification helper
function showToast(message) {
  const toast = document.getElementById('toastNotification');
  if (toast) {
    toast.querySelector('.toast-text').textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      if (!state.isScraping) {
        toast.classList.add('hidden');
      }
    }, 4000);
  }
}
