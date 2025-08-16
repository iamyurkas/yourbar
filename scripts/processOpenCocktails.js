const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../assets/data/open-cocktails.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Built-in tags available in the application
const BUILT_IN_TAGS = [
  { id: 1, name: 'IBA Official', color: '#38D9A9' },
  { id: 2, name: 'strong', color: '#FF6B6B' },
  { id: 3, name: 'moderate', color: '#FF8787' },
  { id: 4, name: 'soft', color: '#FFA94D' },
  { id: 5, name: 'long', color: '#FFD43B' },
  { id: 6, name: 'shooter', color: '#c78acfff' },
  { id: 7, name: 'non-alcoholic', color: '#69DB7C' },
];

const ALCOHOL_RE = /(vodka|gin|rum|tequila|whisk(e)?y|bourbon|scotch|rye|brandy|cognac|beer|lager|ale|stout|porter|wine|vermouth|sherry|port|liqueur|liquor|absinthe|amaro|sake|champagne|mead|cachaca|bitters)/i;
const MIXER_RE = /(juice|soda|water|cola|tonic|milk|cream|coffee|tea|lemonade)/i;

function assignBuiltInTags(cocktail) {
  // Preserve IBA tag if it exists, other tags will be reassigned
  const tagIds = new Set(
    (cocktail.tags || [])
      .filter(t => t.id === 1)
      .map(t => t.id)
  );

  const names = cocktail.ingredients.map(i => i.name);
  const alcoholCount = names.filter(n => ALCOHOL_RE.test(n)).length;
  const total = names.length;
  const isAlcoholic = alcoholCount > 0;
  const hasMixer = cocktail.ingredients.some(i => MIXER_RE.test(i.name));
  const hasShotGlass = /shot/i.test(cocktail.glassId || '');

  if (!isAlcoholic) {
    tagIds.add(7);
  } else {
    if (hasShotGlass) tagIds.add(6);
    const ratio = total ? alcoholCount / total : 0;
    if (ratio >= 0.6) {
      tagIds.add(2);
    } else if (ratio >= 0.4) {
      tagIds.add(3);
    } else {
      tagIds.add(4);
    }
    if (hasMixer) tagIds.add(5);
  }

  cocktail.tags = Array.from(tagIds).map(id => BUILT_IN_TAGS.find(t => t.id === id));
}

function cleanInstructions(instr) {
  if (!instr) return '';
  // track if "old fashioned glass" present
  const hasOldFashioned = /old fashioned glass/i.test(instr);
  let text = instr.replace(/old fashioned glass/gi, 'rocks glass');
  // replace parts with oz when preceded by number
  text = text.replace(/(\d+(?:\.\d+)?)\s+parts?/gi, '$1 oz');
  // replace phrase "equal parts" with "equal oz"
  text = text.replace(/equal parts/gi, 'equal oz');
  // split into sentences/newlines
  const steps = text
    .split(/\n|\.\s*/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1));
  return { text: steps.join('\n'), hasOldFashioned };
}

function ensureDescription(desc, name) {
  if (!desc || desc.trim().split(/\s+/).length < 4) {
    return `A classic ${name} cocktail.`;
  }
  return desc.trim();
}

(data.cocktails || []).forEach(c => {
  c.tags = Array.isArray(c.tags) ? c.tags : [];
  assignBuiltInTags(c);
  const { text: instr, hasOldFashioned } = cleanInstructions(c.instructions || '');
  c.instructions = instr;
  if (hasOldFashioned || c.glassId === 'old_fashioned_glass' || c.glassId === 'oldfashioned_glass') {
    c.glassId = 'rocks_glass';
  }
  c.description = ensureDescription(c.description || '', c.name);
  c.ingredients.forEach(ing => {
    if (ing.unitId === 13) {
      ing.unitId = 12;
    }
  });
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
