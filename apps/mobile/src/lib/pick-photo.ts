import type { UploadPart } from '@heartlink/consumer-api';
import * as ImagePicker from 'expo-image-picker';

/**
 * Choosing a profile photo, on every surface the app runs on.
 *
 * Lived inside the onboarding screen, which is why a photo could only ever be
 * added while signing up: the Account screen had a picture and a caption and no
 * way to change either. One module, so both screens pick a photo the same way.
 */
export interface PickedPhoto {
  /** Ready to hand to the API client: a `File` on web, a descriptor on a phone. */
  part: UploadPart;
  name: string;
}

/**
 * What the API will accept, from a file name.
 *
 * ImagePicker does report a `mimeType`, but not on every platform or every
 * source — the camera on Android frequently omits it — and an empty type is
 * what the server rejects. The extension is the fallback that is always there.
 */
function mimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

/**
 * Camera / library picker for iOS and Android.
 *
 * This used to return null on native, with the UI saying upload was web-only —
 * a leftover from when native was going to be a separate Flutter app. The
 * upload endpoint wants multipart form data, so the picked asset's `file://`
 * uri is fetched into a real Blob. Permissions are asked for at the moment of
 * use, so the OS prompt arrives with the reason on screen.
 */
export async function pickNativeImage(source: 'library' | 'camera'): Promise<PickedPhoto | null> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error(
      source === 'camera'
        ? 'Camera access is off. Turn it on in Settings to take a photo.'
        : 'Photo access is off. Turn it on in Settings to choose a photo.',
    );
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 5],
    quality: 0.85,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;

  const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
  // The path, not a Blob. `fetch(uri).blob()` reads the whole image into
  // memory and hands over a part with no usable content type, which the API
  // refuses as an unsupported photo — the upload that worked in a browser and
  // failed on a phone. React Native's FormData streams from the path itself.
  return {
    part: { uri: asset.uri, name, type: asset.mimeType || mimeFromName(name) },
    name,
  };
}

/** Where the photo comes from. Both are the phone's own pickers. */
export type PhotoSource = 'library' | 'camera';

export function pickPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  return pickNativeImage(source);
}
