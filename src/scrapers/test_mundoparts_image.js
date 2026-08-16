/**
 * CELL-PARTS - Test de Imágenes de Mundo Parts.
 * Prueba aislada del scraper de imágenes enfocado en selectores de Mundo Parts.
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
    const item = $('.js-item-product').first();
    const imageContainer = item.find('.js-product-item-image-container-private, .product-item-image-container');
    
    console.log('HTML de la sección de imagen:');
    console.log(imageContainer.html());
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
