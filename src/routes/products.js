/**
 * CELL-PARTS - Rutas de la API de Productos.
 * Define los endpoints para buscar, filtrar, comparar repuestos y disparar la actualización de scrapers.
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { run: runScrapers } = require('../scrapers/run');


let isScraping = false;


router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const options = {
      provider: req.query.provider,
      brand: req.query.brand,
      model: req.query.model,
      category: req.query.category,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      q: req.query.q,
      sortBy: req.query.sortBy || 'price',
      order: req.query.order || 'ASC',
      limit,
      offset
    };

    const products = await db.getProducts(options);
    const total = await db.countProducts(options);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.get('/facets', async (req, res) => {
  try {
    const q = req.query.q;
    const facets = await db.getProductFacets({ q });
    res.json({
      success: true,
      data: facets
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.get('/compare', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ success: false, error: 'Se requiere el parámetro de búsqueda "q"' });
  }

  try {
    const products = await db.searchAndCompare(query);
    
    
    const comparison = {
      query,
      total: products.length,
      by_provider: {
        mundoparts: products.filter(p => p.provider === 'mundoparts'),
        fastcheap: products.filter(p => p.provider === 'fastcheap')
      },
      cheapest: products.length > 0 ? products[0] : null
    };

    res.json({ success: true, data: comparison });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


router.post('/scrape', (req, res) => {
  if (isScraping) {
    return res.status(409).json({ success: false, message: 'El proceso de scraping ya está ejecutándose en segundo plano.' });
  }

  isScraping = true;
  console.log('API: Solicitud de scraping iniciada en segundo plano.');

  
  runScrapers()
    .then(() => {
      console.log('API: Proceso de scraping en segundo plano finalizado.');
    })
    .catch((err) => {
      console.error('API: Error durante el scraping en segundo plano:', err.message);
    })
    .finally(() => {
      isScraping = false;
    });

  res.json({
    success: true,
    message: 'Scraping iniciado en segundo plano. Los datos se actualizarán gradualmente.'
  });
});


router.get('/scrape-status', (req, res) => {
  res.json({
    success: true,
    is_scraping: isScraping
  });
});

/**
 * POST /api/products/update-catalog
 * Recibe lotes de productos desde el scraper local para guardarlos en la base de datos de Render.
 */
router.post('/update-catalog', async (req, res) => {
  const { apiKey, products } = req.body;
  const serverApiKey = process.env.API_KEY || 'cellparts-secret-key';
  
  if (apiKey !== serverApiKey) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }
  
  if (!Array.isArray(products)) {
    return res.status(400).json({ success: false, error: 'Se esperaba un array de productos' });
  }
  
  try {
    console.log(`API: Guardando lote de ${products.length} productos...`);
    for (const p of products) {
      await db.saveProduct(p);
    }
    res.json({ success: true, message: `Lote de ${products.length} productos procesado con éxito.` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
