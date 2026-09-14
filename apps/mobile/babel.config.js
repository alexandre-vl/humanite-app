/** @param {import('@babel/core').ConfigAPI} api */
export default function babelConfig(api) {
  api.cache.forever();
  return {
    presets: [['babel-preset-expo', { 'react-compiler': { panicThreshold: 'all_errors' } }]],
  };
}
