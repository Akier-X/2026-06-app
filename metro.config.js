const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Web ビルド時にネイティブ専用モジュールをモックに差し替える
const WEB_MOCKS = {
  'react-native-google-mobile-ads': path.join(__dirname, 'src', 'mocks', 'ads.mock.js'),
  'react-native-purchases': path.join(__dirname, 'src', 'mocks', 'purchases.mock.js'),
  'react-native-view-shot': path.join(__dirname, 'src', 'mocks', 'viewshot.mock.js'),
  'llama.rn': path.join(__dirname, 'src', 'mocks', 'llama.mock.js'),
  'expo-file-system/legacy': path.join(__dirname, 'src', 'mocks', 'fs-legacy.mock.js'),
  'expo-store-review': path.join(__dirname, 'src', 'mocks', 'store-review.mock.js'),
};

const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_MOCKS[moduleName]) {
    return { type: 'sourceFile', filePath: WEB_MOCKS[moduleName] };
  }
  // zustand v5 はWebで "import" 条件のESM(.mjs)に解決され、その中の
  // import.meta が構文エラーとなりバンドル全体が真っ白になる。CJSへ振り替える。
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    const sub = moduleName === 'zustand' ? 'index' : moduleName.slice('zustand/'.length);
    const cjs = path.join(__dirname, 'node_modules', 'zustand', `${sub}.js`);
    if (fs.existsSync(cjs)) {
      return { type: 'sourceFile', filePath: cjs };
    }
  }
  if (originalResolver) return originalResolver(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
