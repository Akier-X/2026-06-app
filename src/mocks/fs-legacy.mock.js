// Web mock for expo-file-system/legacy (LLM features are native-only)
module.exports = {
  documentDirectory: null,
  cacheDirectory: null,
  downloadAsync: () => Promise.resolve({ status: 200, uri: '' }),
  getInfoAsync: () => Promise.resolve({ exists: false, isDirectory: false }),
  deleteAsync: () => Promise.resolve(),
  makeDirectoryAsync: () => Promise.resolve(),
  readAsStringAsync: () => Promise.resolve(''),
  writeAsStringAsync: () => Promise.resolve(),
  createDownloadResumable: () => ({
    downloadAsync: () => Promise.resolve({ status: 200, uri: '' }),
    pauseAsync: () => Promise.resolve(),
    resumeAsync: () => Promise.resolve({ status: 200, uri: '' }),
  }),
};
