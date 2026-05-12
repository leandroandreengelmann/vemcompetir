// Rateia R$ 2.400 / 34 inscrições do pacote 0fda67d8-... em event_registrations.price
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const envText = readFileSync('.env.local', 'utf-8');
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EVENT_ID = 'db5d7cbb-a571-4b4f-9d79-ecb111406760';
const PACKAGE_ID = '0fda67d8-8c91-44e3-aff0-5ef3bb5b21e8';
const TOTAL = 2400.00;

const { data: regs, error } = await admin
  .from('event_registrations')
  .select('id')
  .eq('event_id', EVENT_ID)
  .eq('package_id', PACKAGE_ID)
  .order('id', { ascending: true });

if (error) throw error;

const n = regs.length;
const totalCents = Math.round(TOTAL * 100);
const base = Math.floor(totalCents / n);
const extra = totalCents - base * n;

console.log(`${n} inscrições; ${extra} recebem ${(base + 1) / 100} e ${n - extra} recebem ${base / 100}. Total = ${TOTAL.toFixed(2)}`);

let okCount = 0;
for (let i = 0; i < n; i++) {
  const price = (i < extra ? base + 1 : base) / 100;
  const { error: upErr } = await admin
    .from('event_registrations')
    .update({ price })
    .eq('id', regs[i].id);
  if (upErr) {
    console.error(`#${i + 1} ${regs[i].id}: ${upErr.message}`);
  } else {
    okCount++;
  }
}

const { data: check } = await admin
  .from('event_registrations')
  .select('price')
  .eq('event_id', EVENT_ID)
  .eq('package_id', PACKAGE_ID);

const sum = check.reduce((s, r) => s + Number(r.price || 0), 0);
console.log(`OK: ${okCount}/${n}. Soma final = R$ ${sum.toFixed(2)}`);
