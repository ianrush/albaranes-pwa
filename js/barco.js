// barco.js - Funciones de estadísticas y gestión de barcos

async function calcularResumenBarco(barcoId) {
  const albaranes = await obtenerAlbaranesPorBarco(barcoId);
  const barco = (await obtenerBarcos()).find(b => b.id === barcoId);
  if (!barco) return null;

  const cargaAcumulada = albaranes.reduce((sum, a) => sum + a.peso, 0);
  const cargaRestante = barco.cargaTotalPrevista - cargaAcumulada;
  const numCamiones = albaranes.length;
  const pesoMedio = numCamiones > 0 ? cargaAcumulada / numCamiones : 0;
  const camionesRestantesAprox = pesoMedio > 0 ? Math.ceil(cargaRestante / pesoMedio) : 0;

  return {
    cargaAcumulada,
    cargaRestante: cargaRestante > 0 ? cargaRestante : 0,
    numCamiones,
    pesoMedio,
    camionesRestantesAprox,
    completado: cargaAcumulada >= barco.cargaTotalPrevista
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

async function iniciarNuevoBarco(nombre, cargaTotalPrevista) {
  const ahora = new Date().toISOString();
  const nuevoBarco = {
    nombre: nombre.trim(),
    cargaTotalPrevista: parseFloat(cargaTotalPrevista),
    fechaInicio: ahora,
    fechaFin: null,
    estado: 'activo',
    timestamp: ahora
  };
  const id = await guardarBarco(nuevoBarco);
  return id;
}
