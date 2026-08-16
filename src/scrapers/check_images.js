const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('=== IMÁGENES DE MUNDO PARTS ===');
  db.all('SELECT original_name, image_url, url FROM products WHERE provider = "mundoparts" LIMIT 10', (err, rows) => {
    if (err) console.error(err);
    rows.forEach(r => console.log(`- Nombre: ${r.original_name}\n  Img: ${r.image_url}\n  URL: ${r.url}\n`));
  });

  console.log('\n=== IMÁGENES DE FAST CHEAP ===');
  db.all('SELECT original_name, image_url, url FROM products WHERE provider = "fastcheap" LIMIT 10', (err, rows) => {
    if (err) console.error(err);
    rows.forEach(r => console.log(`- Nombre: ${r.original_name}\n  Img: ${r.image_url}\n  URL: ${r.url}\n`));
    db.close();
  });
});
