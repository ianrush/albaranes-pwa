// camera.js - Permiter tomar foto usando la mara del dispositivo
let fotoActualBase64 = null;

function tomarFoto() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg, image/png';
    input.capture = 'environment' // 'environment' para cámara trasera

    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) {
        reject(new Error('No se seleccionó ninguna foto'));
        return;
      }

      // Convertir a base64 para almacenar en IndexedDB
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        fotoActualBase64 = base64;
        resolve(base64);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    };

    input.click()
  });
}

// Mostrar vista previa de la foto
function mostrarPreview(base64, contenedorId = 'preview') {
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = ''; // limpiar
  if (!base64) return;

  const img = document.createElement('img');
  img.src = base64;
  img.alt = 'Vista previa del albarán';
  contenedor.appendChild(img);
}
