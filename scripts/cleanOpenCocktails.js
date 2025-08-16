const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '../assets/data/open-cocktails.json');

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const TAGS = [
  { id: 1, name: "IBA Official", color: "#38D9A9" },
  { id: 2, name: "strong", color: "#FF6B6B" },
  { id: 3, name: "moderate", color: "#FF8787" },
  { id: 4, name: "soft", color: "#FFA94D" },
  { id: 5, name: "long", color: "#FFD43B" },
  { id: 6, name: "shooter", color: "#c78acfff" },
  { id: 7, name: "non-alcoholic", color: "#69DB7C" },
];
const tagById = Object.fromEntries(TAGS.map(t => [t.id, t]));
const alcoholRegex = /rum|vodka|gin|whisk|tequila|brandy|vermouth|bitters?|campari|beer|wine|liqueur|sake|cognac|champagne|bourbon|absinthe|amaro|jager|sherry|port|mezcal|kirsch|pisco|aquavit/i;

for (const c of data.cocktails) {
  let hasIce = false;
  for (const ing of c.ingredients) {
    if (/ice/i.test(ing.name)) hasIce = true;
    if (ing.garnish && alcoholRegex.test(ing.name)) {
      ing.garnish = false;
    }
    if (ing.unitId === 11) { // ml
      const amt = parseFloat(ing.amount);
      if (!isNaN(amt) && amt >= 1 && amt <= 3) {
        const oz = +(amt / 30).toFixed(2);
        ing.amount = oz.toString().replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
        ing.unitId = 12; // oz
      }
    }
    if (ing.unitId === 13) {
      ing.unitId = 12;
    }
  }
  const text = `${c.description || ''} ${c.instructions || ''}`.toLowerCase();
  if (!hasIce && text.includes('ice')) {
    const newOrder = c.ingredients.reduce((m, i) => Math.max(m, i.order), 0) + 1;
    c.ingredients.push({
      order: newOrder,
      ingredientId: '1755200244973-346304',
      name: 'Ice',
      amount: '90',
      unitId: 8, // gr
      garnish: false,
      optional: false,
      allowBaseSubstitution: false,
      allowBrandedSubstitutes: false,
      substitutes: [],
    });
  }
  // instructions style
  if (typeof c.instructions === 'string') {
    let instr = c.instructions.replace(/old fashioned glass/gi, 'Rocks glass').trim();
    let steps = instr.includes('\n') ? instr.split(/\n+/) : instr.split(/\.\s*/);
    steps = steps.map(s => s.trim()).filter(Boolean);
    instr = steps.map(s => {
      if (!/[.!?]$/.test(s)) s += '.';
      return s;
    }).join('\n');
    c.instructions = instr;
  }
  // description fix
  if (typeof c.description === 'string') {
    const words = c.description.trim().split(/\s+/).filter(Boolean);
    if (words.length < 4) {
      let d;
      if (/non[- ]?alcoholic/i.test(c.description)) d = 'A refreshing non-alcoholic cocktail.';
      else if (/shot/i.test(c.description)) d = 'A strong alcoholic shot.';
      else if (/beer/i.test(c.description)) d = 'A beer-based alcoholic cocktail.';
      else d = 'A classic alcoholic cocktail.';
      c.description = d;
    }
  }
  // tags
  const tagIds = new Set((c.tags || []).map(t => t.id));
  if (/non[- ]?alcoholic/i.test(c.description)) tagIds.add(7);
  else {
    let totalAlcoholOz = 0;
    let totalNonAlcoholMl = 0;
    for (const ing of c.ingredients) {
      const amt = parseFloat(ing.amount);
      if (isNaN(amt)) continue;
      if (alcoholRegex.test(ing.name)) {
        let oz = 0;
        if (ing.unitId === 11) oz = amt / 30;
        else if (ing.unitId === 12) oz = amt;
        totalAlcoholOz += oz;
      } else {
        if (ing.unitId === 11) totalNonAlcoholMl += amt;
        else if (ing.unitId === 12) totalNonAlcoholMl += amt * 30;
      }
    }
    if (/shot/i.test(c.description)) tagIds.add(6);
    if (totalAlcoholOz >= 3) tagIds.add(2);
    else if (totalAlcoholOz >= 1.5) tagIds.add(3);
    else tagIds.add(4);
    if (totalNonAlcoholMl >= 120) tagIds.add(5);
  }
  if (/unforgettables|contemporary classics|new era drinks/i.test(c.description)) {
    tagIds.add(1);
  }
  c.tags = Array.from(tagIds).map(id => tagById[id]).filter(Boolean);
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
