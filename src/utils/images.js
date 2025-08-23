import * as ImageManipulator from 'expo-image-manipulator';

export async function resizeImage(uri, maxSize = 150) {
  try {
    const info = await ImageManipulator.manipulateAsync(uri, []);
    const resizeAction = info.width > info.height ? { resize: { width: maxSize } } : { resize: { height: maxSize } };
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [resizeAction],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (e) {
    console.warn('resizeImage failed', e);
    return uri;
  }
}
