/**
 * CELL-PARTS - Scraper de Mundo Parts.
 * Extrae la lista de repuestos y sus precios actualizados desde Mundo Parts.
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

async function scrapeMundoParts() {
  console.log('--- Iniciando Scraping de Mundo Parts ---');
  let page = 1;
  let totalSaved = 0;
  let consecutiveErrors = 0;
  const maxErrors = 3;
  const seenUrls = new Set();

  while (true) {
    console.log(`Mundo Parts: Scrapeando página ${page}...`);
    const url = `https://www.mundopartsrepuestos.com/productos/?page=${page}`;
    
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
      
      const itemElements = $('.js-item-product');
      console.log(`Mundo Parts: Se encontraron ${itemElements.length} productos en la página ${page}.`);
      
      if (itemElements.length === 0) {
        console.log('Mundo Parts: No se encontraron más productos. Finalizando scraping.');
        break;
      }

      let newProductsOnPage = 0;

      for (let i = 0; i < itemElements.length; i++) {
        const el = itemElements[i];
        
        
        const linkEl = $(el).find('a.product-item-link, a.js-item-name');
        let productUrl = linkEl.attr('href');
        if (!productUrl) continue;
        
        
        if (productUrl.startsWith('//')) {
          productUrl = 'https:' + productUrl;
        } else if (productUrl.startsWith('/')) {
          productUrl = 'https://www.mundopartsrepuestos.com' + productUrl;
        }

        
        if (seenUrls.has(productUrl)) {
          continue;
        }
        seenUrls.add(productUrl);
        newProductsOnPage++;

        
        const originalName = $(el).find('.js-item-name, .product-item-name').first().text().trim();
        if (!originalName) continue;

        
        const priceEl = $(el).find('.js-price-display, .product-item-price').first();
        const price = parsePrice(priceEl.text());

        
        const imgEl = $(el).find('.js-product-item-image-private, .product-item-image, .js-item-image, .item-image-img').first();
        let imageUrl = null;
        if (imgEl.length > 0) {
          const dataSrcset = imgEl.attr('data-srcset');
          const dataSrc = imgEl.attr('data-src');
          const src = imgEl.attr('src');
          
          if (dataSrcset) {
            const urls = dataSrcset.split(',').map(item => item.trim().split(' ')[0]);
            const mediumUrl = urls.find(u => u.includes('-240-') || u.includes('-320-') || u.includes('-480-'));
            imageUrl = mediumUrl || urls[0];
          } else {
            imageUrl = dataSrc || src;
          }
        }
        if (imageUrl && imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        }

        
        let stock = 1;
        const stockLabel = $(el).find('.js-stock-label, .stock-label, .out-of-stock');
        if (stockLabel.length > 0) {
          const style = stockLabel.attr('style') || '';
          const isHidden = style.replace(/\s+/g, '').includes('display:none') || stockLabel.hasClass('hidden') || stockLabel.hasClass('hide');
          if (stockLabel.text().toLowerCase().includes('sin stock') && !isHidden) {
            stock = 0;
          }
        }

        
        const normalized = normalizeProduct(originalName);

        
        const product = {
          provider: 'mundoparts',
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
        console.log('Mundo Parts: Todos los productos de esta página ya fueron procesados. Finalizando.');
        break;
      }

      console.log(`Mundo Parts: Procesados ${newProductsOnPage} productos de la página ${page}.`);
      
      
      page++;
      await delay(1500);

    } catch (error) {
      console.error(`Mundo Parts: Error scraping página ${page}:`, error.message);
      consecutiveErrors++;
      if (consecutiveErrors >= maxErrors) {
        console.error('Mundo Parts: Demasiados errores consecutivos. Abortando scraper.');
        break;
      }
      console.log(`Reintentando página ${page} en 5 segundos...`);
      await delay(5000);
    }
  }

  console.log(`--- Scraping de Mundo Parts finalizado. Total guardado/actualizado: ${totalSaved} ---`);
  return totalSaved;
}

module.exports = { scrapeMundoParts };
