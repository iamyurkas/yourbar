import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import slugify from 'slugify';
import { Image } from 'react-native';

import { ASSET_MAP } from '../../scripts/assetMap';
import { getAllIngredients, saveAllIngredients } from './ingredientsStorage';
import { getAllCocktails, replaceAllCocktails } from './cocktailsStorage';

const getExt = (uri) => {
  const match = /\.([a-zA-Z0-9]+)(?:[?#].*)?$/.exec(uri || '');
  return match ? `.${match[1]}` : '.jpg';
};

function serializePhotoUri(uri, type, { id, name }) {
  if (!uri) return null;
  const slug = slugify(String(name || ''), { lower: true, strict: true });
  return `assets/${type}/${id}-${slug}${getExt(uri)}`;
}

function resolvePhoto(path) {
  if (!path) return null;
  const str = String(path);
  if (/^(https?:|file:)/.test(str)) return str;
  const mod = ASSET_MAP[str];
  if (mod) {
    const resolved = Image.resolveAssetSource(mod);
    return resolved?.uri ?? null;
  }
  console.warn('Missing asset', str);
  return null;
}

function toNumberId(value) {
  if (value == null) return null;
  const direct = Number(value);
  if (!Number.isNaN(direct)) return direct;
  const str = String(value);
  const parts = str.split('-');
  const last = parts[parts.length - 1];
  const num = Number(last);
  return Number.isNaN(num) ? null : num;
}

function stripFalse(value) {
  if (Array.isArray(value)) return value.map(stripFalse);
  if (value && typeof value === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === false) continue;
      res[k] = stripFalse(v);
    }
    return res;
  }
  return value;
}

/**
 * Export all ingredients and cocktails to a JSON file and open share dialog.
 * Returns the URI of the created file.
 */
export async function exportAllData() {
  const [allIngredients, allCocktails] = await Promise.all([
    getAllIngredients(),
    getAllCocktails(),
  ]);
  const ingredients = allIngredients.map(
    ({ inBar, inShoppingList, photoUri, ...rest }) => ({
      ...rest,
      photoUri: serializePhotoUri(photoUri, 'ingredients', rest),
    })
  );
  const cocktails = allCocktails.map(({ rating, photoUri, ...rest }) => ({
    ...rest,
    photoUri: serializePhotoUri(photoUri, 'cocktails', rest),
  }));
  const data = stripFalse({ ingredients, cocktails });
  const json = JSON.stringify(data, null, 2);
  const fileName = `yourbar-backup-${Date.now()}.json`;
  const fileUri = FileSystem.cacheDirectory + fileName;
  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Share YourBar backup',
      });
    }
  } catch (e) {
    console.warn('Sharing failed', e);
  }
  return fileUri;
}

/**
 * Export all ingredient and cocktail photos as a ZIP archive and open share dialog.
 * Returns the URI of the created file.
 */
export async function exportAllPhotos() {
  const [ingredients, cocktails] = await Promise.all([
    getAllIngredients(),
    getAllCocktails(),
  ]);

  const zip = new JSZip();
  const added = new Set();

  const addFile = async (uri, name) => {
    if (!uri || added.has(uri)) return;
    try {
      let readUri = uri;
      // expo-file-system can only read local files; download remote ones first
      if (/^https?:/.test(uri)) {
        const tmp = `${FileSystem.cacheDirectory}${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}${getExt(uri)}`;
        const res = await FileSystem.downloadAsync(uri, tmp);
        readUri = res.uri;
      }
      const base64 = await FileSystem.readAsStringAsync(readUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (readUri !== uri) {
        await FileSystem.deleteAsync(readUri, { idempotent: true });
      }
      zip.file(name, base64, { base64: true });
      added.add(uri);
    } catch (e) {
      console.warn('Failed to add photo', uri, e);
    }
  };

  for (const ing of ingredients) {
    const path = serializePhotoUri(ing.photoUri, 'ingredients', ing);
    if (path) await addFile(ing.photoUri, path.replace(/^assets\//, ''));
  }
  for (const c of cocktails) {
    const path = serializePhotoUri(c.photoUri, 'cocktails', c);
    if (path) await addFile(c.photoUri, path.replace(/^assets\//, ''));
  }

  const base64Zip = await zip.generateAsync({ type: 'base64' });
  const fileName = `yourbar-photos-${Date.now()}.zip`;
  const fileUri = FileSystem.cacheDirectory + fileName;
  await FileSystem.writeAsStringAsync(fileUri, base64Zip, {
    encoding: FileSystem.EncodingType.Base64,
  });
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/zip',
        dialogTitle: 'Share YourBar photos',
      });
    }
  } catch (e) {
    console.warn('Sharing failed', e);
  }
  return fileUri;
}

/**
 * Pick a JSON file and import ingredients and cocktails from it.
 * Returns true on success, false otherwise.
 */
export async function importAllData() {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (res.canceled || res.type === 'cancel') return false;
    const uri = res.assets ? res.assets[0].uri : res.uri;
    const contents = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const data = JSON.parse(contents);
    if (Array.isArray(data.ingredients)) {
      const ingredients = data.ingredients.map(
        ({ inBar, inShoppingList, photoUri, ...rest }) => ({
          ...rest,
          id: toNumberId(rest?.id) ?? 0,
          baseIngredientId:
            rest?.baseIngredientId != null
              ? toNumberId(rest.baseIngredientId)
              : null,
          photoUri: resolvePhoto(photoUri),
          inBar: false,
          inShoppingList: false,
        })
      );
      await saveAllIngredients(ingredients);
    }
    if (Array.isArray(data.cocktails)) {
      const cocktails = data.cocktails.map(
        ({ rating, photoUri, ...rest }) => ({
          ...rest,
          id: toNumberId(rest?.id) ?? 0,
          photoUri: resolvePhoto(photoUri),
          ingredients: Array.isArray(rest?.ingredients)
            ? rest.ingredients.map((ing) => ({
                ...ing,
                ingredientId:
                  ing?.ingredientId != null
                    ? toNumberId(ing.ingredientId)
                    : null,
                substitutes: Array.isArray(ing?.substitutes)
                  ? ing.substitutes.map((s) => ({
                      ...s,
                      id: toNumberId(s?.id),
                    }))
                  : [],
                garnish: !!ing?.garnish,
                optional: !!ing?.optional,
                allowBaseSubstitution: !!(
                  ing?.allowBaseSubstitution ?? ing?.allowBaseSubstitute
                ),
                allowBrandedSubstitutes: !!ing?.allowBrandedSubstitutes,
              }))
            : [],
        })
      );
      await replaceAllCocktails(cocktails);
    }
    return true;
  } catch (e) {
    console.error('Import failed', e);
    return false;
  }
}

