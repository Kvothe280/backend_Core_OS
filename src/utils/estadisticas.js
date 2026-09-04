const { diaClave } = require('./fechas');

function esCita(r) {
  return r.tipo === 'cita' || r.tipo === 'cafe';
}

function serieMensual(cartas, recuerdos) {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const ahora = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    return {
      mes: meses[m],
      cartas: cartas.filter((c) => { const f = new Date(c.createdAt); return f.getFullYear() === y && f.getMonth() === m; }).length,
      citas: recuerdos.filter((r) => { const f = new Date(r.fecha || r.createdAt); return esCita(r) && f.getFullYear() === y && f.getMonth() === m; }).length,
    };
  });
}

function agregarEvento(mapa, fecha, evento) {
  if (!fecha) return;
  const k = diaClave(fecha);
  if (!mapa[k]) mapa[k] = [];
  mapa[k].push(evento);
}

module.exports = { esCita, serieMensual, agregarEvento };
