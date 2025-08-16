import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import { getAllIngredients, saveAllIngredients } from './ingredientsStorage';
import { getAllCocktails, replaceAllCocktails } from './cocktailsStorage';

async function embedPhoto(item) {
  if (!item?.photoUri) return item;
  try {
    const base64 = await FileSystem.readAsStringAsync(item.photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const extMatch = /\.([a-zA-Z0-9]+)$/.exec(item.photoUri);
    const ext = extMatch ? extMatch[1] : 'jpg';
    return { ...item, photo: { base64, ext } };
  } catch (e) {
    console.warn('Failed to read photo', e);
    return item;
  }
}

async function restorePhoto(item, prefix) {
  if (!item?.photo?.base64) return item;
  try {
    const ext = item.photo.ext || 'jpg';
    const fileName = `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + fileName;
    await FileSystem.writeAsStringAsync(fileUri, item.photo.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const { photo, ...rest } = item;
    return { ...rest, photoUri: fileUri };
  } catch (e) {
    console.warn('Failed to write photo', e);
    return item;
  }
}

/**
 * Export all ingredients and cocktails to a JSON file and open share dialog.
 * Returns the URI of the created file.
 */
export async function exportAllData() {
  const [ingredients, cocktails] = await Promise.all([
    getAllIngredients(),
    getAllCocktails(),
  ]);
  const data = {
    ingredients: await Promise.all(ingredients.map((i) => embedPhoto(i))),
    cocktails: await Promise.all(cocktails.map((c) => embedPhoto(c))),
  };
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
        dialogTitle: 'Share yourbar backup',
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
      const restoredIngredients = await Promise.all(
        data.ingredients.map((i) => restorePhoto(i, 'ingredient'))
      );
      await saveAllIngredients(restoredIngredients);
    }
    if (Array.isArray(data.cocktails)) {
      const restoredCocktails = await Promise.all(
        data.cocktails.map((c) => restorePhoto(c, 'cocktail'))
      );
      await replaceAllCocktails(restoredCocktails);
    }
    return true;
  } catch (e) {
    console.error('Import failed', e);
    return false;
  }
}

