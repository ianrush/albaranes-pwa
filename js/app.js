//app.js - Controla la interfaz de usuario y flujo
let albaranes = []

document.addEventListener('DOMContentLoaded', async() => {
	await cargarLista();

  // Botón de sacar foto
	document.getElementById('btnFoto').addEventListener('click', async () => {
  	try {
      const fotoBase64 = await tomarFoto();
      mostrarPreview(fotoBase64);
      // Opcional: aqui podríamos llamar a una función OCR pero por ahora
      // solo guardamos la foto en memoria
    } catch (error) {
      console.error('Error al tomar foto:', error);
      alert('No se pudo tomar la foto. Verifica permisos.');
    }
  });

  // Formulario manual
  document.getElementById('albaranForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const matricula = document.getElementById('matricula').ariaValueMax.trim().toUpperCase();
    const peso = parseFloat(document.getElementById('peso').value);

    if (!matricula || isNaN(peso)) {
      alert('Rellena matricula y peso correctamente');
      return;
    }

    if (!fotoActualBase64) {
      alert('Primero saca una foto del albarán');
      return;
    }

    const nuevoAlbaran = {
      matricula: matricula,
      peso: peso,
      fotoBase64: fotoActualBase64, // guardamos la foto completa
      fecha: new Date().toISOString(),
      sincronizado: false // para futura sincronización con servidor
    };

    try {
      const id = await guardarAlbaran(nuevoAlbaran);
      console.log('Guardado con id:', id);
      // limpiar formulario y vista previa
      document.getElementById('matricula').value = '';
      document.getElementById('peso').value = ';
      document.getElementById('preview').innerHTML = '';
      fotoActualBase64 = null;
      await cargarLista();
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar en la base de datos local');
    }
  });

  // Botón exportar a CSV
  document.getElementById('btnExportar').addEventListener('click', exportarCSV)
});

async function cargarLista() {
  albaranes = await obtenerAlbaranes();
  const listaUl = document.getElementById('listaAlbaranes');

  if (albaranes.length === 0) {
    listaUl.innerHTML = '<li>No hay albaranes guardados aun</li>';
    return;
  }

  listaUl.innerHTML = '';
  for (const item of albaranes) {
    const li = document.createElement('li');
    const fechaFormateada = new Date(item.fecha).toLocaleString();
    li.innerHTML = `
      <div>
        <span>${item.matricula}</span> - ${item.peso} kg<br>
        <small>${fechaFormateada}</small>
      </div>
      <button class="btn-borrar" data-id="${item.id}">Borrar</button>`;
    listaUl.appendChild(li);
  }

  // Asignar eventos a los botones de borrar
  document.querySelectorAll('.btn-borrar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = Number(btn.dataset.id);
      if (confirm('¿Borrar este albarán?')) {
        await borrarAlbaran(id);
        await cargarLista();
      }
    });
  });
}

function exportarCSV() {
  if (albaranes.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  let csv = "Matrícula,Peso (kg),Fecha\n";
  for (const item of albaranes) {
    csv += `${item.matricula},${item.peso},${new Date(item.fecha).toLocaleString()}\n`;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', 'albaranes.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
 }
