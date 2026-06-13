// app.js - Control de navegación y gestión de barcos

let barcoActualId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Mostrar pantalla de lista al inicio
  mostrarPantalla('lista');
  await cargarListaBarcos();

  // Eventos de navegación
  document.querySelectorAll('.btnVolver').forEach(btn => {
    btn.addEventListener('click', () => mostrarPantalla('lista'));
  });
  document.getElementById('btnNuevoBarco').addEventListener('click', () => mostrarPantalla('nuevoBarco'));

  // Formulario nuevo barco
  document.getElementById('formNuevoBarco').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombreBarco').value;
    let cargaTotal = document.getElementById('cargaTotal').value;
    cargaTotal = cargaTotal === '' ? null : parseFloat(cargaTotal);
    if (!nombre) return;
    const id = await iniciarNuevoBarco(nombre, cargaTotal);
    await mostrarDetalleBarco(id);
  });

  // Formulario de albarán en pantalla detalle
  document.getElementById('albaranFormDetalle').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!barcoActualId) return;
    const matricula = document.getElementById('matricula').value.trim().toUpperCase();
    const peso = parseFloat(document.getElementById('peso').value);
    if (!matricula || isNaN(peso)) {
      alert('Rellena matrícula y peso');
      return;
    }
    if (!fotoActualBase64) {
      alert('Primero saca o carga una foto del albarán');
      return;
    }
    const nuevoAlbaran = {
      matricula, peso, barcoId: barcoActualId,
      fotoBase64: fotoActualBase64,
      fecha: new Date().toISOString(),
      sincronizado: false
    };
    await guardarAlbaran(nuevoAlbaran);
    // Limpiar formulario y vista previa
    document.getElementById('matricula').value = '';
    document.getElementById('peso').value = '';
    document.getElementById('preview').innerHTML = '';
    fotoActualBase64 = null;
    // Refrescar la vista detalle
    await mostrarDetalleBarco(barcoActualId);
  });

  // Botón finalizar carga
  document.getElementById('btnFinalizarCarga').addEventListener('click', async () => {
    if (barcoActualId && confirm('¿Marcar esta carga como completada?')) {
      await finalizarCarga(barcoActualId);
      await mostrarDetalleBarco(barcoActualId);
    }
  });

  // Para el botón de foto
  document.getElementById('btnFotoDetalle').addEventListener('click', async () => {
    if (!barcoActualId) return;
    await tomarFotoConVisor(async (base64) => {
      const { matricula, pesoKg } = await extraerDatosDeFoto(base64);
      // Nota: pesoKg ahora es toneladas (lo hemos cambiado en ocr.js)
      if (matricula && pesoKg) {
        const nuevoAlbaran = {
          matricula: matricula,
          peso: pesoKg,
          barcoId: barcoActualId,
          fotoBase64: base64,
          fecha: new Date().toISOString(),
          sincronizado: false
        };
        await guardarAlbaran(nuevoAlbaran);
        mostrarMensajeOCR(`✅ Albarán guardado automáticamente: ${matricula} - ${pesoKg.toFixed(2)} t`);
        document.getElementById('preview').innerHTML = '';
        fotoActualBase64 = null;
        await mostrarDetalleBarco(barcoActualId);
      } else {
        if (matricula) document.getElementById('matricula').value = matricula;
        if (pesoKg) document.getElementById('peso').value = pesoKg.toFixed(3);
        mostrarMensajeOCR("⚠️ Datos incompletos. Complete y guarde manualmente.");
      }
    });
  });

  // Para el botón cargar imagen
  document.getElementById('btnCargarImagenDetalle').addEventListener('click', () => {
    if (!barcoActualId) return;
    cargarImagenDesdeArchivo(async (base64) => {
      const { matricula, pesoKg } = await extraerDatosDeFoto(base64);
      // Nota: pesoKg ahora es toneladas (lo hemos cambiado en ocr.js)
      if (matricula && pesoKg) {
        const nuevoAlbaran = {
          matricula: matricula,
          peso: pesoKg,
          barcoId: barcoActualId,
          fotoBase64: base64,
          fecha: new Date().toISOString(),
          sincronizado: false
        };
        await guardarAlbaran(nuevoAlbaran);
        mostrarMensajeOCR(`✅ Albarán guardado automáticamente: ${matricula} - ${pesoKg.toFixed(2)} t`);
        document.getElementById('preview').innerHTML = '';
        fotoActualBase64 = null;
        await mostrarDetalleBarco(barcoActualId);
      } else {
        if (matricula) document.getElementById('matricula').value = matricula;
        if (pesoKg) document.getElementById('peso').value = pesoKg.toFixed(3);
        mostrarMensajeOCR("⚠️ Datos incompletos. Complete y guarde manualmente.");
      }
    });
  });

  // Para el botón editar carga
  document.getElementById('btnEditarCarga').addEventListener('click', async () => {
    if (!barcoActualId) return;
    const barcos = await obtenerBarcos();
    const barco = barcos.find(b => b.id === barcoActualId);
    const valorActual = barco.cargaTotalPrevista !== null ? barco.cargaTotalPrevista.toFixed(1) : '';
    const nuevaCarga = prompt('Introduce la nueva carga prevista (toneladas):', valorActual);
    if (nuevaCarga !== null) {
      const nuevaCargaTon = nuevaCarga === '' ? null : parseFloat(nuevaCarga);
      barco.cargaTotalPrevista = nuevaCargaTon;
      await actualizarBarco(barco);
      await mostrarDetalleBarco(barcoActualId);
      await cargarListaBarcos();
    }
  });

});

function mostrarPantalla(pantalla) {
  document.getElementById('pantallaLista').style.display = pantalla === 'lista' ? 'block' : 'none';
  document.getElementById('pantallaNuevoBarco').style.display = pantalla === 'nuevoBarco' ? 'block' : 'none';
  document.getElementById('pantallaDetalle').style.display = pantalla === 'detalle' ? 'block' : 'none';
  if (pantalla === 'lista') cargarListaBarcos();
}

async function cargarListaBarcos() {
  const activos = await obtenerBarcos('activo');
  const completados = await obtenerBarcos('completado');

  const contActivos = document.getElementById('listaBarcosActivos');
  const contCompletados = document.getElementById('listaBarcosCompletados');

  contActivos.innerHTML = activos.length ? '' : '<p>No hay barcos activos</p>';
  contCompletados.innerHTML = completados.length ? '' : '<p>No hay histórico</p>';

  for (const barco of activos) {
    const resumen = await calcularResumenBarco(barco.id);
    const card = crearTarjetaBarco(barco, resumen);
    contActivos.appendChild(card);
  }
  for (const barco of completados) {
    const card = crearTarjetaBarco(barco, null);
    contCompletados.appendChild(card);
  }
}

function crearTarjetaBarco(barco, resumen) {
  const div = document.createElement('div');
  const prevista = barco.cargaTotalPrevista !== null ? barco.cargaTotalPrevista.toFixed(1) + ' t' : 'No definida';
  div.className = 'barco-card';
  div.innerHTML = `
    <h3>${barco.nombre}</h3>
    <p>Previsto: ${prevista}</p>
    ${resumen ? `<p>Acumulado: ${resumen.cargaAcumulada.toFixed(1)} t</p>
                  <p>Restante: ${resumen.cargaRestante !== null ? resumen.cargaRestante.toFixed(1) + ' t' : 'N/A'}</p>
                  <p>Camiones: ${resumen.numCamiones}</p>` : `<p>Completado el ${new Date(barco.fechaFin).toLocaleDateString()}</p>`}
    <button class="btn-ver-barco" data-id="${barco.id}">Ver detalle</button>
  `;
  div.querySelector('.btn-ver-barco').addEventListener('click', () => mostrarDetalleBarco(barco.id));
  return div;
}

async function mostrarDetalleBarco(id) {
  barcoActualId = id;
  const barcos = await obtenerBarcos();
  const barco = barcos.find(b => b.id === id);
  if (!barco) return;

  document.getElementById('detalleNombreBarco').innerText = barco.nombre;
  const resumen = await calcularResumenBarco(id);
  const contResumen = document.getElementById('resumenBarco');
  contResumen.innerHTML = `
    <div class="resumen-grid">
        <div>Previsto: ${barco.cargaTotalPrevista !== null ? barco.cargaTotalPrevista.toFixed(1) + ' t' : 'No definido'}</div>
        <div>Acumulado: ${resumen.cargaAcumulada.toFixed(1)} t</div>
        <div>Restante: ${resumen.cargaRestante !== null ? resumen.cargaRestante.toFixed(1) + ' t' : 'N/A'}</div>
        <div>Camiones cargados: ${resumen.numCamiones}</div>
        <div>Peso medio: ${resumen.pesoMedio.toFixed(1)} t</div>
        <div>Camiones restantes aprox.: ${resumen.camionesRestantesAprox !== null ? resumen.camionesRestantesAprox : 'N/A'}</div>
    </div>
    ${barco.cargaTotalPrevista !== null ? `<div class="barra-progreso"><div style="width: ${Math.min(100, (resumen.cargaAcumulada / barco.cargaTotalPrevista) * 100)}%;"></div></div>` : ''}
    `;

  // Lista de albaranes
  const albaranes = await obtenerAlbaranesPorBarco(id);
  const listaUl = document.getElementById('listaAlbaranesBarco');
  if (albaranes.length === 0) {
    listaUl.innerHTML = '<li>No hay albaranes para este barco</li>';
  } else {
    listaUl.innerHTML = '';
    for (const item of albaranes) {
      const li = document.createElement('li');
      li.innerHTML = `${item.matricula} - ${item.peso.toLocaleString()} kg <small>${new Date(item.fecha).toLocaleString()}</small>
                            <button class="btn-borrar-alb" data-id="${item.id}">🗑️</button>`;
      listaUl.appendChild(li);
    }
    document.querySelectorAll('.btn-borrar-alb').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const albId = Number(btn.dataset.id);
        if (confirm('¿Borrar este albarán?')) {
          await borrarAlbaran(albId);
          await mostrarDetalleBarco(id);
        }
      });
    });
  }

  mostrarPantalla('detalle');
}
