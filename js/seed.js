// Datos iniciales: planificación semanal, ejercicios, rutinas, hábitos,
// plan progresivo de 5 km e ideas de comidas. Nada de esto es personal:
// peso, edad y altura se cargan en el dispositivo durante el onboarding.

// ---------------------------------------------------------------------------
// Planificación semanal de partida (editable desde la app)
// ---------------------------------------------------------------------------
const PLAN_TEXT = {
  1: `LUNES — BJJ + ESTUDIO
06:00 | Despertar, higiene y desayuno
07:00-10:00 | Colegio
10:15-10:45 | Merienda y descanso
10:45-11:30 | Running suave opcional
11:30-12:00 | Ducha
12:00-13:00 | Estudio
13:00-13:40 | Almuerzo
13:40-14:30 | Descanso
15:00-16:00 | BJJ
16:15-17:00 | Recuperación
17:00-17:45 | Repaso
17:45-19:00 | Tiempo libre
19:00-19:45 | Cena
20:00-20:30 | Preparar mochila
20:30 | Desconexión
21:00 | Dormir`,
  2: `MARTES — RUNNING + CALISTENIA + EMPRENDIMIENTO
06:00 | Despertar
07:00-10:00 | Colegio
10:30-11:30 | Estudio
11:30-12:00 | Descanso
12:00-13:00 | Almuerzo
13:00-14:00 | Tiempo libre
14:00-14:40 | Running suave
14:40-15:15 | Ducha y merienda
15:30-16:10 | Calistenia A
16:10-17:00 | Recuperación
17:00-18:00 | Emprendimiento
18:00-19:00 | Tiempo libre
19:00-19:45 | Cena
20:00-20:30 | Repaso
21:00 | Dormir`,
  3: `MIÉRCOLES — BJJ + ESTUDIO
06:00 | Despertar
07:00-10:00 | Colegio
10:30-11:15 | Running muy suave o caminata
11:15-12:00 | Ducha y descanso
12:00-13:00 | Estudio
13:00-13:40 | Almuerzo
13:40-14:30 | Descanso
15:00-16:00 | BJJ
16:15-17:00 | Recuperación
17:00-17:45 | Estudio
17:45-19:00 | Tiempo libre
19:00-19:45 | Cena
20:30 | Desconexión
21:00 | Dormir`,
  4: `JUEVES — FUERZA + EMPRENDIMIENTO
06:00 | Despertar
07:00-10:00 | Colegio
10:30-11:30 | Estudio
11:30-12:00 | Descanso
12:00-13:00 | Almuerzo
13:00-14:00 | Tiempo libre
14:00-14:40 | Running suave opcional
14:40-15:15 | Ducha y merienda
15:30-16:10 | Calistenia B
16:10-17:00 | Recuperación
17:00-18:00 | Emprendimiento
18:00-19:00 | Tiempo libre
19:00-19:45 | Cena
20:00-20:30 | Repaso
21:00 | Dormir`,
  5: `VIERNES — BJJ + CIERRE SEMANAL
06:00 | Despertar
07:00-10:00 | Colegio
10:30-11:00 | Descanso
11:00-11:30 | Caminata o trote suave opcional
12:00-13:00 | Estudio
13:00-13:40 | Almuerzo
13:40-14:30 | Descanso
15:00-16:00 | BJJ
16:15-17:00 | Recuperación
17:00-19:00 | Tiempo libre
19:00 | Cena
21:00 | Dormir`,
  6: `SÁBADO — EMPRENDIMIENTO + ACTIVIDAD FÍSICA
07:00 | Despertar
08:00-09:00 | Running cómodo o caminata-trote
09:00-10:00 | Ducha y descanso
10:00-12:00 | Emprendimiento
12:30-13:30 | Almuerzo
13:30-15:00 | Tiempo libre
15:00-16:00 | Estudio pendiente
16:00-19:00 | Amigos, familia y ocio
19:30 | Cena
21:30 | Dormir`,
  0: `DOMINGO — RECUPERACIÓN Y PLANIFICACIÓN
07:30 | Despertar
08:30-09:00 | Caminata
09:00-10:00 | Movilidad y descanso
10:00-11:00 | Organizar exámenes
11:00-12:00 | Tiempo libre
12:30 | Almuerzo
14:00-17:00 | Familia, amigos y ocio
17:00-17:30 | Revisar objetivos
19:00 | Cena
20:30 | Preparar lunes
21:00 | Dormir`,
};

/** Clasifica un bloque por su título: categoría, tipo y si cuenta para el progreso. */
export function classify(title) {
  const t = title.toLowerCase();
  const optional = /opcional/.test(t);
  const r = (cat, kind, track, extra = {}) => ({ cat, kind, track, optional, ...extra });
  if (/calistenia\s*a/.test(t)) return r('deporte', 'calisthenics', true, { routine: 'A' });
  if (/calistenia\s*b/.test(t)) return r('deporte', 'calisthenics', true, { routine: 'B' });
  if (/calistenia|fuerza/.test(t)) return r('deporte', 'calisthenics', true, { routine: 'A' });
  if (/bjj|jiu/.test(t)) return r('deporte', 'bjj', true);
  if (/running|trote/.test(t)) return r('deporte', 'run', true);
  if (/caminata/.test(t)) return r('deporte', 'walk', true);
  if (/movilidad/.test(t)) return r('deporte', 'mobility', true);
  if (/recuperaci/.test(t)) return r('deporte', 'recovery', false);
  if (/colegio/.test(t)) return r('academia', 'school', true);
  if (/repaso/.test(t)) return r('academia', 'review', true);
  if (/examen/.test(t)) return r('academia', 'exams', true);
  if (/estudio|estudiar/.test(t)) return r('academia', 'study', true);
  if (/emprend|empresa|socio/.test(t)) return r('emprendimiento', 'venture', true);
  if (/revisar objetivos/.test(t)) return r('personal', 'goals', true);
  if (/preparar/.test(t)) return r('personal', 'prep', true);
  if (/desayuno|almuerzo|merienda|cena/.test(t)) return r('comida', 'meal', false);
  if (/dormir/.test(t)) return r('personal', 'sleep', false);
  if (/despertar/.test(t)) return r('personal', 'wake', false);
  if (/desconexi/.test(t)) return r('personal', 'disconnect', false);
  if (/leer|lectura/.test(t)) return r('personal', 'read', true);
  return r('libre', 'free', false);
}

export function buildPlan() {
  const plan = {};
  for (const [wd, text] of Object.entries(PLAN_TEXT)) {
    const lines = text.trim().split('\n');
    const [, theme = ''] = lines[0].split('—').map((s) => s.trim());
    plan[wd] = {
      theme,
      blocks: lines.slice(1).map((line, i) => {
        const [time, title] = line.split('|').map((s) => s.trim());
        const [start, end = ''] = time.split('-');
        return { id: `d${wd}-${String(i).padStart(2, '0')}`, start, end, title, ...classify(title) };
      }),
    };
  }
  return plan;
}

export const CATEGORIES = {
  academia: 'Academia',
  deporte: 'Deportes',
  emprendimiento: 'Emprendimiento',
  personal: 'Personal',
  comida: 'Comida',
  libre: 'Libre / descanso',
};

export const KINDS = {
  school: 'Colegio', study: 'Estudio', review: 'Repaso', exams: 'Exámenes',
  run: 'Running', walk: 'Caminata', calisthenics: 'Calistenia', bjj: 'BJJ', mobility: 'Movilidad', recovery: 'Recuperación',
  venture: 'Emprendimiento', goals: 'Revisar objetivos', prep: 'Preparar día siguiente', read: 'Lectura',
  meal: 'Comida', sleep: 'Dormir', wake: 'Despertar', disconnect: 'Desconexión', free: 'Libre / descanso',
};

// ---------------------------------------------------------------------------
// Ejercicios (con poses para la ilustración animada en js/figures.js)
// ---------------------------------------------------------------------------
export const EXERCISES = {
  pushup: {
    name: 'Flexiones', type: 'reps', rest: 75, pose: 'pushup', hl: ['arms'],
    desc: 'Empuje horizontal con el peso del cuerpo. Trabaja pecho, hombros y tríceps, con el core activo.',
    tech: ['Manos apenas más anchas que los hombros, dedos hacia adelante.', 'Cuerpo en línea recta de talones a cabeza: apretá glúteos y abdomen.', 'Bajá hasta que el pecho quede a unos centímetros del piso, codos a unos 45° del torso.', 'Empujá el piso y extendé los brazos sin bloquear los codos de golpe.'],
    errors: ['Cadera caída o demasiado alta.', 'Codos abiertos a 90° (carga el hombro).', 'Recorrido corto.'],
    easier: 'Hacelas con las manos sobre una silla o la cama (flexión inclinada) o con rodillas apoyadas.',
  },
  squat: {
    name: 'Sentadillas', type: 'reps', rest: 60, pose: 'squat', hl: ['legs'],
    desc: 'Patrón básico de pierna: cuádriceps, glúteos e isquios. Base para correr y para BJJ.',
    tech: ['Pies a la altura de los hombros, puntas un poco hacia afuera.', 'Llevá la cadera hacia atrás y abajo como si te sentaras.', 'Rodillas en la dirección de las puntas de los pies; talones apoyados.', 'Bajá hasta donde mantengas la espalda neutra y subí empujando el piso.'],
    errors: ['Rodillas que se cierran hacia adentro.', 'Talones que se levantan.', 'Espalda redondeada al bajar.'],
    easier: 'Sentate y parate de una silla controlando la bajada.',
  },
  'reverse-lunge': {
    name: 'Zancadas atrás', type: 'reps', rest: 60, pose: 'lunge', hl: ['legs'], perSide: true,
    desc: 'Trabajo unilateral de pierna y equilibrio. La zancada hacia atrás es más amable con las rodillas.',
    tech: ['De pie, dá un paso largo hacia atrás.', 'Bajá hasta que la rodilla de atrás quede cerca del piso.', 'Rodilla de adelante sobre el tobillo, torso erguido.', 'Volvé empujando con el talón de la pierna de adelante.'],
    errors: ['Paso demasiado corto.', 'Torso inclinado hacia adelante.', 'Rodilla de adelante que se va hacia adentro.'],
    easier: 'Agarrate de una pared o silla para el equilibrio.',
  },
  pike: {
    name: 'Pike push-ups', type: 'reps', rest: 75, pose: 'pike', hl: ['arms'],
    desc: 'Empuje vertical: fortalece hombros y tríceps. Prepara para movimientos más avanzados.',
    tech: ['Desde flexión, subí la cadera hasta formar una V invertida.', 'Manos al ancho de los hombros, mirada hacia los pies.', 'Doblá los codos llevando la cabeza hacia el piso, por delante de las manos.', 'Empujá hasta extender los brazos.'],
    errors: ['Cadera que baja durante la repetición.', 'Codos muy abiertos.', 'Golpear la cabeza: bajá controlado.'],
    easier: 'Reducí el recorrido o apoyá las rodillas en el piso.',
  },
  'glute-bridge': {
    name: 'Puente de glúteos', type: 'reps', rest: 45, pose: 'bridge', hl: ['legs'],
    desc: 'Activa glúteos e isquios y protege la zona lumbar. Muy útil para correr y para el puente en BJJ.',
    tech: ['Boca arriba, rodillas dobladas, pies apoyados cerca de la cadera.', 'Empujá con los talones y subí la cadera.', 'Arriba, hombros-cadera-rodillas en línea; apretá glúteos 1 segundo.', 'Bajá controlado sin apoyar del todo.'],
    errors: ['Arquear la zona lumbar en vez de usar glúteos.', 'Empujar con la punta de los pies.'],
    easier: 'Reducí el recorrido o la cantidad de repeticiones.',
  },
  'dead-bug': {
    name: 'Dead bug', type: 'reps', rest: 45, pose: 'deadbug', hl: ['torso'], perSide: true,
    desc: 'Core anti-extensión: estabilidad del tronco con movimiento de brazos y piernas.',
    tech: ['Boca arriba, brazos al techo y rodillas a 90° sobre la cadera.', 'Pegá la zona lumbar al piso.', 'Extendé un brazo hacia atrás y la pierna contraria hacia adelante, despacio.', 'Volvé al centro y cambiá de lado.'],
    errors: ['Despegar la espalda baja del piso.', 'Ir rápido: el control es el ejercicio.'],
    easier: 'Mové solo las piernas, de a una.',
  },
  plank: {
    name: 'Plancha', type: 'time', rest: 45, pose: 'plank', hl: ['torso'],
    desc: 'Isométrico de core: mantiene el tronco firme. Base de casi todo.',
    tech: ['Antebrazos en el piso, codos debajo de los hombros.', 'Cuerpo en línea recta; apretá glúteos y abdomen.', 'Mirada al piso, cuello neutro.', 'Respirá normal durante todo el tiempo.'],
    errors: ['Cadera hundida.', 'Cadera muy alta.', 'Aguantar la respiración.'],
    easier: 'Apoyá las rodillas o acortá el tiempo.',
  },
  'incline-pushup': {
    name: 'Flexiones inclinadas', type: 'reps', rest: 60, pose: 'incline', hl: ['arms'],
    desc: 'Flexión con manos elevadas (silla firme, cama o escalón). Permite más volumen con buena técnica.',
    tech: ['Manos sobre una superficie firme y estable.', 'Cuerpo recto de talones a cabeza.', 'Bajá el pecho hasta el borde de la superficie.', 'Empujá hasta extender los brazos.'],
    errors: ['Usar una silla que se mueve.', 'Cadera caída.'],
    easier: 'Usá una superficie más alta.',
  },
  'close-pushup': {
    name: 'Flexiones cerradas', type: 'reps', rest: 75, pose: 'closepush', hl: ['arms'],
    desc: 'Flexión con manos juntas: más énfasis en tríceps.',
    tech: ['Manos debajo del pecho, más juntas que los hombros.', 'Codos pegados al cuerpo al bajar.', 'Cuerpo en línea recta todo el tiempo.', 'Subí extendiendo completamente los brazos.'],
    errors: ['Abrir los codos.', 'Muñecas incómodas: separá un poco las manos.'],
    easier: 'Hacelas inclinadas o con rodillas apoyadas.',
  },
  superman: {
    name: 'Superman', type: 'reps', rest: 45, pose: 'superman', hl: ['torso'],
    desc: 'Fortalece la cadena posterior: espalda baja, glúteos y hombros.',
    tech: ['Boca abajo con brazos estirados al frente.', 'Levantá brazos, pecho y piernas a la vez, poco recorrido.', 'Sostené 1–2 segundos arriba.', 'Bajá controlado.'],
    errors: ['Levantar la cabeza mirando al frente (mirá al piso).', 'Hacerlo con impulso.'],
    easier: 'Alterná: levantá solo brazos o solo piernas.',
  },
  'snow-angel': {
    name: 'Reverse snow angels', type: 'reps', rest: 45, pose: 'snowangel', hl: ['arms'],
    desc: 'Espalda alta y hombros: mejora la postura y compensa las flexiones.',
    tech: ['Boca abajo, brazos al costado del cuerpo, palmas hacia el piso.', 'Despegá brazos y pecho apenas del piso.', 'Llevá los brazos en arco hasta arriba de la cabeza sin apoyarlos.', 'Volvé por el mismo camino, lento.'],
    errors: ['Subir los hombros hacia las orejas.', 'Apoyar los brazos en el recorrido.'],
    easier: 'Hacé un recorrido más corto.',
  },
  'bird-dog': {
    name: 'Bird dog', type: 'reps', rest: 45, pose: 'birddog', hl: ['torso'], perSide: true,
    desc: 'Estabilidad de core y cadera en cuatro apoyos.',
    tech: ['Manos debajo de los hombros, rodillas debajo de la cadera.', 'Extendé un brazo al frente y la pierna contraria atrás.', 'Cadera nivelada, espalda neutra, sin rotar.', 'Pausa de 1 segundo y volvé.'],
    errors: ['Rotar la cadera.', 'Arquear la espalda al extender la pierna.'],
    easier: 'Extendé solo la pierna o solo el brazo.',
  },
  'calf-raise': {
    name: 'Elevaciones de pantorrillas', type: 'reps', rest: 40, pose: 'calf', hl: ['legs'],
    desc: 'Fortalece gemelos y tobillos: clave para correr con menos molestias.',
    tech: ['De pie, pies al ancho de la cadera (podés apoyar una mano en la pared).', 'Subí en puntas de pie lo más alto posible.', 'Pausa arriba.', 'Bajá lento hasta apoyar el talón.'],
    errors: ['Rebotar.', 'Recorrido corto.'],
    easier: 'Hacelas con apoyo y menos repeticiones.',
  },
  'side-plank': {
    name: 'Plancha lateral', type: 'time', rest: 40, pose: 'sideplank', hl: ['torso'], perSide: true,
    desc: 'Core lateral (oblicuos) y estabilidad de hombro y cadera.',
    tech: ['De costado, antebrazo apoyado con el codo debajo del hombro.', 'Elevá la cadera hasta alinear tobillos, cadera y hombros.', 'No dejes caer la cadera.', 'Mantené el tiempo y cambiá de lado.'],
    errors: ['Cadera que cae.', 'Hombro hundido.'],
    easier: 'Apoyá la rodilla de abajo.',
  },
};

export const SEED_ROUTINES = {
  A: {
    id: 'A', name: 'Fuerza A', day: 2, note: 'Martes',
    items: [
      { ex: 'pushup', sets: 3, min: 8, max: 12 },
      { ex: 'squat', sets: 3, min: 12, max: 12 },
      { ex: 'reverse-lunge', sets: 2, min: 10, max: 10 },
      { ex: 'pike', sets: 2, min: 6, max: 8 },
      { ex: 'glute-bridge', sets: 3, min: 15, max: 15 },
      { ex: 'dead-bug', sets: 2, min: 10, max: 10 },
      { ex: 'plank', sets: 3, secs: 30 },
    ],
  },
  B: {
    id: 'B', name: 'Fuerza B', day: 4, note: 'Jueves',
    items: [
      { ex: 'incline-pushup', sets: 3, min: 10, max: 12 },
      { ex: 'close-pushup', sets: 2, min: 6, max: 10 },
      { ex: 'superman', sets: 3, min: 12, max: 12 },
      { ex: 'snow-angel', sets: 3, min: 12, max: 12 },
      { ex: 'bird-dog', sets: 2, min: 10, max: 10 },
      { ex: 'calf-raise', sets: 2, min: 15, max: 15 },
      { ex: 'side-plank', sets: 2, secs: 25 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Hábitos de partida
// freq: daily | days (días específicos) | times (veces por semana)
// link: si un bloque o registro de ese tipo se completa, el hábito se marca solo
// ---------------------------------------------------------------------------
let hid = 0;
const H = (name, cat, freq, opt = {}) => ({ id: `h${String(++hid).padStart(2, '0')}`, name, cat, freq, days: [], times: 3, link: null, active: true, ...opt });
export const SEED_HABITS = [
  H('Asistir al colegio', 'academia', 'days', { days: [1, 2, 3, 4, 5], link: 'school' }),
  H('Cumplir tareas', 'academia', 'days', { days: [1, 2, 3, 4, 5] }),
  H('Estudiar', 'academia', 'days', { days: [1, 2, 3, 4, 5, 6], link: 'study' }),
  H('Preparar exámenes', 'academia', 'times', { times: 2, link: 'exams' }),
  H('Repasar contenidos', 'academia', 'days', { days: [1, 2, 4], link: 'review' }),
  H('BJJ', 'deporte', 'days', { days: [1, 3, 5], link: 'bjj' }),
  H('Running', 'deporte', 'times', { times: 3, link: 'run' }),
  H('Calistenia', 'deporte', 'days', { days: [2, 4], link: 'calisthenics' }),
  H('Movilidad', 'deporte', 'times', { times: 2, link: 'mobility' }),
  H('Recuperación', 'deporte', 'days', { days: [1, 2, 3, 4, 5] }),
  H('Trabajar en mi empresa', 'emprendimiento', 'days', { days: [2, 4, 6], link: 'venture' }),
  H('Cumplir objetivos', 'emprendimiento', 'times', { times: 1 }),
  H('Avanzar proyectos', 'emprendimiento', 'times', { times: 3 }),
  H('Reunión con mi socio', 'emprendimiento', 'times', { times: 1 }),
  H('Dormir correctamente', 'personal', 'daily', { link: 'sleep' }),
  H('Organizar mi habitación', 'personal', 'times', { times: 2 }),
  H('Preparar mis cosas', 'personal', 'days', { days: [0, 1, 2, 3, 4], link: 'prep' }),
  H('Leer', 'personal', 'times', { times: 3, link: 'read' }),
  H('Tener tiempo libre', 'personal', 'daily'),
  H('Tiempo con familia y amigos', 'personal', 'times', { times: 3 }),
];

// ---------------------------------------------------------------------------
// Progresión gradual hacia 5 km (3 sesiones por semana, ritmo conversacional)
// Cada sesión: 5 min caminando de entrada en calor + bloque + 5 min de vuelta a la calma.
// ---------------------------------------------------------------------------
const W = (week, run, walk, reps, label) => ({ week, run, walk, reps, label });
export const RUN_PLAN = [
  W(1, 60, 120, 8, '8 × (1′ trote + 2′ caminata)'),
  W(2, 90, 120, 6, '6 × (1′30″ trote + 2′ caminata)'),
  W(3, 120, 120, 6, '6 × (2′ trote + 2′ caminata)'),
  W(4, 180, 90, 5, '5 × (3′ trote + 1′30″ caminata)'),
  W(5, 240, 90, 4, '4 × (4′ trote + 1′30″ caminata)'),
  W(6, 360, 120, 3, '3 × (6′ trote + 2′ caminata)'),
  W(7, 480, 120, 3, '3 × (8′ trote + 2′ caminata)'),
  W(8, 720, 120, 2, '2 × (12′ trote + 2′ caminata)'),
  W(9, 900, 120, 2, '2 × (15′ trote + 2′ caminata)'),
  W(10, 1200, 0, 1, '20′ de trote continuo'),
  W(11, 1500, 0, 1, '25′ de trote continuo'),
  W(12, 1800, 0, 1, '30′ continuos o 5 km a ritmo cómodo'),
];
export const RUN_SESSIONS_PER_WEEK = 3;

export function runIntervals(week) {
  const w = RUN_PLAN[Math.min(Math.max(week, 1), RUN_PLAN.length) - 1];
  const out = [{ t: 'walk', s: 300, label: 'Entrada en calor' }];
  for (let i = 0; i < w.reps; i++) {
    out.push({ t: 'run', s: w.run, label: `Trote ${i + 1}/${w.reps}` });
    if (w.walk && i < w.reps - 1) out.push({ t: 'walk', s: w.walk, label: 'Caminata' });
  }
  out.push({ t: 'walk', s: 300, label: 'Vuelta a la calma' });
  return out;
}

// ---------------------------------------------------------------------------
// Comidas: franjas y sugerencias prácticas (sin calorías ni restricciones)
// ---------------------------------------------------------------------------
export const MEAL_SLOTS = [
  { id: 'desayuno', name: 'Desayuno', time: '06:20' },
  { id: 'media', name: 'Media mañana', time: '10:15' },
  { id: 'almuerzo', name: 'Almuerzo', time: '13:00' },
  { id: 'merienda', name: 'Merienda', time: '15:00' },
  { id: 'cena', name: 'Cena', time: '19:00' },
];

export const MEAL_IDEAS = {
  desayuno: ['Huevos revueltos, pan y una fruta', 'Avena con leche, banana y maní', 'Tostadas con queso, yogur y fruta', 'Cocido con leche y pan con queso', 'Licuado de leche, banana y avena'],
  media: ['Fruta y yogur', 'Sándwich de queso y tomate', 'Banana y un puñado de maní', 'Chipa y una fruta', 'Galletitas de avena y leche'],
  almuerzo: ['Arroz, pollo y ensalada', 'Tallarines con carne y verduras', 'Guiso de lentejas o porotos con arroz', 'Mandioca, carne y ensalada', 'Milanesa al horno, puré y ensalada'],
  merienda: ['Leche o cocido con pan y queso', 'Licuado de banana', 'Yogur con cereales y fruta', 'Tostado de jamón y queso', 'Fruta y frutos secos'],
  cena: ['Tortilla de verduras con arroz', 'Pollo o pescado con papas y verduras', 'Wrap de carne con verduras', 'Fideos con pollo', 'Bife con arroz y ensalada'],
};

export const NUTRITION_TIPS = [
  'Comé suficiente: estás en etapa de crecimiento y entrenás casi todos los días.',
  'Después de BJJ o calistenia sumá proteína (huevo, carne, pollo, leche, porotos) y carbohidrato (arroz, mandioca, pan, fruta).',
  'Antes de correr o entrenar, algo liviano 1–2 horas antes (fruta, pan, yogur).',
  'Llevá agua al colegio y tomá más los días de calor y de entrenamiento.',
  'Estas son ideas generales, no un plan médico. Para un plan personalizado, consultá con un nutricionista.',
];

// ---------------------------------------------------------------------------
// Recordatorios por defecto (pocos, para no saturar)
// ---------------------------------------------------------------------------
export const DEFAULT_REMINDERS = {
  lead: 5, // minutos de anticipación
  groups: {
    wake: { label: 'Despertar', on: true },
    school: { label: 'Colegio', on: false },
    study: { label: 'Estudio y repaso', on: true },
    training: { label: 'Entrenamientos (running, calistenia, BJJ)', on: true },
    venture: { label: 'Emprendimiento', on: true },
    prep: { label: 'Preparar el día siguiente', on: true },
    sleep: { label: 'Hora de dormir', on: true },
  },
  meals: { on: false },
  water: { on: false, times: ['09:00', '11:30', '14:00', '16:30', '18:30'] },
  checkin: { on: true, time: '17:00' },
  dailySummary: { on: true, time: '20:15' },
  weeklySummary: { on: false, time: '17:30' },
  tasks: { on: false, time: '19:00' },
  inApp: true,
};

export const KIND_TO_GROUP = {
  wake: 'wake', school: 'school', study: 'study', review: 'study', exams: 'study',
  run: 'training', walk: 'training', calisthenics: 'training', bjj: 'training', mobility: 'training',
  venture: 'venture', prep: 'prep', goals: 'prep', sleep: 'sleep', disconnect: 'sleep',
};
