const axios = require('axios');
const cheerio = require('cheerio');
const { normalizeProduct } = require('../services/normalizer');
const { saveProduct } = require('../db/database');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Parsea el precio de forma robusta.
 */
function parsePrice(priceText) {
  if (!priceText) return 0;
  let cleaned = priceText.replace(/[^\d.,]/g, '');
  
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
  } else if (lastDot > lastComma) {
    cleaned = cleaned.replace(/,/g, '');
  } else {
    cleaned = cleaned.replace(/,/g, '.');
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

async function scrapeOneService() {
  console.log('--- Iniciando Scraping de OneService ---');
  let page = 1;
  let totalSaved = 0;
  let consecutiveErrors = 0;
  const maxErrors = 3;
  const seenUrls = new Set();

  while (true) {
    console.log(`OneService: Scrapeando página ${page}...`);
    const url = page === 1 ? 'https://oneservice.ar/tienda/' : `https://oneservice.ar/tienda/page/${page}/`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        },
        timeout: 15000
      });
      
      consecutiveErrors = 0; // Resetear contador de errores
      const $ = cheerio.load(response.data);
      
      const productElements = $('.product-grid-item, .product-wrapper, li.product, .product');
      console.log(`OneService: Se encontraron ${productElements.length} productos en la página ${page}.`);
      
      if (productElements.length === 0) {
        console.log('OneService: No se encontraron más productos o fin de catálogo. Finalizando.');
        break;
      }

      let newProductsOnPage = 0;

      for (let i = 0; i < productElements.length; i++) {
        const el = productElements[i];
        
        // Extraer URL
        const linkEl = $(el).find('a.product-image-link, .woocommerce-LoopProduct-link, h3.wd-entities-title a, h3.product-title a').first();
        let productUrl = linkEl.attr('href');
        if (!productUrl) continue;

        if (seenUrls.has(productUrl)) {
          continue;
        }
        seenUrls.add(productUrl);
        newProductsOnPage++;

        // Extraer nombre original
        let originalName = linkEl.text().trim();
        if (!originalName) {
          originalName = $(el).find('.wd-entities-title, .product-title, .woocommerce-loop-product__title').first().text().trim();
        }
        if (!originalName) continue;

        // Extraer precio
        const priceEl = $(el).find('.price ins .woocommerce-Price-amount, .price .woocommerce-Price-amount, .woocommerce-Price-amount').last();
        const price = parsePrice(priceEl.text());

        // Extraer imagen (Woodmart y WooCommerce estándares)
        const imgEl = $(el).find('img.wp-post-image, img.front-image, .product-image img, img').first();
        let imageUrl = null;
        if (imgEl.length > 0) {
          imageUrl = imgEl.attr('data-lazy-src') || imgEl.attr('data-src') || imgEl.attr('src');
          if (!imageUrl && imgEl.attr('data-srcset')) {
            imageUrl = imgEl.attr('data-srcset').split(',')[0].trim().split(' ')[0];
          }
        }

        // Stock
        const isOutOfStock = $(el).hasClass('out-of-stock') || 
                            $(el).find('.out-of-stock').length > 0 ||
                            $(el).text().toLowerCase().includes('agotado') ||
                            $(el).text().toLowerCase().includes('sin stock');
        const stock = isOutOfStock ? 0 : 1;

        // Normalizar
        const normalized = normalizeProduct(originalName);

        // Guardar
        const product = {
          provider: 'oneservice',
          original_name: originalName,
          clean_name: normalized.clean_name,
          brand: normalized.brand,
          model: normalized.model,
          category: normalized.category,
          price: price,
          currency: 'ARS',
          stock: stock,
          url: productUrl,
          image_url: imageUrl
        };

        try {
          await saveProduct(product);
          totalSaved++;
        } catch (dbErr) {
          console.error(`OneService: Error guardando ${originalName} en base de datos:`, dbErr.message);
        }
      }

      console.log(`OneService: Procesados ${newProductsOnPage} productos de la página ${page}.`);

      if (newProductsOnPage === 0) {
        console.log('OneService: No hay productos nuevos en esta página. Finalizando.');
        break;
      }

      page++;
      await delay(1000); // Respeto al servidor

    } catch (error) {
      consecutiveErrors++;
      console.error(`OneService: Error cargando página ${page} (Intento de error consecutivo: ${consecutiveErrors}):`, error.message);
      
      // Si recibimos un 404, significa que pasamos la última página de la tienda
      if (error.response && error.response.status === 404) {
        console.log('OneService: Página no encontrada (404). Fin del catálogo reached.');
        break;
      }
      
      if (consecutiveErrors >= maxErrors) {
        console.error('OneService: Demasiados errores consecutivos. Deteniendo scraping.');
        break;
      }
      
      page++;
      await delay(3000);
    }
  }

  console.log(`--- Scraping de OneService finalizado. Total guardado/actualizado: ${totalSaved} ---`);
  return totalSaved;
}

module.exports = { scrapeOneService };
