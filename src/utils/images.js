import * as ImageManipulator from 'expo-image-manipulator';

export async function resizeImage(uri, maxSize = 150) {
  try {
    const { width, height } = await ImageManipulator.manipulate(uri).renderAsync();
    const context = ImageManipulator.manipulate(uri);
    context.extent({ width, height, backgroundColor: '#fff' });
    if (width > height) {
      context.resize({ width: maxSize });
    } else {
      context.resize({ height: maxSize });
    }
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch (e) {
    console.warn('resizeImage failed', e);
    return uri;
  }
}
