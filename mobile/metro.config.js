const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Monorepo setup: Metro's default resolver doesn't reliably follow workspace
// symlinks (e.g. node_modules/@vitals/shared -> ../../packages/shared) out
// of the box — it needs to watch the whole workspace, not just this app's
// own folder, and check the workspace root's node_modules too.
//
// Deliberately NOT setting resolver.disableHierarchicalLookup: true here —
// that flag stops Metro's normal upward node_modules walk entirely, which
// also breaks resolving a package's own *nested* dependencies (e.g.
// react-native-reanimated ships its own nested copy of `semver`). It's not
// needed anyway: watchFolders + nodeModulesPaths alone is enough for the
// workspace symlink to resolve, confirmed via `expo export`.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./src/styles/tailwind.css" });
