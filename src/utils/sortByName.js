export const sortByName = (a, b, locale = 'uk') =>
  (a?.name || '').localeCompare(b?.name || '', locale, { sensitivity: 'base' });
