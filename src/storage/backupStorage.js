import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import JSZip from 'jszip';

import { getAllIngredients, saveAllIngredients } from './ingredientsStorage';
import { getAllCocktails, replaceAllCocktails } from './cocktailsStorage';

function getExt(uri) {
  const m = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uri || '');
  return m ? `.${m[1]}` : '.jpg';
}

async function readFileBase64(uri) {
  if (/^https?:/.test(uri)) {
    const tmp = FileSystem.cacheDirectory + `tmp-${Date.now()}`;
    try {
      const { uri: downloaded } = await FileSystem.downloadAsync(uri, tmp);
      const data = await FileSystem.readAsStringAsync(downloaded, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.deleteAsync(downloaded, { idempotent: true });
      return data;
    } catch (e) {
      console.warn('Failed to download image', uri, e);
      return null;
    }
  }
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (e) {
    console.warn('Failed to read image', uri, e);
    return null;
  }
}

function dirName(path) {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
}

/**
 * Export all ingredients and cocktails with photos into a ZIP archive.
 * Returns the URI of the created archive.
 */
export async function exportAllData() {
  try {
    console.log('Export: fetching data');
    const [ingredients, cocktails] = await Promise.all([
      getAllIngredients(),
      getAllCocktails(),
    ]);
    console.log(
      `Export: preparing ${ingredients.length} ingredients and ${cocktails.length} cocktails`
    );

    const zip = new JSZip();
    const data = { ingredients: [], cocktails: [] };

    for (const ing of ingredients) {
      const item = { ...ing };
      if (ing.photoUri) {
        const rel = `ingredients/${ing.id}${getExt(ing.photoUri)}`;
        const img = await readFileBase64(ing.photoUri);
        if (img) {
          zip.file(rel, img, { base64: true });
          item.photoUri = rel;
        }
      }
      data.ingredients.push(item);
    }

    for (const c of cocktails) {
      const item = { ...c };
      if (c.photoUri) {
        const rel = `cocktails/${c.id}${getExt(c.photoUri)}`;
        const img = await readFileBase64(c.photoUri);
        if (img) {
          zip.file(rel, img, { base64: true });
          item.photoUri = rel;
        }
      }
      data.cocktails.push(item);
    }

    zip.file('data.json', JSON.stringify(data, null, 2));

    console.log('Export: generating ZIP');
    const fileName = `yourbar-backup-${Date.now()}.zip`;
    const fileUri = FileSystem.cacheDirectory + fileName;

    // create empty file
    await FileSystem.writeAsStringAsync(fileUri, '', {
      encoding: FileSystem.EncodingType.Base64,
    });

    // stream zip to file to avoid large memory usage
    await new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      let remainder = '';
      const stream = zip.generateInternalStream({
        type: 'base64',
        streamFiles: true,
      });
      stream.on('data', (chunk) => {
        const data = remainder + chunk;
        const validLen = data.length - (data.length % 4);
        remainder = data.slice(validLen);
        const toWrite = data.slice(0, validLen);
        if (toWrite) {
          chain = chain.then(() =>
            FileSystem.writeAsStringAsync(fileUri, toWrite, {
              encoding: FileSystem.EncodingType.Base64,
              append: true,
            })
          );
        }
      });
      stream.on('error', reject);
      stream.on('end', () => {
        if (remainder) {
          chain = chain.then(() =>
            FileSystem.writeAsStringAsync(fileUri, remainder, {
              encoding: FileSystem.EncodingType.Base64,
              append: true,
            })
          );
        }
        chain.then(resolve).catch(reject);
      });
      stream.resume();
    });

    console.log('Export: archive created at', fileUri);

    return fileUri;
  } catch (e) {
    console.error('exportAllData failed', e);
    throw e;
  }
}

/**
 * Pick a ZIP archive and import ingredients and cocktails with photos from it.
 * Returns true on success, false otherwise.
 */
export async function importAllData() {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/zip',
      copyToCacheDirectory: true,
    });
    if (res.canceled || res.type === 'cancel') return false;
    const uri = res.assets ? res.assets[0].uri : res.uri;
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const zip = await JSZip.loadAsync(base64, { base64: true });
    const dataStr = await zip.file('data.json').async('string');
    const data = JSON.parse(dataStr);

    if (Array.isArray(data.ingredients)) {
      const list = [];
      for (const ing of data.ingredients) {
        let photoUri = null;
        if (ing.photoUri && zip.file(ing.photoUri)) {
          const imgBase64 = await zip.file(ing.photoUri).async('base64');
          const dest = FileSystem.documentDirectory + ing.photoUri;
          await FileSystem.makeDirectoryAsync(dirName(dest), {
            intermediates: true,
          });
          await FileSystem.writeAsStringAsync(dest, imgBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          photoUri = dest;
        }
        list.push({ ...ing, photoUri });
      }
      await saveAllIngredients(list);
    }

    if (Array.isArray(data.cocktails)) {
      const list = [];
      for (const c of data.cocktails) {
        let photoUri = null;
        if (c.photoUri && zip.file(c.photoUri)) {
          const imgBase64 = await zip.file(c.photoUri).async('base64');
          const dest = FileSystem.documentDirectory + c.photoUri;
          await FileSystem.makeDirectoryAsync(dirName(dest), {
            intermediates: true,
          });
          await FileSystem.writeAsStringAsync(dest, imgBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          photoUri = dest;
        }
        list.push({ ...c, photoUri });
      }
      await replaceAllCocktails(list);
    }
    return true;
  } catch (e) {
    console.error('Import failed', e);
    return false;
  }
}

