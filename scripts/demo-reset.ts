// Returns the demo site to its showcase state after jurors, testers or an end-to-end run have
// written to it. Team lead only, on the demo database only.
//
//   npm run demo:reset -- --since <ISO time of the last clean state>
//   npm run demo:reset -- --since 2026-11-27T07:30:00Z
//
// Runs, in this order, stopping at the first failure:
//   1. npm run verify:clean -- --since <time> --requests --apply
//        tester pharmacies created since <time>, reports by the demo pharmacies and testers, the
//        demo centrale's arrivals, the demo Ordre's messages, the one-click pharmacies' answers,
//        tester-origin patient requests (see scripts/clean-verification.ts);
//   2. npm run demo:clear       the national picture and the demo shortage, by their fixed ids;
//   3. npm run demo:shortage    the confirmed antiepileptic again;
//   4. npm run demo:national    the four other situations (needs the shortage seed).
// Each step is the existing script with its own refusal checks, unchanged: this file adds none
// and weakens none. verify:clean removes every tester pharmacy created since <time>, so never run
// this on a site where real testers have joined.

import { spawnSync } from 'node:child_process';
import { demoResetSteps, validSince } from './lib/demo-reset';
import { ROOT } from './lib/script-env';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main() {
  const since = arg('since');
  if (!validSince(since)) {
    console.error('Usage: npm run demo:reset -- --since <ISO date and time, e.g. 2026-11-27T07:30:00Z>');
    process.exit(1);
  }
  for (const step of demoResetSteps(since)) {
    const args = ['run', step.script, ...(step.args.length > 0 ? ['--', ...step.args] : [])];
    console.log(`\n> npm ${args.join(' ')}`);
    // npm is npm.cmd on Windows: run it through the shell there. The arguments are fixed words and
    // a validated ISO date, nothing a shell would interpret.
    const result = spawnSync('npm', args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    if (result.status !== 0) {
      console.error(`\nStopped: npm run ${step.script} failed (exit ${result.status ?? 'none'}). Nothing after it ran.`);
      process.exit(result.status ?? 1);
    }
  }
  console.log('\nDemo reset: clean, cleared, shortage and national picture rebuilt.');
}

main();
