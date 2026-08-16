/**
 * CELL-PARTS - Diagnóstico de Base de Datos.
 * Herramienta para verificar el estado de la BD, realizar conteos y probar consultas.
 */

const { db } = require('../db/database');

db.serialize(() => {
  
  db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
    console.log(`Total de productos en base de datos: ${row.count}`);
  });

  
  db.all('SELECT provider, COUNT(*) as count FROM products GROUP BY provider', (err, rows) => {
    console.log('\nProductos por proveedor:');
    rows.forEach(r => console.log(`- ${r.provider}: ${r.count}`));
  });

  
  db.get('SELECT COUNT(*) as count FROM products WHERE brand IS NOT NULL', (err, row) => {
    console.log(`\nProductos con marca detectada: ${row.count}`);
  });

  
  db.all('SELECT brand, COUNT(*) as count FROM products WHERE brand IS NOT NULL GROUP BY brand ORDER BY count DESC LIMIT 5', (err, rows) => {
    console.log('\nTop 5 marcas más detectadas:');
    rows.forEach(r => console.log(`- ${r.brand}: ${r.count}`));
  });

  
  db.all('SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC', (err, rows) => {
    console.log('\nProductos por categoría:');
    rows.forEach(r => console.log(`- ${r.category || 'Otros'}: ${r.count}`));
  });

  
  db.all(`
    SELECT clean_name, brand, model, category, price, provider, url 
    FROM products 
    WHERE clean_name LIKE '%iphone 11%' AND category = 'Modulo'
    ORDER BY price ASC LIMIT 10
  `, (err, rows) => {
    console.log('\nEjemplos de comparación para Módulos de iPhone 11 (Top 10 más baratos):');
    rows.forEach(r => {
      console.log(`- [${r.provider.toUpperCase()}] ${r.clean_name} -> $${r.price} (URL: ${r.url})`);
    });
    db.close();
  });
});
