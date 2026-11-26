// The steps of `npm run demo:reset` (scripts/demo-reset.ts), as data so they are tested without
// running anything (tests/demo-reset.test.ts).

/** An ISO date and time, as `verify:clean -- --since` takes it ("2026-11-27T07:30:00Z"). */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export function validSince(value: string | undefined): value is string {
  return value !== undefined && ISO.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * In this order: clean the verification and juror rows since the last clean state (requests
 * included), clear the demo picture, then rebuild the shortage and the national picture
 * (demo:national needs the shortage seed). Each step is the existing npm script, unchanged.
 */
export function demoResetSteps(since: string): { script: string; args: string[] }[] {
  if (!validSince(since)) throw new Error(`Not an ISO date and time: ${since}`);
  return [
    { script: 'verify:clean', args: ['--since', since, '--requests', '--apply'] },
    { script: 'demo:clear', args: [] },
    { script: 'demo:shortage', args: [] },
    { script: 'demo:national', args: [] },
  ];
}
