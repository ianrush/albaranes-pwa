// ocr.js - Reconocimiento de texto específico para los 3 formatos de albarán

const OCR_LANG = 'spa+eng';

// Función principal
async function extraerDatosDeFoto(base64Image) {
    mostrarMensajeOCR("🔍 Leyendo texto del albarán...");

    try {
        // Redimensionar para mejor rendimiento
        const imagenRedimensionada = await resizeImage(base64Image, 1200);
        const { data: { text } } = await Tesseract.recognize(imagenRedimensionada, OCR_LANG, {
            logger: m => console.log(m)
        });

        console.log("Texto OCR completo:\n", text);

        const resultado = {
            matricula: extraerMatricula(text),
            pesoKg: extraerPesoEnKg(text),
            textoCompleto: text
        };

        if (resultado.matricula) {
            mostrarMensajeOCR(`✅ Matrícula: ${resultado.matricula} | Peso: ${resultado.pesoKg} kg`);
        } else {
            mostrarMensajeOCR("⚠️ No se detectaron todos los datos. Revísalos manualmente.");
        }

        return resultado;
    } catch (error) {
        console.error("Error en OCR:", error);
        mostrarMensajeOCR("❌ Error al leer la imagen. Introduce los datos manualmente.");
        return { matricula: null, pesoKg: null, textoCompleto: null };
    }
}

// Extraer matrícula (unifica los 3 formatos)
function extraerMatricula(texto) {
    const upperText = texto.toUpperCase();

    // 1. Formato 1: "MATRICULA 4914KMF"
    let match = upperText.match(/MATRICULA\s+([A-Z0-9]{6,8})/);
    if (match) return match[1];

    // 2. Formato 2: "MATRICULA: 3757NBN"
    match = upperText.match(/MATRICULA:\s*([A-Z0-9]{6,8})/);
    if (match) return match[1];

    // 3. Formato 3: patrón general 4 números y 3 letras (con o sin guión)
    match = upperText.match(/\b(\d{4})[ -]?([A-Z]{3})\b/);
    if (match) return match[1] + match[2];

    // 4. Fallback: cualquier grupo de 6-8 caracteres alfanuméricos que parezca matrícula
    match = upperText.match(/\b[A-Z0-9]{6,8}\b/);
    return match ? match[0] : null;
}

console.log(texto)

// Extraer peso neto SIEMPRE en kilogramos (detecta toneladas automáticamente)
function extraerPesoEnKg(texto) {
    // 1. Formato 1 (Heidelberg): tabla con NETO (t) y valor en la misma línea o siguiente
    // Busca "NETO (t)" y luego captura el número que está en la misma fila (hasta fin de línea)
    let match = texto.match(/NETO\s*\(\s*t\s*\)\s*[|\s]*([\d.,]+)/i);
    if (match) {
        let pesoStr = match[1].replace(/\./g, '').replace(',', '.');
        let toneladas = parseFloat(pesoStr);
        if (!isNaN(toneladas)) return Math.round(toneladas * 1000);
    }

    // Alternativa: buscar línea que contenga "NETO (t)" y luego una línea con números
    const lines = texto.split(/\r?\n/);
    let netoIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (/NETO\s*\(\s*t\s*\)/i.test(lines[i])) {
            netoIndex = i;
            break;
        }
    }
    if (netoIndex !== -1 && netoIndex + 1 < lines.length) {
        const nextLine = lines[netoIndex + 1];
        const numberMatch = nextLine.match(/([\d.,]+)/);
        if (numberMatch) {
            let pesoStr = numberMatch[1].replace(/\./g, '').replace(',', '.');
            let toneladas = parseFloat(pesoStr);
            if (!isNaN(toneladas)) return Math.round(toneladas * 1000);
        }
    }

    // 2. Formato 2 (CRH): "NETO" con punto miles y coma decimal (ej: 31.020,00)
    match = texto.match(/NETO\s+([\d.]+,\d{2})/i);
    if (match) {
        let pesoStr = match[1].replace(/\./g, '').replace(',', '.');
        return parseFloat(pesoStr);
    }

    // 3. Formato 3 (Lemona): "Peso Neto : 31.720"
    match = texto.match(/Peso\s+Neto\s*:\s*([\d.]+)/i);
    if (match) {
        let pesoStr = match[1].replace(/\./g, '');
        return parseInt(pesoStr, 10);
    }

    // 4. Fallback: buscar "NETO" seguido de número (sin unidad específica)
    match = texto.match(/NETO\s*:?\s*([\d.,]+)/i);
    if (match) {
        let limpio = match[1].replace(/\./g, '').replace(',', '.');
        return parseFloat(limpio);
    }

    return null;
}

// Redimensionar imagen para acelerar OCR (opcional pero recomendado)
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

// Mostrar mensajes en la UI
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
