// app.js - Control de navegación, gestión de barcos y albaranes con nueva interfaz

let barcoActualId = null;
let fotoActualBase64 = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Elementos de pantalla
  const pantallaLista = document.getElementById('pantallaLista');
  const pantallaNuevoBarco = document.getElementById('pantallaNuevoBarco');
  const pantallaDetalle = document.getElementById('pantallaDetalle');
  const btnBack = document.getElementById('btnBack');
  const menuAcciones = document.getElementById('menuAcciones');
  const navBarcos = document.getElementById('navBarcos');
  const navNuevo = document.getElementById('navNuevoBarco');
  const fab = document.getElementById('fabNuevoAlbaran');
  const modal = document.getElementById('modalAlbaran');
  const closeModal = document.querySelector('.close-modal');
  const btnMenu = document.getElementById('btnMenuAcciones');
  const dropdown = document.getElementById('dropdownMenu');

  // Mostrar pantalla de lista al inicio
  mostrarPantalla('lista');
  await cargarListaBarcos();

  // Navegación inferior
  navBarcos.addEventListener('click', () => {
    mostrarPantalla('lista');
    cargarListaBarcos();
  });
  navNuevo.addEventListener('click', () => mostrarPantalla('nuevoBarco'));

  // Botón volver
  btnBack.addEventListener('click', () => mostrarPantalla('lista'));

  // Menú desplegable de acciones (3 puntos)
  btnMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show-dropdown');
  });
  document.addEventListener('click', () => dropdown.classList.remove('show-dropdown'));

  // Acciones del menú: Editar carga prevista
  document.getElementById('btnEditarCargaMenu').addEventListener('click', async () => {
    dropdown.classList.remove('show-dropdown');
    if (!barcoActualId) return;
    // lógica de editar carga
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

  // Acciones del menú: Finalizar carga
  document.getElementById('btnFinalizarCargaMenu').addEventListener('click', async () => {
    dropdown.classList.remove('show-dropdown');
    if (barcoActualId && confirm('¿Marcar esta carga como completada?')) {
      await finalizarCarga(barcoActualId);
      await mostrarDetalleBarco(barcoActualId);
      await cargarListaBarcos();
    }
  });

  // Botón flotante: abrir el modal para nuevo albarán
  fab.addEventListener('click', () => {
    if (!barcoActualId) {
      alert('Primero selecciona o crea un barco');
      return;
    }
    // Limpiar formulario y vista previa
    document.getElementById('matriculaModal').value = '';
    document.getElementById('pesoModal').value = '';
    document.getElementById('previewModal').innerHTML = '';
    fotoActualBase64 = null;
    modal.style.display = 'flex';
  });

  //Cerrar modal
  closeModal.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  // Cámara y carga imagen dentro del modal (usar elementos con id...Modal)
  document.getElementById('btnFotoModal').addEventListener('click', async () => {
    if (!barcoActualId) return;
    await tomarFotoConVisor(async (base64) => {
      fotoActualBase64 = base64
      const { matricula, pesoKg } = await extraerDatosDeFoto(base64);
      if (matricula && pesoKg) {
        // Guardado automático
        const nuevoAlbaran = {
          matricula: matricula,
          peso: pesoKg, // ya en toneladas
          barcoId: barcoActualId,
          fotoBase64: base64,
          fecha: new Date().toISOString(),
          sincronizado: false
        };
        await guardarAlbaran(nuevoAlbaran);
        mostrarMensajeModal(`✅ Albarán guardado: ${matricula} - ${pesoKg.toFixed(2)} t`);
        modal.style.display = 'none';
        await mostrarDetalleBarco(barcoActualId);
      } else {
        if (matricula) document.getElementById('matriculaModal').value = matricula;
        if (pesoKg) document.getElementById('pesoModal').value = pesoKg.toFixed(3);
        mostrarMensajeModal("⚠️ Datos incompletos. Complete datos y guarde manualmente.");
      }
    });
  });

  // Boton cargar imagen dentro del modal
  document.getElementById('btnCargarImagenModal').addEventListener('click', () => {
    if (!barcoActualId) return;
    cargarImagenDesdeArchivo(async (base64) => {
      fotoActualBase64 = base64;
      const { matricula, pesoKg } = await extraerDatosDeFoto(base64);
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
        mostrarMensajeModal(`✅ Albarán guardado: ${matricula} - ${pesoKg.toFixed(2)} t`);
        modal.style.display = 'none';
        await mostrarDetalleBarco(barcoActualId);
      } else {
        if (matricula) document.getElementById('matriculaModal').value = matricula;
        if (pesoKg) document.getElementById('pesoModal').value = pesoKg.toFixed(3);
        mostrarMensajeOCR("⚠️ Datos incompletos. Complete datos y guarde manualmente.");
      }
    });
  });

  // Formulario manual dentro del modal (guardado manual)
  document.getElementById('albaranFormModal').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!barcoActualId) return;
    const matricula = document.getElementById('matriculaModal').value.trim().toUpperCase();
    const peso = parseFloat(document.getElementById('pesoModal').value);
    if (!matricula || isNaN(peso)) {
      alert('Rellena todos los campos');
      return;
    }
    if (!fotoActualBase64) {
      alert('Primero captura o carga una foto');
      return;
    }
    const nuevoAlbaran = {
      matricula: matricula,
      peso: peso,
      barcoId: barcoActualId,
      fotoBase64: fotoActualBase64,
      fecha: new Date().toISOString(),
      sincronizado: false
    };
    await guardarAlbaran(nuevoAlbaran);
    modal.style.display = 'none';
    await mostrarDetalleBarco(barcoActualId);
  });

  // Formulario nuevo barco
  document.getElementById('formNuevoBarco').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombreBarco').value.trim();
    let cargaTotal = document.getElementById('cargaTotal').value;
    cargaTotal = cargaTotal === '' ? null : parseFloat(cargaTotal);
    if (!nombre) return;
    const id = await iniciarNuevoBarco(nombre, cargaTotal);
    await mostrarDetalleBarco(id);
  });
});

// Función para mostrar mensajes temporales dentro del modal
function mostrarMensajeModal(mensaje) {
  let msgDiv = document.getElementById('mensajeModal');
  if (!msgDiv) {
    msgDiv = document.createElement('div');
    msgDiv.id = 'mensajeModal';
    msgDiv.style.cssText = 'font-size:0.8rem; padding:0.5rem; margin-top:0.5rem; background:#e8f0fe; border-radius:8px; text-align:center;';
    const modalContent = document.querySelector('.modal-content');
    modalContent.appendChild(msgDiv);
  }
  msgDiv.textContent = mensaje;
  setTimeout(() => {
    if (msgDiv.textContent === mensaje) msgDiv.textContent = '';
  }, 4000);
}

// Control de qué pantalla se muestra (lista, nuevo barco, detalle)
function mostrarPantalla(pantalla) {
  const pLista = document.getElementById('pantallaLista');
  const pNuevo = document.getElementById('pantallaNuevoBarco');
  const pDetalle = document.getElementById('pantallaDetalle');
  const btnBack = document.getElementById('btnBack');
  const menuAcciones = document.getElementById('menuAcciones');
  const navItems = document.querySelectorAll('.nav-item');

  pLista.style.display = 'none';
  pNuevo.style.display = 'none';
  pDetalle.style.display = 'none';

  if (pantalla === 'lista') {
    pLista.style.display = 'block';
    btnBack.style.display = 'none';
    menuAcciones.style.display = 'none';
    navItems.forEach(btn => btn.classList.remove('active'));
    document.getElementById('navBarcos').classList.add('active');
  } else if (pantalla === 'nuevoBarco') {
    pNuevo.style.display = 'block';
    btnBack.style.display = 'flex';
    menuAcciones.style.display = 'none';
    navItems.forEach(btn => btn.classList.remove('active'));
    document.getElementById('navNuevoBarco').classList.add('active');
  } else if (pantalla === 'detalle') {
    pDetalle.style.display = 'block';
    btnBack.style.display = 'flex';
    menuAcciones.style.display = 'block';
    // No resaltamos ningún nav-item porque estamos en detalle
    navItems.forEach(btn => btn.classList.remove('active'));
  }
}

// Cargar lista de barcos (activos y completados)
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

// Crear tarjeta de barco (para lista)
function crearTarjetaBarco(barco, resumen) {
  const div = document.createElement('div');
  div.className = 'barco-card';
  const prevista = barco.cargaTotalPrevista !== null ? barco.cargaTotalPrevista.toFixed(1) + ' t' : 'No definida';
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

// Mostrar detalle de un barco (pantalla de detalle)
async function mostrarDetalleBarco(id) {
  barcoActualId = id;
  const barcos = await obtenerBarcos();
  const barco = barcos.find(b => b.id === id);
  if (!barco) return;

  // document.getElementById('detalleNombreBarco').innerText = barco.nombre; ) //¿Eliminar?
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

  // Lista de albaranes de este barco
  const albaranes = await obtenerAlbaranesPorBarco(id);
  const listaUl = document.getElementById('listaAlbaranesBarco');
  if (albaranes.length === 0) {
    listaUl.innerHTML = '<li>No hay albaranes para este barco</li>';
  } else {
    listaUl.innerHTML = '';
    for (const item of albaranes) {
      const li = document.createElement('li');
      li.innerHTML = `${item.matricula} - ${item.peso.toFixed(2)} t <small>${new Date(item.fecha).toLocaleString()}</small>
                            <button class="btn-borrar-alb" data-id="${item.id}">🗑️</button>`;
      listaUl.appendChild(li);
    }
    // Eventos para borrar albaranes
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
