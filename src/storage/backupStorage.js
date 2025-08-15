import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

import { getAllIngredients, saveAllIngredients } from './ingredientsStorage';
import { getAllCocktails, replaceAllCocktails } from './cocktailsStorage';

/**
 * Export all ingredients and cocktails to a JSON file and open share dialog.
 * Returns the URI of the created file.
 */
export async function exportAllData() {
  const [ingredients, cocktails] = await Promise.all([
    getAllIngredients(),
    getAllCocktails(),
  ]);
  const data = { ingredients, cocktails };
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
      await saveAllIngredients(data.ingredients);
    }
    if (Array.isArray(data.cocktails)) {
      await replaceAllCocktails(data.cocktails);
    }
    return true;
  } catch (e) {
    console.error('Import failed', e);
    return false;
  }
}

