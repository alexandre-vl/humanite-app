import { Directory, File, Paths } from 'expo-file-system';
const directory = (): Directory => new Directory(Paths.cache, 'article-audio');
let sequence = 0;
/** Only complete, authorized WAVs reach the native player. They never enter cloud backups. */
export function saveSpeech(bytes: Uint8Array, duration: number): Readonly<{ uri: string; duration: number }> {
  const folder = directory();
  folder.create({ intermediates: true, idempotent: true });
  sequence += 1;
  const file = new File(folder, `${String(sequence)}.wav`);
  file.write(bytes);
  return { uri: file.uri, duration };
}
/** Closing or changing the reader erases the whole temporary listening session. */
export function clearSpeech(): void {
  const folder = directory();
  if (folder.exists) {
    folder.delete();
  }
}
