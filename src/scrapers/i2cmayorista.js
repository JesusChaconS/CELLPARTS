const axios = require('axios');
const cheerio = require('cheerio');
const { normalizeProduct } = require('../services/normalizer');
const { saveProduct } = require('../db/database');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Parsea el precio de forma robusta soportando comas y puntos.
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

async function scrapeI2CMayorista() {
  console.log('--- Iniciando Scraping de i2C Mayorista ---');
  let page = 1;
  let totalSaved = 0;
  let consecutiveErrors = 0;
  const maxErrors = 3;
  const seenUrls = new Set();

  while (true) {
    console.log(`i2C Mayorista: Scrapeando página ${page}...`);
    const url = `https://www.i2cmayorista.com/productos/?page=${page}`;
    
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
      
      const itemElements = $('.js-item-product');
      console.log(`i2C Mayorista: Se encontraron ${itemElements.length} productos en la página ${page}.`);
      
      if (itemElements.length === 0) {
        console.log('i2C Mayorista: No se encontraron más productos. Finalizando scraping.');
        break;
      }

      let newProductsOnPage = 0;

      for (let i = 0; i < itemElements.length; i++) {
        const el = itemElements[i];
        
        // Extraer URL
        const linkEl = $(el).find('a.item-link, a.product-item-link, a.js-item-name').first();
        let productUrl = linkEl.attr('href');
        if (!productUrl) continue;
        
        // Asegurar URL absoluta
        if (productUrl.startsWith('//')) {
          productUrl = 'https:' + productUrl;
        } else if (productUrl.startsWith('/')) {
          productUrl = 'https://www.i2cmayorista.com' + productUrl;
        }

        if (seenUrls.has(productUrl)) {
          continue;
        }
        seenUrls.add(productUrl);
        newProductsOnPage++;

        // Extraer nombre original
        const originalName = $(el).find('.item-name, .js-item-name, .product-item-name').first().text().trim();
        if (!originalName) continue;

        // Extraer precio
        const priceEl = $(el).find('.item-price, .js-price-display, .product-item-price').first();
        const price = parsePrice(priceEl.text());

        // Extraer imagen
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

        // Stock (Tiendanube JSON o visibilidad de etiquetas)
        let stock = 1;
        const variantsContainer = $(el).find('[data-variants]');
        const variantsStr = variantsContainer.attr('data-variants');
        if (variantsStr) {
          try {
            const decoded = variantsStr.replace(/&quot;/g, '"');
            const variants = JSON.parse(decoded);
            const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
            stock = totalStock > 0 ? totalStock : 0;
          } catch (e) {
            // Fallback
            const stockLabel = $(el).find('.js-stock-label, .stock-label, .out-of-stock');
            if (stockLabel.length > 0) {
              const style = stockLabel.attr('style') || '';
              const isHidden = style.replace(/\s+/g, '').includes('display:none') || stockLabel.hasClass('hidden') || stockLabel.hasClass('hide');
              if (stockLabel.text().toLowerCase().includes('sin stock') && !isHidden) {
                stock = 0;
              }
            }
          }
        } else {
          const stockLabel = $(el).find('.js-stock-label, .stock-label, .out-of-stock');
          if (stockLabel.length > 0) {
            const style = stockLabel.attr('style') || '';
            const isHidden = style.replace(/\s+/g, '').includes('display:none') || stockLabel.hasClass('hidden') || stockLabel.hasClass('hide');
            if (stockLabel.text().toLowerCase().includes('sin stock') && !isHidden) {
              stock = 0;
            }
          }
        }

        // Normalizar
        const normalized = normalizeProduct(originalName);

        // Guardar
        const product = {
          provider: 'i2c',
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
          console.error(`i2C Mayorista: Error guardando ${originalName} en base de datos:`, dbErr.message);
        }
      }

      console.log(`i2C Mayorista: Procesados ${newProductsOnPage} productos de la página ${page}.`);

      if (newProductsOnPage === 0) {
        console.log('i2C Mayorista: No hay productos nuevos en esta página. Finalizando.');
        break;
      }

      page++;
      await delay(1000); // Respeto al servidor

    } catch (error) {
      consecutiveErrors++;
      console.error(`i2C Mayorista: Error cargando página ${page} (Intento de error consecutivo: ${consecutiveErrors}):`, error.message);
      
      if (consecutiveErrors >= maxErrors) {
        console.error('i2C Mayorista: Demasiados errores consecutivos. Deteniendo scraping.');
        break;
      }
      
      page++;
      await delay(3000);
    }
  }

  console.log(`--- Scraping de i2C Mayorista finalizado. Total guardado/actualizado: ${totalSaved} ---`);
  return totalSaved;
}

module.exports = { scrapeI2CMayorista };
