# PROJECT 5K — Personal Life Performance System

**Build yourself, every day.**

Aplicación web progresiva (PWA) para iPhone: plan diario, entrenamiento (calistenia, running hacia 5 km, BJJ), recuperación y sueño, alimentación, hábitos, control semanal e informe con propuestas que solo se aplican con tu aprobación.

Costo total: **$0**. Sin servidores, sin cuentas, sin suscripciones.

---

## 1. Arquitectura (y por qué)

| Pieza | Elección | Motivo |
|---|---|---|
| Interfaz | HTML + CSS + JavaScript modular (ES modules) | Sin compilación ni dependencias: se sube tal cual a GitHub Pages y es fácil de mantener. |
| Hosting | GitHub Pages | Gratis, con HTTPS incluido (obligatorio para PWA). |
| Offline | Service worker (`sw.js`) | Toda la app queda guardada en el iPhone y funciona sin conexión. |
| Datos | IndexedDB | Historial completo en el dispositivo (incluye fotos de comidas). |
| Configuración | localStorage | Perfil, objetivos, tema y recordatorios. |
| Gráficas | SVG propio (`js/charts.js`) | ~5 KB en vez de ~200 KB de Chart.js, sin red y con el estilo de la app. |
| Ilustraciones | Figuras SVG animadas (`js/figures.js`) | Cada ejercicio muestra el movimiento, offline. |
| Copias | Exportar/Importar JSON | Guardalas en iCloud Drive (gratis). |

Datos personales (edad, altura, peso) **no están en el código**: se cargan en el primer uso. El repositorio público solo contiene la app.

---

## 2. Publicar gratis en GitHub Pages

1. Creá una cuenta en <https://github.com> (gratis).
2. Botón **New repository** → nombre `project5k` → **Public** → *Create repository*.
   (Pages gratis requiere repositorio público. Tus datos no se suben nunca: viven en el iPhone.)
3. En el repo vacío: **uploading an existing file** → arrastrá **todo el contenido** de esta carpeta (`index.html`, `sw.js`, `manifest.webmanifest`, `css/`, `js/`, `icons/`) → *Commit changes*.
4. **Settings → Pages** → *Source: Deploy from a branch* → Branch `main`, carpeta `/ (root)` → *Save*.
5. En 1–2 minutos la app queda en `https://TU-USUARIO.github.io/project5k/` con HTTPS.

No hace falta dominio propio. Si algún día querés uno, Pages lo admite, pero no es necesario.

### Instalar en el iPhone
1. Abrí la URL en **Safari**.
2. **Compartir** → **Añadir a pantalla de inicio** → *Añadir*.
3. Abrí siempre desde el ícono **5K** (pantalla completa, offline).

> Safari y la app instalada tienen almacenamiento separado. Usá siempre el ícono.

### Publicar una actualización
1. Subí los archivos modificados al repo.
2. En `sw.js`, cambiá `VERSION` (por ejemplo `p5k-v1.0.1`). Sin esto, el iPhone sigue usando la versión guardada.
3. Al abrir la app aparece “Hay una versión nueva → Actualizar”.

### Probar en la computadora
```bash
cd project5k
python3 -m http.server 8080
# abrir http://localhost:8080
```

---

## 3. Recordatorios (gratis y reales)

iOS no permite que una web programe notificaciones con la app cerrada sin un servidor de push. La solución gratuita:

- **Más → Recordatorios → Agregar al calendario** genera un `.ics` con tus horarios (salen del plan semanal) y alarmas. Importalo en un calendario llamado *PROJECT 5K*: el Calendario de iOS te avisa aunque la app esté cerrada.
- Si cambiás el plan, borrá ese calendario y volvé a generarlo.
- Además, con la app abierta hay avisos dentro de la app (notificación del sistema si concedés permiso; requiere iOS 16.4+ y la app instalada).

---

## 4. Xiaomi Smart Band → Apple Health → PROJECT 5K

No existe API pública de Xiaomi ni conexión Bluetooth desde una web. El camino real:

1. **Mi Fitness** → Perfil → Datos de terceros → **Salud**: activá sueño, pasos, frecuencia cardíaca, entrenamientos y peso.
2. Creá el Atajo **“P5K Salud”** (instrucciones paso a paso dentro de la app, en *Más → Apple Health y Xiaomi*). El Atajo arma este texto y lo copia al portapapeles:

```
P5K
fecha: 2026-11-05
pasos: 8432
sueno_min: 495
fc_reposo: 58
fc_media: 72
distancia_km: 6,1
kcal_activas: 420
peso_kg: 96,8
```

3. En PROJECT 5K: **Pegar datos del Atajo** → revisás → *Guardar*. Cada dato queda marcado como **Apple Health**; lo que cargues a mano queda como **Manual**.

El lector acepta coma o punto decimal, separador de miles, y el sueño en minutos, segundos, horas, `7:30` o `7 h 30 min`. Las líneas faltantes se ignoran.

---

## 5. Copias de seguridad

**Más → Datos y copias → Exportar copia**. Guardala en *Archivos → iCloud Drive*. La app te recuerda hacerla si pasó más de una semana. *Importar* permite reemplazar todo o combinar.

---

## 6. Limitaciones reales

- Los datos viven solo en ese iPhone; no hay sincronización entre dispositivos.
- Sin push con la app cerrada (se resuelve con el calendario `.ics`).
- La importación de Apple Health es manual (un Atajo + un toque); una app nativa podría automatizarla, pero requiere cuenta paga de Apple Developer.
- Con la pantalla bloqueada, iOS pausa el JavaScript: los avisos de voz del running se pausan (el tiempo se recalcula al volver). La app intenta mantener la pantalla encendida.

---

## 7. Estructura

```
index.html              Shell de la app y metadatos iOS
manifest.webmanifest    Instalación PWA
sw.js                   Offline + actualizaciones
css/app.css             Sistema de diseño (oscuro/claro)
js/app.js               Arranque, rutas, onboarding
js/db.js                IndexedDB
js/store.js             Plan del día, progreso, hábitos, recuperación, plan 5K
js/seed.js              Plan semanal, ejercicios, rutinas, hábitos, plan 5K, ideas de comidas
js/insights.js          Informe semanal y propuestas
js/figures.js           Ilustraciones animadas de ejercicios
js/charts.js            Gráficas SVG
js/quicklog.js          Registro rápido (peso, sueño, running, BJJ, comidas…)
js/reminders.js         Calendario .ics y avisos en la app
js/health.js            Lector del Atajo de Apple Health
js/backup.js            Copias, datos demo, borrado
js/views/*.js           Pantallas
icons/                  Ícono, favicon y pantallas de inicio de iOS
```

Las recomendaciones de la app son orientativas y no reemplazan consejo médico o nutricional profesional.
