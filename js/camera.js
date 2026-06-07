// camera.js - Acceso a cámara con getUserMedia y captura de foto

let stream = null;
let videoElement = null;
let canvasElement = null;
let fotoActualBase64 = null;

// Crear elementos de video y canvas dinámicamente
function crearVisor() {
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = ''; // Limpiar

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
    btnCapturar.id = 'btnCapturar';
    btnCapturar.style.marginTop = '0.5rem';

    previewDiv.appendChild(videoElement);
    previewDiv.appendChild(canvasElement);
    previewDiv.appendChild(btnCapturar);

    return { videoElement, canvasElement, btnCapturar };
}

// Solicitar permiso y activar cámara trasera
async function iniciarCamara() {
    try {
        // Detener cualquier stream anterior
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // Preferir cámara trasera si es posible
        const constraints = {
            video: { facingMode: { exact: "environment" } }
        };

        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            // Si falla cámara trasera, usar cualquier cámara
            console.warn('No se pudo acceder a cámara trasera, usando por defecto', err);
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (videoElement) {
            videoElement.srcObject = stream;
            await videoElement.play();
        }
        return true;
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('No se pudo acceder a la cámara. Verifica permisos y que usas HTTPS.');
        return false;
    }
}

// Capturar la foto actual del video
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

    // Convertir a base64 (formato JPEG)
    const base64 = canvasElement.toDataURL('image/jpeg', 0.8);
    fotoActualBase64 = base64;

    // Detener la cámara para ahorrar batería (opcional)
    detenerCamara();

    // Mostrar la foto capturada en lugar del video
    mostrarPreview(base64);

    return base64;
}

// Detener la cámara
function detenerCamara() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (videoElement) {
        videoElement.srcObject = null;
    }
}

// Mostrar vista previa de la foto capturada
function mostrarPreview(base64, contenedorId = 'preview') {
    const contenedor = document.getElementById(contenedorId);
    contenedor.innerHTML = '';
    if (!base64) return;

    const img = document.createElement('img');
    img.src = base64;
    img.alt = 'Albarán capturado';
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    img.style.border = '1px solid #ccc';
    contenedor.appendChild(img);
}

// Función principal que debe llamarse al hacer clic en "Sacar foto"
async function tomarFotoConVisor() {
    // Limpiar vista previa anterior
    const previewDiv = document.getElementById('preview');
    previewDiv.innerHTML = '';

    // Crear el visor en vivo
    const { btnCapturar } = crearVisor();

    // Iniciar cámara
    const ok = await iniciarCamara();
    if (!ok) return;

    // Configurar botón capturar
    btnCapturar.onclick = () => {
        const foto = capturarFoto();
        if (foto) {
            // Opcional: aquí podrías ya parsear con OCR en el futuro
            alert('Foto capturada correctamente');
        }
    };
}

// Para compatibilidad con el código anterior (si se llama a tomarFoto)
async function tomarFoto() {
    await tomarFotoConVisor();
}
