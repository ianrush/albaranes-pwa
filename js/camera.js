// camera.js - Manejo de cámara con visor en vivo, captura y callback opcional

let stream = null;
let videoElement = null;
let canvasElement = null;
let fotoActualBase64 = null;

// Esta función se llamará cuando el usuario haga clic en "Sacar foto"
// Recibe un callback que se ejecutará después de capturar la foto (para el OCR)
async function tomarFotoConVisor(onFotoCapturada) {
    // Limpiar el área de preview y crear el visor
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = '';

    // Crear elementos
    videoElement = document.createElement('video');
    videoElement.setAttribute('autoplay', '');
    videoElement.setAttribute('playsinline', '');
    videoElement.style.width = '100%';
    videoElement.style.borderRadius = '8px';
    videoElement.style.border = '1px solid #ccc';

    canvasElement = document.createElement('canvas');
    canvasElement.style.display = 'none';

    const btnCapturar = document.createElement('button');
    btnCapturar.textContent = '📸 Capturar foto';
    btnCapturar.style.marginTop = '0.5rem';
    btnCapturar.style.width = 'auto';
    btnCapturar.style.padding = '0.5rem 1rem';

    previewDiv.appendChild(videoElement);
    previewDiv.appendChild(canvasElement);
    previewDiv.appendChild(btnCapturar);

    // Iniciar cámara
    const ok = await iniciarCamara();
    if (!ok) return;

    // Configurar evento del botón capturar
    btnCapturar.onclick = async () => {
        const foto = capturarFoto();   // Obtiene base64 y detiene cámara
        if (foto && typeof onFotoCapturada === 'function') {
            // Llamar al callback (por ejemplo, para ejecutar el OCR)
            await onFotoCapturada(foto);
        }
    };
}

// Iniciar la cámara (prefiere la trasera)
async function iniciarCamara() {
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        const constraints = {
            video: { facingMode: { exact: "environment" } }
        };
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            console.warn('Cámara trasera no disponible, usando cualquier cámara', err);
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        if (videoElement) {
            videoElement.srcObject = stream;
            await videoElement.play();
        }
        return true;
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('No se pudo acceder a la cámara. Verifica permisos y HTTPS.');
        return false;
    }
}

// Capturar el frame actual y devolverlo en base64
function capturarFoto() {
    if (!videoElement || !canvasElement) {
        alert('La cámara no está activa');
        return null;
    }
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    canvasElement.width = width;
    canvasElement.height = height;
    const context = canvasElement.getContext('2d');
    context.drawImage(videoElement, 0, 0, width, height);
    const base64 = canvasElement.toDataURL('image/jpeg', 0.8);
    fotoActualBase64 = base64;

    // Detener la cámara para ahorrar batería
    detenerCamara();

    // Mostrar la foto capturada en lugar del video
    mostrarPreview(base64);
    return base64;
}

// Detener la cámara y liberar recursos
function detenerCamara() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (videoElement) {
        videoElement.srcObject = null;
    }
}

// Mostrar la foto capturada en el área de preview
function mostrarPreview(base64) {
    const contenedor = document.getElementById('preview');
    // Limpiar el contenido actual (el video y botón desaparecen)
    contenedor.innerHTML = '';
    if (!base64) return;
    const img = document.createElement('img');
    img.src = base64;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    img.style.border = '1px solid #ccc';
    contenedor.appendChild(img);
}

// Función simple para tomar foto sin callback (por si se usa desde otro lado)
async function tomarFoto() {
    await tomarFotoConVisor(null);
}
