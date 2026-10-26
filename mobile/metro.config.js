const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const sharedPackage = path.resolve(projectRoot, "../packages/shared");

const config = getDefaultConfig(projectRoot);

// The mobile app has its own install (its own node_modules and lockfile),
// separate from the website, because the two need different React versions.
// The only code shared with the website is packages/shared, linked into
// node_modules/@vitals/shared. Metro must watch that folder, since it lives
// outside this app. Looking only in this app's own node_modules keeps the
// website's React from ever being picked up by accident.
config.watchFolders = [sharedPackage];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

module.exports = withNativeWind(config, { input: "./src/styles/tailwind.css" });
