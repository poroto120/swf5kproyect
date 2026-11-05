// Canal mínimo para que las vistas pidan re-render o navegación sin dependencias circulares.
export const bus = {
  refresh: () => {},
  go: (hash) => { if (location.hash === hash) bus.refresh(); else location.hash = hash; },
};
