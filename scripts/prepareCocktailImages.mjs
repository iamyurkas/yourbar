import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join('assets','source','cocktails');
const DEST_DIR = path.join('assets','cocktails');
const DATA_JSON = path.join('assets','data','data.json');
const COCKTAILS_JSON = path.join('assets','data','cocktails.json');

function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.'’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('Source dir not found');
    process.exit(1);
  }
  fs.mkdirSync(DEST_DIR, { recursive: true });

  const data = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'));
  const cocktails = JSON.parse(fs.readFileSync(COCKTAILS_JSON, 'utf8'));

  const slugToId = new Map();
  for (const c of data.cocktails) {
    const slug = slugify(c.name);
    slugToId.set(slug, c.id);
  }

  const files = fs.readdirSync(SRC_DIR);
  const usedSlugs = new Set();

  for (const file of files) {
    const base = file.toLowerCase();
    const foundSlug = [...slugToId.keys()].find((slug) => base.includes(slug));
    if (!foundSlug) {
      console.warn('No slug match for file', file);
      continue;
    }
    const id = slugToId.get(foundSlug);
    const newName = `${id}-${foundSlug}.jpg`;
    fs.renameSync(path.join(SRC_DIR, file), path.join(DEST_DIR, newName));
    usedSlugs.add(foundSlug);

    const relPath = `assets/cocktails/${newName}`;
    const dataCocktail = data.cocktails.find((c) => slugify(c.name) === foundSlug);
    if (dataCocktail) dataCocktail.photoUri = relPath;
    const cockObj = cocktails.find((c) => slugify(c.name) === foundSlug);
    if (cockObj) cockObj.image = relPath;
  }

  fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2));
  fs.writeFileSync(COCKTAILS_JSON, JSON.stringify(cocktails, null, 2));

  // remove source dir
  fs.rmSync(SRC_DIR, { recursive: true, force: true });

  const missing = [...slugToId.keys()].filter((slug) => !usedSlugs.has(slug));
  if (missing.length) {
    console.warn('Missing images for slugs:', missing);
  }
}

main();
