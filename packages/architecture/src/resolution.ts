/**
 * How the imports of the app resolve, as Metro and TypeScript resolve them: `react-native` first, which Expo's
 * `customConditions` also sets, then the usual conditions. Every tool that follows imports takes these.
 */
export const RESOLUTION = {
  conditionNames: ['react-native', 'types', 'import', 'require', 'default'],
  extensions: ['.ts', '.tsx', '.d.ts', '.js', '.json'],
} as const;
