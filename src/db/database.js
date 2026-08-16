/**
 * CELL-PARTS - Conexión y Gestión de Base de Datos SQLite.
 * Inicializa las tablas, crea índices e implementa las funciones de consulta, búsqueda y guardado de productos.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'database.sqlite');
const parentDir = path.dirname(dbPath);

if (!fs.existsSync(parentDir)) {
  fs.mkdirSync(parentDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);
db.configure("busyTimeout", 15000); 


function applySearchQuery(sql, params, q) {
  if (!q) return sql;
  
  const words = q.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  let modifiedSql = sql;
  
  words.forEach(word => {
    modifiedSql += ' AND (clean_name LIKE ? OR brand LIKE ? OR model LIKE ? OR category LIKE ?';
    params.push(`%${word}%`, `%${word}%`, `%${word}%`, `%${word}%`);
    
    
    if (word === 'samsung' || word === 'sam') {
      modifiedSql += ' OR brand = "Samsung" OR clean_name LIKE "%sam%"';
    } else if (word === 'motorola' || word === 'moto') {
      modifiedSql += ' OR brand = "Motorola" OR clean_name LIKE "%moto%"';
    } else if (word === 'iphone' || word === 'apple' || word === 'ip') {
      modifiedSql += ' OR brand = "Apple" OR clean_name LIKE "%ip%" OR clean_name LIKE "%iphone%"';
    } else if (word === 'xiaomi' || word === 'redmi' || word === 'xiomi' || word === 'mi') {
      modifiedSql += ' OR brand = "Xiaomi" OR clean_name LIKE "%xi%" OR clean_name LIKE "%red%" OR clean_name LIKE "%xiaomi%"';
    }
    
    modifiedSql += ')';
  });
  
  return modifiedSql;
}


function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider TEXT NOT NULL,
          original_name TEXT NOT NULL,
          clean_name TEXT NOT NULL,
          brand TEXT,
          model TEXT,
          category TEXT,
          price REAL NOT NULL,
          currency TEXT DEFAULT 'ARS',
          stock INTEGER DEFAULT 1,
          url TEXT NOT NULL UNIQUE,
          image_url TEXT,
          scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);
      });

      
      const indices = [
        'CREATE INDEX IF NOT EXISTS idx_products_clean_name ON products(clean_name)',
        'CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand)',
        'CREATE INDEX IF NOT EXISTS idx_products_model ON products(model)',
        'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
        'CREATE INDEX IF NOT EXISTS idx_products_provider ON products(provider)',
        'CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)'
      ];

      let completed = 0;
      for (const sql of indices) {
        db.run(sql, (err) => {
          if (err) return reject(err);
          completed++;
          if (completed === indices.length) {
            console.log('Base de datos inicializada correctamente en: ' + dbPath);
            resolve();
          }
        });
      }
    });
  });
}


function saveProduct(product) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO products (provider, original_name, clean_name, brand, model, category, price, currency, stock, url, image_url, scraped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(url) DO UPDATE SET
        original_name = excluded.original_name,
        clean_name = excluded.clean_name,
        brand = excluded.brand,
        model = excluded.model,
        category = excluded.category,
        price = excluded.price,
        stock = excluded.stock,
        image_url = excluded.image_url,
        scraped_at = CURRENT_TIMESTAMP
    `;

    db.run(
      sql,
      [
        product.provider,
        product.original_name,
        product.clean_name,
        product.brand || null,
        product.model || null,
        product.category || null,
        product.price,
        product.currency || 'ARS',
        product.stock !== undefined ? product.stock : 1,
        product.url,
        product.image_url || null
      ],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
}


function appendMultiSelectFilter(sql, params, field, valueString) {
  if (!valueString) return sql;
  const values = valueString.split(',').map(v => v.trim()).filter(Boolean);
  if (values.length === 0) return sql;
  
  const placeholders = values.map(() => '?').join(', ');
  return sql + ` AND ${field} IN (${placeholders})`;
}

function getMultiSelectParams(valueString) {
  if (!valueString) return [];
  return valueString.split(',').map(v => v.trim()).filter(Boolean);
}


function getProducts(options = {}) {
  return new Promise((resolve, reject) => {
    const { provider, brand, model, category, minPrice, maxPrice, q, limit = 50, offset = 0, sortBy = 'price', order = 'ASC' } = options;

    let sql = 'SELECT * FROM products WHERE (stock IS NULL OR stock > 0) AND price > 0';
    const params = [];

    
    if (provider) {
      sql = appendMultiSelectFilter(sql, params, 'provider', provider);
      params.push(...getMultiSelectParams(provider));
    }
    if (brand) {
      sql = appendMultiSelectFilter(sql, params, 'brand', brand);
      params.push(...getMultiSelectParams(brand));
    }
    if (model) {
      sql += ' AND model = ?';
      params.push(model);
    }
    if (category) {
      sql = appendMultiSelectFilter(sql, params, 'category', category);
      params.push(...getMultiSelectParams(category));
    }
    if (minPrice !== undefined) {
      sql += ' AND price >= ?';
      params.push(minPrice);
    }
    if (maxPrice !== undefined) {
      sql += ' AND price <= ?';
      params.push(maxPrice);
    }
    if (q) {
      sql = applySearchQuery(sql, params, q);
    }

    
    const allowedSort = ['price', 'scraped_at', 'brand', 'model'];
    const sortField = allowedSort.includes(sortBy) ? sortBy : 'price';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    sql += ` ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}


function countProducts(options = {}) {
  return new Promise((resolve, reject) => {
    const { provider, brand, model, category, minPrice, maxPrice, q } = options;

    let sql = 'SELECT COUNT(*) as count FROM products WHERE (stock IS NULL OR stock > 0) AND price > 0';
    const params = [];

    if (provider) {
      sql = appendMultiSelectFilter(sql, params, 'provider', provider);
      params.push(...getMultiSelectParams(provider));
    }
    if (brand) {
      sql = appendMultiSelectFilter(sql, params, 'brand', brand);
      params.push(...getMultiSelectParams(brand));
    }
    if (model) {
      sql += ' AND model = ?';
      params.push(model);
    }
    if (category) {
      sql = appendMultiSelectFilter(sql, params, 'category', category);
      params.push(...getMultiSelectParams(category));
    }
    if (minPrice !== undefined) {
      sql += ' AND price >= ?';
      params.push(minPrice);
    }
    if (maxPrice !== undefined) {
      sql += ' AND price <= ?';
      params.push(maxPrice);
    }
    if (q) {
      sql = applySearchQuery(sql, params, q);
    }

    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.count : 0);
    });
  });
}


function getProductFacets(options = {}) {
  return new Promise((resolve, reject) => {
    const { q } = options;
    
    let baseSql = 'WHERE (stock IS NULL OR stock > 0) AND price > 0';
    const baseParams = [];
    if (q) {
      baseSql = applySearchQuery(baseSql, baseParams, q);
    }
    
    const queries = {
      prices: `SELECT MIN(price) as minPrice, MAX(price) as maxPrice FROM products ${baseSql}`,
      brands: `SELECT brand, COUNT(*) as count FROM products ${baseSql} AND brand IS NOT NULL AND brand != "" GROUP BY brand ORDER BY count DESC`,
      categories: `SELECT category, COUNT(*) as count FROM products ${baseSql} AND category IS NOT NULL AND category != "" GROUP BY category ORDER BY count DESC`,
      providers: `SELECT provider, COUNT(*) as count FROM products ${baseSql} GROUP BY provider ORDER BY count DESC`
    };
    
    const results = {
      minPrice: 0,
      maxPrice: 0,
      brands: [],
      categories: [],
      providers: []
    };
    
    db.get(queries.prices, baseParams, (err, priceRow) => {
      if (err) return reject(err);
      results.minPrice = priceRow ? (priceRow.minPrice || 0) : 0;
      results.maxPrice = priceRow ? (priceRow.maxPrice || 0) : 0;
      
      db.all(queries.brands, baseParams, (err, brandRows) => {
        if (err) return reject(err);
        results.brands = brandRows || [];
        
        db.all(queries.categories, baseParams, (err, catRows) => {
          if (err) return reject(err);
          results.categories = catRows || [];
          
          db.all(queries.providers, baseParams, (err, provRows) => {
            if (err) return reject(err);
            results.providers = provRows || [];
            resolve(results);
          });
        });
      });
    });
  });
}


function searchAndCompare(query) {
  return new Promise((resolve, reject) => {
    if (!query) return resolve([]);
    
    const words = query.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
    let sql = 'SELECT * FROM products WHERE (stock IS NULL OR stock > 0) AND price > 0';
    const params = [];
    
    sql = applySearchQuery(sql, params, query);
    
    sql += ' ORDER BY price ASC';
    
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  db,
  initDb,
  saveProduct,
  getProducts,
  countProducts,
  getProductFacets,
  searchAndCompare
};
