const RECOMPENSAS = [
  'Una cena en el restaurante que tú elijas',
  'Un día entero de planes a tu gusto sin decirte que no',
  'Una tarde de películas con todo lo que pidas',
  'Un masaje de una hora sin interrupciones',
  'Elegir el destino de nuestra próxima salida',
  'Un día de descanso total conmigo, sin pendientes',
  'Una sesión de fotos juntos donde tú elijas el lugar',
];

function recompensaAleatoria() {
  return RECOMPENSAS[Math.floor(Math.random() * RECOMPENSAS.length)];
}

module.exports = { RECOMPENSAS, recompensaAleatoria };
