export const normalizeSearch = (s) =>
  String(s || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
