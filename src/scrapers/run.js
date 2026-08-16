const { initDb } = require('../db/database');
const { scrapeMundoParts } = require('./mundoparts');
const { scrapeFastCheap } = require('./fastcheap');
const { scrapeI2CMayorista } = require('./i2cmayorista');
const { scrapeOneService } = require('./oneservice');
const { scrapeUniontools } = require('./uniontools');

async function run() {
  const startTime = Date.now();
  console.log('=== INICIANDO PROCESO GENERAL DE SCRAPING ===');
  
  try {
    // 1. Inicializar base de datos
    await initDb();
    
    // Obtener argumentos de consola para filtrar scraper si se desea
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
    
  } catch (error) {
    console.error('Error crítico durante la orquestación del scraping:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  run();
}

module.exports = { run };
