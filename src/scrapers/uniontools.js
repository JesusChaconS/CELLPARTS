/**
 * CELL-PARTS - Scraper de UnionTools.
 * Indexa insumos de servicio técnico, herramientas y repuestos de UnionTools.
 */

const { exec } = require('child_process');
const { normalizeProduct } = require('../services/normalizer');
const { saveProduct } = require('../db/database');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


function execPowerShell(cmd) {
  return new Promise((resolve, reject) => {
    
    exec(cmd, { maxBuffer: 25 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

async function scrapeUniontools() {
  console.log('--- Iniciando Scraping de Uniontools ---');
  let page = 1;
  let totalSaved = 0;
  let consecutiveErrors = 0;
  const maxErrors = 3;
  const seenUrls = new Set();

  while (true) {
    console.log(`Uniontools: Solicitando página de API ${page}...`);
    const url = `https://uniontools.com.ar/wp-json/wc/store/v1/products?per_page=100&page=${page}`;
    const cmd = `powershell -Command "Invoke-RestMethod -Uri '${url}' | ConvertTo-Json -Depth 10"`;

    try {
      const stdout = await execPowerShell(cmd);
      consecutiveErrors = 0; 
      
      if (!stdout || stdout.trim() === '') {
        console.log('Uniontools: Respuesta vacía de la API. Finalizando scraping.');
        break;
      }

      let parsedData;
      try {
        parsedData = JSON.parse(stdout);
      } catch (parseErr) {
        console.error('Uniontools: Error de parseo JSON. Deteniendo.', parseErr.message);
        break;
      }

      
      let items = [];
      if (parsedData) {
        if (Array.isArray(parsedData)) {
          items = parsedData;
        } else if (parsedData.value && Array.isArray(parsedData.value)) {
          items = parsedData.value;
        } else if (typeof parsedData === 'object' && parsedData.id) {
          items = [parsedData];
        }
      }

      console.log(`Uniontools: Se obtuvieron ${items.length} productos en la página de API ${page}.`);

      if (items.length === 0) {
        console.log('Uniontools: No se devolvieron productos en esta página. Finalizando.');
        break;
      }

      let newProductsOnPage = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        const productUrl = item.permalink;
        if (!productUrl) continue;

        if (seenUrls.has(productUrl)) {
          continue;
        }
        seenUrls.add(productUrl);
        newProductsOnPage++;

        const originalName = item.name;
        if (!originalName) continue;

        
        let rawPrice = item.prices ? parseFloat(item.prices.price) : 0;
        const minorUnit = item.prices && item.prices.currency_minor_unit !== undefined ? item.prices.currency_minor_unit : 0;
        const price = rawPrice / Math.pow(10, minorUnit);

        
        const imageUrl = item.images && item.images[0] ? item.images[0].src : null;

        
        const stock = item.is_in_stock ? 1 : 0;

        
        const normalized = normalizeProduct(originalName);

        
        const product = {
          provider: 'uniontools',
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
          console.error(`Uniontools: Error guardando ${originalName} en base de datos:`, dbErr.message);
        }
      }

      console.log(`Uniontools: Procesados ${newProductsOnPage} productos de la página de API ${page}.`);

      if (newProductsOnPage === 0) {
        console.log('Uniontools: No hay productos nuevos en esta página. Finalizando.');
        break;
      }

      page++;
      await delay(1500); 

    } catch (error) {
      consecutiveErrors++;
      console.error(`Uniontools: Error pidiendo página de API ${page} (Intento de error consecutivo: ${consecutiveErrors}):`, error.message);
      
      if (consecutiveErrors >= maxErrors) {
        console.error('Uniontools: Demasiados errores consecutivos. Deteniendo scraping.');
        break;
      }
      
      page++;
      await delay(3000);
    }
  }

  console.log(`--- Scraping de Uniontools finalizado. Total guardado/actualizado: ${totalSaved} ---`);
  return totalSaved;
}

module.exports = { scrapeUniontools };
