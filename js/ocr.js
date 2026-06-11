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

// Extraer peso neto SIEMPRE en kilogramos (detecta toneladas automáticamente)
function extraerPesoEnKg(texto) {
    // Dividir en líneas para análisis más preciso
    const lines = texto.split(/\r?\n/);

    // ----- ESTRATEGIA 1: Tabla Heidelberg (confusión t->1) -----
    // Buscar línea que contenga "NETO (1)" o "NETO (t)" o "NETO (l)" o "NETO (I)"
    let netoLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (/NETO\s*\(\s*[1tTlI]\s*\)/i.test(lines[i])) {
            netoLineIndex = i;
            break;
        }
    }
    if (netoLineIndex !== -1) {
        // La línea siguiente suele contener los tres números: bruto, tara, neto
        let dataLine = (netoLineIndex + 1 < lines.length) ? lines[netoLineIndex + 1] : '';
        // Si la línea siguiente no tiene números, buscar en la misma línea después del patrón
        if (!dataLine.match(/\d/)) {
            dataLine = lines[netoLineIndex];
        }
        // Extraer todos los números (incluyen comas y puntos)
        const numbers = dataLine.match(/[\d.,]+/g);
        if (numbers && numbers.length >= 3) {
            // El tercer número es el NETO (orden: BRUTO, TARA, NETO)
            let netoStr = numbers[2];
            // Normalizar: reemplazar coma por punto (para decimales)
            netoStr = netoStr.replace(/,/g, '.');
            let toneladas = parseFloat(netoStr);
            if (!isNaN(toneladas)) {
                return Math.round(toneladas * 1000); // convertir a kg
            }
        }
    }

    // ----- ESTRATEGIA 2: Misma tabla pero sin confusión (original) -----
    // Busca "NETO (t)" y captura número en la misma línea o siguiente
    let match = texto.match(/NETO\s*\(\s*t\s*\)\s*[|\s]*([\d.,]+)/i);
    if (match) {
        let pesoStr = match[1].replace(/,/g, '.');
        let toneladas = parseFloat(pesoStr);
        if (!isNaN(toneladas)) return Math.round(toneladas * 1000);
    }

    // ----- ESTRATEGIA 3: Formato CRH (NETO con punto miles y coma decimal) -----
    match = texto.match(/NETO\s+([\d.]+,\d{2})/i);
    if (match) {
        let pesoStr = match[1].replace(/\./g, '').replace(',', '.');
        return parseFloat(pesoStr);
    }

    // ----- ESTRATEGIA 4: Formato Lemona (Peso Neto : 31.720) -----
    match = texto.match(/Peso\s+Neto\s*:\s*([\d.]+)/i);
    if (match) {
        let pesoStr = match[1].replace(/\./g, '');
        return parseInt(pesoStr, 10);
    }

    // ----- ESTRATEGIA 5: Fallback genérico (cualquier "NETO" seguido de número) -----
    match = texto.match(/NETO\s*:?\s*([\d.,]+)/i);
    if (match) {
        let limpio = match[1].replace(/,/g, '.');
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
