// Checks that no secret reaches the browser. Reads the JavaScript a browser receives, either
// from a local build (.next/static) or from the deployed site (the scripts of the main pages),
// and looks for:
//   - the value of every server-only variable in the environment or .env.local (names not
//     starting with NEXT_PUBLIC_, values of 12 characters or more);
//   - a Supabase secret key (sb_secret_…) or a JWT whose role is service_role.
// Prints variable names and file names only, never a value. Exit code 1 if anything is found.
//
//   npm run check:bundle                      local build (run npm run build first)
//   npm run check:bundle -- --url https://…   the deployed site

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadLocalEnv } from './lib/script-env';

const PAGES = ['/', '/methode', '/scenario', '/retour', '/vues', '/status', '/pharmacie', '/coordination', '/grossiste', '/hopital', '/medicaments', '/pharmacies', '/bibliotheque'];

function secretValues(): { name: string; value: string }[] {
  loadLocalEnv();
  return Object.entries(process.env)
    .filter(([name, value]) => /^[A-Z][A-Z0-9_]+$/.test(name) && !name.startsWith('NEXT_PUBLIC_') && typeof value === 'string' && value.length >= 12)
    .filter(([name]) => /KEY|SECRET|TOKEN|PASSWORD|SALT|CODE|DB_URL/.test(name))
    .map(([name, value]) => ({ name, value: value as string }));
}

function serviceRoleJwt(text: string): boolean {
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
    try {
      if (JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')).role === 'service_role') return true;
    } catch {
      // not a JWT
    }
  }
  return false;
}

function localFiles(dir: string): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      const p = join(d, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|mjs|css|json|html)$/.test(entry)) out.push({ name: p, text: readFileSync(p, 'utf8') });
    }
  };
  walk(dir);
  return out;
}

async function deployedFiles(base: string): Promise<{ name: string; text: string }[]> {
  const scripts = new Set<string>();
  const out: { name: string; text: string }[] = [];
  for (const page of PAGES) {
    const res = await fetch(base + page, { redirect: 'follow' });
    const html = await res.text();
    out.push({ name: page, text: html });
    for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.js)"/g)) scripts.add(m[1]);
  }
  for (const s of scripts) out.push({ name: s, text: await (await fetch(base + s)).text() });
  return out;
}

async function main() {
  const urlArg = process.argv.indexOf('--url');
  const base = urlArg > 0 ? process.argv[urlArg + 1]?.replace(/\/$/, '') : null;
  const files = base ? await deployedFiles(base) : localFiles(join(process.cwd(), '.next', 'static'));
  const secrets = secretValues();
  const found: string[] = [];
  for (const f of files) {
    for (const s of secrets) if (f.text.includes(s.value)) found.push(`${s.name} in ${f.name}`);
    if (/sb_secret_[A-Za-z0-9_-]{10,}/.test(f.text)) found.push(`a Supabase secret key in ${f.name}`);
    if (serviceRoleJwt(f.text)) found.push(`a service_role JWT in ${f.name}`);
  }
  console.log(`${files.length} files read (${base ?? '.next/static'}), ${secrets.length} server-only values looked for, plus key patterns.`);
  if (found.length) {
    console.error('Found in what the browser receives:');
    for (const f of found) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log('No secret found.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
