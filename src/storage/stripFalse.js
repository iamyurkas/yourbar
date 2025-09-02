export function stripFalse(value) {
  if (Array.isArray(value)) {
    const arr = value
      .map(stripFalse)
      .filter((v) => {
        if (v === false || v == null) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (v && typeof v === 'object') return Object.keys(v).length > 0;
        return true;
      });
    return arr;
  }
  if (value && typeof value === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === false || v == null) continue;
      const cleaned = stripFalse(v);
      if (Array.isArray(cleaned) && cleaned.length === 0) continue;
      if (cleaned && typeof cleaned === 'object' && Object.keys(cleaned).length === 0)
        continue;
      res[k] = cleaned;
    }
    return res;
  }
  return value;
}

