/**
 * CELL-PARTS - Test de Scraper de Imágenes.
 * Prueba aislada del funcionamiento de la extracción de imágenes.
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const url = 'https://www.mundopartsrepuestos.com/productos/?page=1';
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(html);
    const itemElements = $('.js-item-product');
    
    console.log('Resultados de prueba para imágenes en Mundo Parts (Primeros 5):');
    for (let i = 0; i < Math.min(5, itemElements.length); i++) {
      const el = itemElements[i];
      const originalName = $(el).find('.js-item-name, .product-item-name').first().text().trim();
      
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
      
      console.log(`- Producto: ${originalName}`);
      console.log(`  Imagen: ${imageUrl}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
