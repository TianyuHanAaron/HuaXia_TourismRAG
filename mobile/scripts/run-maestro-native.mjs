#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

import { resolveNativeJavaEnv } from './native-java-env.mjs';

const platform = process.argv[2];
if (platform !== 'ios' && platform !== 'android') {
  console.error('Usage: node scripts/run-maestro-native.mjs <ios|android> [flow-or-folder ...]');
  process.exit(1);
}
const flowTargets = process.argv.slice(3);

const env = {
  ...resolveNativeJavaEnv(),
  MAESTRO_DRIVER_STARTUP_TIMEOUT: process.env.MAESTRO_DRIVER_STARTUP_TIMEOUT ?? '120000',
};

const shouldSkipDriverReinstall =
  process.env.MAESTRO_REINSTALL_DRIVER !== '1' &&
  (platform === 'ios' || process.env.MAESTRO_NO_REINSTALL_DRIVER === '1');

const maestroArgs = [
  'test',
  '--platform',
  platform,
  ...(shouldSkipDriverReinstall ? ['--no-reinstall-driver'] : []),
  '--test-output-dir',
  `artifacts/${platform}`,
  ...(flowTargets.length ? flowTargets : [`.maestro/flows/${platform}`]),
];

if (shouldSkipDriverReinstall) {
  console.log(
    `Running Maestro ${platform} flows without driver reinstall. Set MAESTRO_REINSTALL_DRIVER=1 to force reinstall.`,
  );
}

const result = spawnSync(
  'maestro',
  maestroArgs,
  {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
