function diasDesde(fechaIso) {
  const inicio = new Date(`${fechaIso}T00:00:00`);
  const ms = Date.now() - inicio.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function diaActual() {
  return new Date().getDate();
}

// 'YYYY-MM-DD' del día calendario LOCAL, no UTC — toISOString().slice(0,10)
// ya cae en el día siguiente entre las 18:00 y medianoche en México (UTC-6).
function fechaHoy() {
  return diaClave(new Date());
}

function semanaActual() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const semana = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-${String(semana).padStart(2, '0')}`;
}

function proximaMedianoche() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diaClave(fecha) {
  const d = new Date(fecha);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = { diasDesde, diaActual, fechaHoy, semanaActual, proximaMedianoche, diaClave };
