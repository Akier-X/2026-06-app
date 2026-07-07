// Web mock for expo-store-review
module.exports = {
  isAvailableAsync: () => Promise.resolve(false),
  requestReview: () => Promise.resolve(),
  storeUrl: () => Promise.resolve(null),
  hasAction: () => Promise.resolve(false),
};
