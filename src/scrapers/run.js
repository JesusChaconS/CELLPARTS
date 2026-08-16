/**
 * CELL-PARTS - Orquestador de Scrapers.
 * Ejecuta de forma secuencial los scrapers de todos los proveedores e inserta/actualiza los registros en la base de datos.
 */

const db = require('../db/database');
const { initDb } = db;
const { scrapeMundoParts } = require('./mundoparts');
const { scrapeFastCheap } = require('./fastcheap');
const { scrapeI2CMayorista } = require('./i2cmayorista');
const { scrapeOneService } = require('./oneservice');
const { scrapeUniontools } = require('./uniontools');
const axios = require('axios');

async function run() {
  const startTime = Date.now();
  console.log('=== INICIANDO PROCESO GENERAL DE SCRAPING ===');
  
  try {
    
    await initDb();
    
    
    const args = process.argv.slice(2);
    const targetScraper = args.find(arg => arg.startsWith('--only='))?.split('=')[1];
    
    let totalMundo = 0;
    let totalFast = 0;
    let totalI2c = 0;
    let totalOneService = 0;
    let totalUniontools = 0;
    
    if (!targetScraper || targetScraper === 'mundoparts') {
      try {
        totalMundo = await scrapeMundoParts();
      } catch (err) {
        console.error('Error crítico ejecutando scraper de Mundo Parts:', err.message);
      }
    }
    
    if (!targetScraper || targetScraper === 'fastcheap') {
      try {
        totalFast = await scrapeFastCheap();
      } catch (err) {
        console.error('Error crítico ejecutando scraper de Fast Cheap:', err.message);
      }
    }

    if (!targetScraper || targetScraper === 'i2cmayorista') {
      try {
        totalI2c = await scrapeI2CMayorista();
      } catch (err) {
        console.error('Error crítico ejecutando scraper de i2C Mayorista:', err.message);
      }
    }

    if (!targetScraper || targetScraper === 'oneservice') {
      try {
        totalOneService = await scrapeOneService();
      } catch (err) {
        console.error('Error crítico ejecutando scraper de OneService:', err.message);
      }
    }

    if (!targetScraper || targetScraper === 'uniontools') {
      try {
        totalUniontools = await scrapeUniontools();
      } catch (err) {
        console.error('Error crítico ejecutando scraper de Uniontools:', err.message);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log('\n=============================================');
    console.log('=== SCRAPING COMPLETADO CON ÉXITO ===');
    console.log(`- Mundo Parts: ${totalMundo} productos guardados/actualizados`);
    console.log(`- Fast Cheap: ${totalFast} productos guardados/actualizados`);
    console.log(`- i2C Mayorista: ${totalI2c} productos guardados/actualizados`);
    console.log(`- OneService: ${totalOneService} productos guardados/actualizados`);
    console.log(`- Uniontools: ${totalUniontools} productos guardados/actualizados`);
    console.log(`- Tiempo total: ${duration} minutos`);
    console.log('=============================================\n');
    
    // Sincronizar automáticamente con el servidor de producción si está configurada la URL
    await syncWithRemote();
    
  } catch (error) {
    console.error('Error crítico durante la orquestación del scraping:', error.message);
    process.exit(1);
  }
}

/**
 * Envía los productos de la base de datos local al backend en Render
 */
async function syncWithRemote() {
  const remoteUrl = process.env.REMOTE_API_URL;
  const apiKey = process.env.API_KEY || 'cellparts-secret-key';
  
  if (!remoteUrl) {
    console.log('Sincronización: REMOTE_API_URL no configurado. Sincronización remota omitida.');
    return;
  }
  
  console.log(`\n--- Iniciando Sincronización con Servidor Remoto: ${remoteUrl} ---`);
  
  try {
    // Obtener todos los productos de la BD local
    const products = await db.getProducts({ limit: 100000 });
    console.log(`Sincronización: Se encontraron ${products.length} productos locales para sincronizar.`);
    
    // Subir en lotes de 250 productos
    const batchSize = 250;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      console.log(`Sincronización: Enviando lote ${Math.floor(i / batchSize) + 1} (${batch.length} productos)...`);
      
      const response = await axios.post(`${remoteUrl}/api/products/update-catalog`, {
        apiKey,
        products: batch
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000
      });
      
      if (!response.data.success) {
        console.error('Sincronización: Error en el servidor remoto:', response.data.error);
        break;
      }
    }
    console.log('--- Sincronización Remota Completada con Éxito ---\n');
  } catch (err) {
    console.error('Sincronización: Error crítico durante el envío:', err.message);
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
