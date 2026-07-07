// Web mock for react-native-purchases (RevenueCat)
const noopAsync = () => Promise.resolve(null);
module.exports = {
  default: {
    configure: noopAsync,
    getCustomerInfo: noopAsync,
    purchasePackage: noopAsync,
    restorePurchases: noopAsync,
    setLogLevel: () => {},
  },
  LOG_LEVEL: { VERBOSE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4 },
};
