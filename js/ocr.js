// ocr.js - Reconocimiento de texto para 3 formatos de albarán con detección automática

const OCR_LANG = 'spa+eng';

// Función principal
async function extraerDatosDeFoto(base64Image) {
  mostrarMensajeOCR("🔍 Leyendo texto del albarán...");

  try {
    const imagenRedimensionada = await resizeImage(base64Image, 1200);
    const { data: { text } } = await Tesseract.recognize(imagenRedimensionada, OCR_LANG, {
      logger: m => console.log(m)
    });

    console.log("Texto OCR completo:\n", text);

    // Detectar tipo de albarán
    const tipo = detectarTipoAlbaran(text);
    console.log("Tipo detectado:", tipo);

    let matricula = null;
    let pesoKg = null;

    switch (tipo) {
      case 'heidelberg':
        matricula = extraerMatriculaHeidelberg(text);
        pesoKg = extraerPesoHeidelberg(text);
        break;
      case 'crh':
        matricula = extraerMatriculaCRH(text);
        pesoKg = extraerPesoCRH(text);
        break;
      case 'lemona':
        matricula = extraerMatriculaLemona(text);
        pesoKg = extraerPesoLemona(text);
        break;
      default:
        // Fallback: usar funciones genéricas
        matricula = extraerMatriculaGenerica(text);
        pesoKg = extraerPesoGenerico(text);
    }

    if (matricula) console.log("Matrícula detectada:", matricula);
    if (pesoKg) console.log("Peso detectado (kg):", pesoKg);

    const mensaje = (matricula && pesoKg)
      ? `✅ ${tipo.toUpperCase()}: Matrícula ${matricula} | ${pesoKg} kg`
      : `⚠️ Datos incompletos. Matrícula: ${matricula || 'no'} | Peso: ${pesoKg || 'no'} kg`;
    mostrarMensajeOCR(mensaje);

    return { matricula, pesoKg, textoCompleto: text, tipo };

  } catch (error) {
    console.error("Error en OCR:", error);
    mostrarMensajeOCR("❌ Error al leer la imagen. Introduce los datos manualmente.");
    return { matricula: null, pesoKg: null, textoCompleto: null, tipo: null };
  }
}

// --- DETECCIÓN DE TIPO DE ALBARÁN---
function detectarTipoAlbaran(texto) {
  const upper = texto.toUpperCase();
  if (upper.includes('HEIDELBERG MATERIALS') || upper.includes('HEIDELBERG MATERIALS HISPANIA'))
    return 'heidelberg';
  if (upper.includes('ORIGEN: ZIERBENA-BIZKAIA') && upper.includes('CRH'))
    return 'crh';
  if (upper.includes('CEMENTOS LEMONA') && (upper.includes('LEMONA@LEMONA.COM') || upper.includes('WWW.LEMONA.COM')))
    return 'lemona';
  return 'desconocido';
}

// --- EXTRACCIÓN MATRÍCULA POR TIPO DE ALBARÁN---
function extraerMatriculaHeidelberg(texto) {
  const match = texto.match(/MATRICULA\s+([A-Z0-9]{6,8})/i);
  return match ? match[1] : null;
}

function extraerMatriculaCRH(texto) {
  const match = texto.match(/MATRICULA:\s*([A-Z0-9]{6,8})/i);
  return match ? match[1] : null;
}

function extraerMatriculaLemona(texto) {
  // Busca patrón 4 números y 3 letras (puede tener guión)
  const match = texto.match(/\b(\d{4})[ -]?([A-Z]{3})\b/);
  return match ? match[1] + match[2] : null;
}

function extraerMatriculaGenerica(texto) {
  let match = texto.match(/MATRICULA\s+([A-Z0-9]{6,8})/i);
  if (match) return match[1];
  match = texto.match(/MATRICULA:\s*([A-Z0-9]{6,8})/i);
  if (match) return match[1];
  match = texto.match(/\b(\d{4})[ -]?([A-Z]{3})\b/);
  if (match) return match[1] + match[2];
  return null;
}

// --- EXTRACCIÓN PESO NETO (SIEMPRE EN KG) POR TIPO DE ALBARÁN---

// Heidelberg: peso en toneladas, tabla con "NETO (t)" y valor en línea siguiente
function extraerPesoHeidelberg(texto) {
  const lines = texto.split(/\r?\n/);
  let netoLineIndex = -1;
  // Buscar línea que contenga "NETO (t)" o "NETO (1)" o "NETO (l)" etc.
  for (let i = 0; i < lines.length; i++) {
    if (/NETO\s*\(\s*[1tTlI]\s*\)/i.test(lines[i])) {
      netoLineIndex = i;
      break;
    }
  }
  if (netoLineIndex !== -1) {
    let dataLine = (netoLineIndex + 1 < lines.length) ? lines[netoLineIndex + 1] : '';
    if (!dataLine.match(/\d/)) dataLine = lines[netoLineIndex];
    const numbers = dataLine.match(/[\d.,]+/g);
    if (numbers && numbers.length >= 3) {
      let netoStr = numbers[2].replace(/,/g, '.');
      let toneladas = parseFloat(netoStr);
      if (!isNaN(toneladas)) return toneladas;
    }
  }
  // Fallback para este formato
  const match = texto.match(/NETO\s*\(\s*t\s*\)\s*[|\s]*([\d.,]+)/i);
  if (match) {
    let toneladas = parseFloat(match[1].replace(',', '.'));
    return toneladas;
  }
  return null;
}

// CRH: peso en kg con formato "NETO 31.020,00"
function extraerPesoCRH(texto) {
  const match = texto.match(/NETO\s+([\d.]+,\d{2})/i);
  if (match) {
    let pesoStr = match[1].replace(/\./g, '').replace(',', '.');
    let pesoKg = parseFloat(pesoStr);
    return pesoKg / 1000; // convertir a toneladas
  }
  return null;
}

// Lemona: peso en kg con formato "Peso Neto : 31.720" o "Neto 29.360 kg"
function extraerPesoLemona(texto) {
  // Primero busca "Peso Neto : 31.720"
  let match = texto.match(/Peso\s+Neto\s*:\s*([\d.]+)/i);
  if (match) {
    let pesoKg = parseInt(match[1].replace(/\./g, ''), 10);
    return pesoKg / 1000;
  }
  // Busca "Neto 29.360 kg" (como en el ejemplo del usuario)
  match = texto.match(/\bNeto\s+([\d.]+)\s*kg\b/i);
  if (match) {
    let pesoKg = parseInt(match[1].replace(/\./g, ''), 10);
    return pesoKg / 1000;
  }
  // Busca "NETO" seguido de número (sin kg)
  match = texto.match(/NETO\s+([\d.]+)/i);
  if (match) {
    let pesoKg = parseInt(match[1].replace(/\./g, ''), 10);
    return pesoKg / 1000;
  }
  return null;
}

// Genérico (si no se detecta tipo)
function extraerPesoGenerico(texto) {
  // Intentar detectar si viene en toneladas o kg
  let match = texto.match(/NETO\s*\(\s*t\s*\)\s*([\d.,]+)/i);
  if (match) {
    let ton = parseFloat(match[1].replace(',', '.'));
    return ton;
  }
  match = texto.match(/Peso\s+Neto\s*:\s*([\d.]+)/i);
  if (match) return parseInt(match[1].replace(/\./g, ''), 10) / 1000;
  match = texto.match(/NETO\s+([\d.]+)/i);
  if (match) return parseInt(match[1].replace(/\./g, ''), 10) / 1000;
  return null;
}

// --- UTILIDADES ---
function resizeImage(base64, maxWidth = 1200) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = base64;
  });
}

function mostrarMensajeOCR(mensaje) {
  let msgDiv = document.getElementById('mensajeOCR');
  if (!msgDiv) {
    msgDiv = document.createElement('div');
    msgDiv.id = 'mensajeOCR';
    msgDiv.style.cssText = 'font-size:0.9rem; padding:0.5rem; margin-top:0.5rem; background:#e8f0fe; border-radius:8px; text-align:center;';
    const previewDiv = document.getElementById('preview');
    if (previewDiv) previewDiv.after(msgDiv);
    else document.body.appendChild(msgDiv);
  }
  msgDiv.textContent = mensaje;
  setTimeout(() => {
    if (msgDiv.textContent === mensaje) msgDiv.textContent = '';
  }, 5000);
}
