/**
 * Elimina acentos y caracteres especiales diacríticos.
 */
function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normaliza y limpia un texto para búsquedas consistentes.
 */
function cleanText(str) {
  if (!str) return '';
  return removeAccents(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s\-\/\+]/g, '') // Mantener letras, números, espacios, guiones, barras y más
    .replace(/\s+/g, ' ');
}

/**
 * Detecta la marca de un dispositivo a partir de su nombre.
 */
function detectBrand(name) {
  const clean = cleanText(name);
  
  if (/\biphone\b|\bipad\b|\bapple\b/i.test(clean)) return 'Apple';
  if (/\bsamsung\b|\bgalaxy\b/i.test(clean)) return 'Samsung';
  if (/\bmotorola\b|\bmoto\b/i.test(clean)) return 'Motorola';
  if (/\bxiaomi\b|\bredmi\b|\bpoco\b|\bmi\b/i.test(clean)) return 'Xiaomi';
  if (/\bhuawei\b/i.test(clean)) return 'Huawei';
  if (/\blg\b/i.test(clean)) return 'LG';
  if (/\balcatel\b/i.test(clean)) return 'Alcatel';
  if (/\btcl\b/i.test(clean)) return 'TCL';
  
  return 'Generico/Otros';
}

/**
 * Detecta la categoría del repuesto a partir de su nombre.
 */
function detectCategory(name) {
  const clean = cleanText(name);
  
  if (/\bmodulo\b|\bpantalla\b|\bdisplay\b|\blcd\b/i.test(clean)) return 'Modulo';
  if (/\bbateria\b|\bbattery\b/i.test(clean)) return 'Bateria';
  if (/\bpin\b.*\bcarga\b|\bficha\b.*\bcarga\b|\bpuerto\b.*\bcarga\b|\bpin de carga\b/i.test(clean)) return 'Pin de Carga';
  if (/\bflex\b/i.test(clean)) return 'Flex';
  if (/\btapa\b.*\btrasera\b|\btapa\b.*\bvidrio\b|\btapa\b/i.test(clean)) {
    // Si contiene pegamento o vidrio de cámara, filtrar
    if (/\bcamara\b/i.test(clean)) return 'Lente de Camara';
    return 'Tapa';
  }
  if (/\bpegamento\b|\bt7000\b|\bb7000\b|\by7000\b|\badhesivo\b/i.test(clean)) return 'Pegamento';
  if (/\bcamara\b.*\bfrontal\b|\bcamara\b.*\bdelantera\b|\bcam frontal\b/i.test(clean)) return 'Camara Frontal';
  if (/\bcamara\b.*\bprincipal\b|\bcamara\b.*\btrasera\b/i.test(clean)) return 'Camara Principal';
  if (/\bglass\b|\bvidrio\b|\btemplado\b/i.test(clean)) return 'Glass';
  if (/\bdestornillador\b|\bfuente\b|\bmultimetro\b|\bpinza\b|\bbrusela\b|\btester\b|\bsoldar\b|\bestacion\b|\bherramienta\b/i.test(clean)) return 'Herramientas';
  
  return 'Otros';
}

/**
 * Detecta e intenta extraer el modelo de dispositivo a partir del nombre.
 */
function detectModel(name, brand) {
  const clean = cleanText(name);
  
  if (brand === 'Apple') {
    // Buscar iPhone seguido de un número y modificadores (pro max, pro, mini, etc)
    const match = clean.match(/\biphone\s+(\d+|x[s|r]?|se|plus)(\s+(pro\s+max|pro|mini|plus))?/i);
    return match ? match[0].toUpperCase() : null;
  }
  
  if (brand === 'Samsung') {
    // Buscar modelos de la serie A (A10, A10s, A52s, A03 Core, etc)
    const matchA = clean.match(/\b(a\d{2}[s|g]?|a\d{3})\b(\s+core)?/i);
    if (matchA) return `Galaxy ${matchA[0].toUpperCase()}`;
    
    // Serie S (S20, S21 Ultra, S22 Plus, etc)
    const matchS = clean.match(/\b(s\d{2})\b(\s+(ultra|plus|fe))?/i);
    if (matchS) return `Galaxy ${matchS[0].toUpperCase()}`;
    
    // Serie J (J7 Prime, J7, J5, etc)
    const matchJ = clean.match(/\b(j\d(\s+prime)?)\b/i);
    if (matchJ) return `Galaxy ${matchJ[0].toUpperCase()}`;
    
    // Serie Note (Note 10 Lite, Note 20, etc)
    const matchNote = clean.match(/\bnote\s+\d+(\s+(lite|ultra|plus))?/i);
    if (matchNote) return `Galaxy ${matchNote[0].toUpperCase()}`;
  }
  
  if (brand === 'Motorola') {
    // Buscar Moto G, Moto E, Moto Edge, etc.
    const matchG = clean.match(/\bmoto\s+(g\d{1,2}|e\d{1,2}|edge\s+\d+)(\s+(play|power|plus|lite|pro|ultra))?/i);
    if (matchG) return matchG[0].toUpperCase();
    
    const matchGShort = clean.match(/\b(g\d{1,2}|e\d{1,2})\s+(play|power|plus|lite|pro)/i);
    if (matchGShort) return `MOTO ${matchGShort[0].toUpperCase()}`;
  }
  
  if (brand === 'Xiaomi') {
    // Redmi Note, Redmi, Poco, etc.
    const matchRedmiNote = clean.match(/\bredmi\s+note\s+\d+[s|pro]?(\s+(pro|s|plus))?/i);
    if (matchRedmiNote) return matchRedmiNote[0].toUpperCase();
    
    const matchRedmi = clean.match(/\bredmi\s+\d+[a-z]?/i);
    if (matchRedmi) return matchRedmi[0].toUpperCase();
    
    const matchPoco = clean.match(/\bpoco\s+(x\d|f\d|m\d)(\s+(pro|nfc|gt))?/i);
    if (matchPoco) return matchPoco[0].toUpperCase();
  }

  // Si no se encuentra un patrón específico, intentar buscar expresiones comunes de modelos como "g8 play", "a30"
  const generalMatch = clean.match(/\b[a-z]\d{2}[a-z]?\b/i);
  if (generalMatch) return generalMatch[0].toUpperCase();

  return null;
}

/**
 * Normaliza todos los datos de un producto.
 */
function normalizeProduct(originalName) {
  const clean_name = cleanText(originalName);
  const brand = detectBrand(originalName);
  const category = detectCategory(originalName);
  const model = detectModel(originalName, brand);
  
  return {
    clean_name,
    brand: brand === 'Generico/Otros' ? null : brand,
    category: category === 'Otros' ? null : category,
    model
  };
}

module.exports = {
  cleanText,
  detectBrand,
  detectCategory,
  detectModel,
  normalizeProduct
};
