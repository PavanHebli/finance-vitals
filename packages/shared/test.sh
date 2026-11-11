#!/usr/bin/env bash
# Runs the tests for the shared money math.
# Compiles src/ to plain JavaScript in .test-build/ (using the TypeScript that
# web already installs), then runs every tests/*.test.cjs with Node's built-in
# test runner. No extra packages needed.
#
#   bash packages/shared/test.sh
set -e
cd "$(dirname "$0")"
rm -rf .test-build
node ../../web/node_modules/typescript/bin/tsc src/*.ts \
  --outDir .test-build --module commonjs --target es2020 --lib es2020,dom \
  --strict --skipLibCheck
node --test tests/
