#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

import { resolveNativeJavaEnv } from './native-java-env.mjs';

const args = ['expo', 'run:android', ...process.argv.slice(2)];
const result = spawnSync('npx', args, {
  cwd: process.cwd(),
  env: resolveNativeJavaEnv(),
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
