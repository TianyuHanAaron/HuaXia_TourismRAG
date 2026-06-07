import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function resolveNativeJavaEnv() {
  const env = { ...process.env };
  const javaHome = supportedJavaHome(env.JAVA_HOME) || findMacJavaHome('21') || findMacJavaHome('17') || findKnownJavaHome();
  if (javaHome) {
    env.JAVA_HOME = javaHome;
    env.PATH = `${path.join(javaHome, 'bin')}:${env.PATH ?? ''}`;
  }
  const androidHome = env.ANDROID_HOME || path.join(env.HOME ?? '', 'Library/Android/sdk');
  if (androidHome && fs.existsSync(androidHome)) {
    env.ANDROID_HOME = androidHome;
    env.ANDROID_SDK_ROOT = androidHome;
    env.PATH = [
      path.join(androidHome, 'platform-tools'),
      path.join(androidHome, 'emulator'),
      path.join(androidHome, 'cmdline-tools/latest/bin'),
      env.PATH ?? '',
    ].join(':');
  }
  return env;
}

function supportedJavaHome(javaHome) {
  if (!javaHome || !fs.existsSync(javaHome) || !isJava17Or21(javaHome)) {
    return null;
  }
  return javaHome;
}

function isJava17Or21(javaHome) {
  const releasePath = path.join(javaHome, 'release');
  if (fs.existsSync(releasePath)) {
    const releaseSource = fs.readFileSync(releasePath, 'utf8');
    const majorVersion = releaseSource.match(/JAVA_VERSION="(?:1\.)?(\d+)/)?.[1];
    return majorVersion === '17' || majorVersion === '21';
  }
  return /(?:^|[-/])(17|21)(?:[._/-]|$)/.test(javaHome);
}

function findMacJavaHome(version) {
  try {
    return execFileSync('/usr/libexec/java_home', ['-v', version], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function findKnownJavaHome() {
  const candidates = [
    '/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home',
    '/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home',
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}
