/**
 * CELL-PARTS - Scraper de Fast Cheap.
 * Extrae repuestos, precios y stock del catálogo del distribuidor Fast Cheap.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { normalizeProduct } = require('../services/normalizer');
const { saveProduct } = require('../db/database');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


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

async function scrapeFastCheap() {
  console.log('--- Iniciando Scraping de Fast Cheap ---');
  let page = 1;
  let totalSaved = 0;
  let consecutiveErrors = 0;
  const maxErrors = 3;
  const seenUrls = new Set();

  while (true) {
    console.log(`Fast Cheap: Scrapeando página ${page}...`);
    const url = `https://www.fast-cheap.com.ar/shop/page/${page}/`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        },
        timeout: 15000
      });
      
      consecutiveErrors = 0; 
      const $ = cheerio.load(response.data);
      
      
      
      const productElements = $('.product-wrapper, li.product');
      console.log(`Fast Cheap: Se encontraron ${productElements.length} productos en la página ${page}.`);
      
      if (productElements.length === 0) {
        console.log('Fast Cheap: No se encontraron más productos. Finalizando scraping.');
        break;
      }

      let newProductsOnPage = 0;

      for (let i = 0; i < productElements.length; i++) {
        const el = productElements[i];
        
        
        const linkEl = $(el).find('h3.product-title a, .woocommerce-LoopProduct-link');
        let productUrl = linkEl.attr('href');
        if (!productUrl) continue;

        if (seenUrls.has(productUrl)) {
          continue;
        }
        seenUrls.add(productUrl);
        newProductsOnPage++;

        
        const originalName = linkEl.text().trim();
        if (!originalName) continue;

        
        const priceEl = $(el).find('.price ins .woocommerce-Price-amount, .price .woocommerce-Price-amount').last();
        const price = parsePrice(priceEl.text());

        
        const imgEl = $(el).find('.product-image img.front-image, .product-image img, img.attachment-woocommerce_thumbnail').first();
        const imageUrl = imgEl.attr('src') || imgEl.attr('data-src');

        
        
        const isOutOfStock = $(el).hasClass('out-of-stock') || 
                            $(el).find('.out-of-stock').length > 0 ||
                            $(el).text().toLowerCase().includes('agotado') ||
                            $(el).text().toLowerCase().includes('sin stock');
        const stock = isOutOfStock ? 0 : 1;

        
        const normalized = normalizeProduct(originalName);

        
        const product = {
          provider: 'fastcheap',
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
          console.error(`Error guardando producto ${productUrl}:`, dbErr.message);
        }
      }

      if (newProductsOnPage === 0) {
        console.log('Fast Cheap: Todos los productos de esta página ya fueron procesados. Finalizando.');
        break;
      }

      console.log(`Fast Cheap: Procesados ${newProductsOnPage} productos nuevos de la página ${page}.`);
      
      page++;
      await delay(1500); 

    } catch (error) {
      
      if (error.response && error.response.status === 404) {
        console.log(`Fast Cheap: Página ${page} devolvió 404 (Fin de la tienda). Finalizando scraping.`);
        break;
      }
      
      console.error(`Fast Cheap: Error scraping página ${page}:`, error.message);
      consecutiveErrors++;
      if (consecutiveErrors >= maxErrors) {
        console.error('Fast Cheap: Demasiados errores consecutivos. Abortando scraper.');
        break;
      }
      
      console.log(`Reintentando página ${page} en 5 segundos...`);
      await delay(5000);
    }
  }

  console.log(`--- Scraping de Fast Cheap finalizado. Total guardado/actualizado: ${totalSaved} ---`);
  return totalSaved;
}

module.exports = { scrapeFastCheap };
