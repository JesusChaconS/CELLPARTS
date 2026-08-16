/**
 * CELL-PARTS - Servidor Express.
 * Configura middlewares, sirve los archivos estáticos e inicializa las rutas y la conexión a la base de datos.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db/database');
const productsRouter = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));


app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});


app.use('/api/products', productsRouter);


app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});


async function start() {
  try {
    
    await initDb();
    
    app.listen(PORT, () => {
      console.log(`=============================================`);
      console.log(` Servidor levantado con éxito`);
      console.log(` Puerto: http://localhost:${PORT}`);
      console.log(` Estado API: http://localhost:${PORT}/api/health`);
      console.log(`=============================================`);
    });
  } catch (error) {
    console.error('Error crítico iniciando servidor:', error.message);
    process.exit(1);
  }
}

start();
