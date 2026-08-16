/**
 * CELL-PARTS - Sincronizador de Base de Datos.
 * Sube el contenido de la base de datos SQLite local al servidor remoto en Render.
 */
require('dotenv').config();
const db = require('../db/database');
const axios = require('axios');

async function runSync() {
  const remoteUrl = process.env.REMOTE_API_URL;
  const apiKey = process.env.API_KEY || 'cellparts-secret-key';
  
  if (!remoteUrl) {
    console.error('Error: REMOTE_API_URL no está configurado en tu archivo .env local.');
    process.exit(1);
  }
  
  console.log(`=== INICIANDO SUBIDA MANUAL DE BASE DE DATOS LOCAL ===`);
  console.log(`Servidor de Destino: ${remoteUrl}`);
  
  try {
    // Obtener todos los productos de la base de datos local
    const products = await db.getProducts({ limit: 100000 });
    console.log(`Se encontraron ${products.length} productos en la base de datos local.`);
    
    if (products.length === 0) {
      console.log('No hay productos locales para subir. Cancela.');
      process.exit(0);
    }
    
    // Subir en lotes de 100 productos
    const batchSize = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(products.length / batchSize);
      
      console.log(`[Lote ${batchNum}/${totalBatches}] Enviando ${batch.length} productos...`);
      
      const response = await axios.post(`${remoteUrl}/api/products/update-catalog`, {
        apiKey,
        products: batch
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000
      });
      
      if (!response.data.success) {
        console.error(`Error en el lote ${batchNum}:`, response.data.error);
        process.exit(1);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=============================================`);
    console.log(`=== SINCRONIZACIÓN EXITOSA ===`);
    console.log(`- Total productos sincronizados: ${products.length}`);
    console.log(`- Tiempo transcurrido: ${duration} segundos`);
    console.log(`=============================================\n`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error durante la sincronización:', err.message);
    process.exit(1);
  }
}

runSync();
