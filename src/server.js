require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db/database');
const productsRouter = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Logger simple para peticiones
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Rutas
app.use('/api/products', productsRouter);

// Ruta de estado general
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Inicializar DB y luego levantar servidor
async function start() {
  try {
    // Asegurar que la BD esté lista
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
