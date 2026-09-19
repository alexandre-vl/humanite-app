/**
 * What a picture import resolves to. Metro turns an asset file into an opaque module identifier that expo-image accepts
 * as a source; the number means nothing outside the bundle, which is why the registry that holds them sits behind its
 * own export path and never reaches the tools that run this package on Node.
 */
declare module '*.webp' {
  const asset: number;
  export default asset;
}
