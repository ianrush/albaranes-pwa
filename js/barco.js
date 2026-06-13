// barco.js - Funciones de estadísticas y gestión de barcos

async function calcularResumenBarco(barcoId) {
  const albaranes = await obtenerAlbaranesPorBarco(barcoId);
  const barco = (await obtenerBarcos()).find(b => b.id === barcoId);
  if (!barco) return null;

  const cargaAcumulada = albaranes.reduce((sum, a) => sum + a.peso, 0);
  const cargaTotalPrevista = barco.cargaTotalPrevista;

  let cargaRestante = null;
  let completado = false;
  if (cargaTotalPrevista !== null) {
    cargaRestante = cargaTotalPrevista - cargaAcumulada;
    if (cargaRestante <= 0) completado = true;
  }

  const numCamiones = albaranes.length;
  const pesoMedio = numCamiones > 0 ? cargaAcumulada / numCamiones : 0;
  let camionesRestantesAprox = null;
  if (cargaTotalPrevista !== null && pesoMedio > 0) {
    camionesRestantesAprox = Math.ceil(cargaRestante / pesoMedio);
  }

  return {
    cargaAcumulada,
    cargaTotalPrevista,
    cargaRestante,
    numCamiones,
    pesoMedio,
    camionesRestantesAprox,
    completado
  };
}

async function finalizarCarga(barcoId) {
  const barcos = await obtenerBarcos();
  const barco = barcos.find(b => b.id === barcoId);
  if (barco) {
    barco.estado = 'completado';
    barco.fechaFin = new Date().toISOString();
    await actualizarBarco(barco);
  }
}

async function iniciarNuevoBarco(nombre, cargaTotalToneladas) {
  const ahora = new Date().toISOString();
  const nuevoBarco = {
    nombre: nombre.trim(),
    cargaTotalPrevista: cargaTotalToneladas !== undefined && cargaTotalToneladas !== '' ? parseFloat(cargaTotalToneladas) : null,
    fechaInicio: ahora,
    fechaFin: null,
    estado: 'activo',
    timestamp: ahora
  };
  const id = await guardarBarco(nuevoBarco);
  return id;
}
