const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all(`
  SELECT provider,
    COUNT(*) as total,
    SUM(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 ELSE 0 END) as null_img,
    SUM(CASE WHEN image_url LIKE 'data:%' THEN 1 ELSE 0 END) as data_uri
  FROM products GROUP BY provider
`, (_, rows) => {
  console.log('Stats:', rows);
  db.all(`SELECT original_name, image_url FROM products WHERE image_url IS NULL OR image_url = '' OR image_url LIKE 'data:%' LIMIT 5`, (_, bad) => {
    console.log('Bad samples:', bad);
    db.close();
  });
});
