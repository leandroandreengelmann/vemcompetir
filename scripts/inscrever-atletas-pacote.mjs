// Inscrição em lote dos 34 atletas de PROJETO MAIS CULTURA PORTO DOS GAÚCCHOS-MT
// no evento "22ª COPA NORTE NORTÃO" usando o pacote de 34 créditos.
// Uso: node scripts/inscrever-atletas-pacote.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const envText = readFileSync('.env.local', 'utf-8');
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Variáveis SUPABASE ausentes em .env.local');

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PACKAGE_ID = '0fda67d8-8c91-44e3-aff0-5ef3bb5b21e8';
const EVENT_ID = 'db5d7cbb-a571-4b4f-9d79-ecb111406760';
const TENANT_ID = 'e9641aed-f4ef-4668-8304-2028a5c2278d';
const REGISTERED_BY = 'de4a648a-9517-4bbd-9c8f-24c38e562d2b';

// IDs dos 34 atletas + dados para casar com category_rows
// sexo (M/F) → para mapear; idade derivada de birth_date 01/01/(2026-idade); peso em kg
const ATLETAS = [
  { id: '783ba3e2-eead-425f-9567-4c19a45fca3b', nome: 'Vinicius Facholi Bonfim Scariot', sexo: 'M', idade: 7,  peso: 35   },
  { id: '4a5c91d6-fdd8-4053-9981-d3e1d907cbbf', nome: 'Benicio Schmeng Couto',           sexo: 'M', idade: 8,  peso: 29   },
  { id: '34070e19-d511-4fd0-a8ef-2d8362364d0c', nome: 'Isabella da Conceição Ribeiro',   sexo: 'F', idade: 8,  peso: 51   },
  { id: 'f161069e-3d10-4d42-b63c-249e9db03fe5', nome: 'Lorenzo R. De Carvalho Lopes',    sexo: 'M', idade: 8,  peso: 35   },
  { id: 'd6daf670-0fac-47b9-aa04-34da62ba8871', nome: 'Rebeca Vitoria Cardenetti Muniz', sexo: 'F', idade: 8,  peso: 49   },
  { id: 'f189af49-482a-48c9-b11f-54fcfa5881a7', nome: 'Valentina Montagna Figueiredo',   sexo: 'F', idade: 8,  peso: 33   },
  { id: '47f3aae9-6c2b-45f8-8386-8155d6345cd8', nome: 'Vinicius Teodoro Possumato',      sexo: 'M', idade: 8,  peso: 42.15},
  { id: '05c6f405-7b04-45ab-aa5a-091cd6aeca6c', nome: 'Heloisa Francolino De Oliveira',  sexo: 'F', idade: 9,  peso: 37   },
  { id: 'f487fc51-7552-4e60-beb8-045ff2d70d37', nome: 'Julia Maria Dias Lagares',        sexo: 'F', idade: 9,  peso: 35   },
  { id: '232549b9-9521-45b7-93dc-e35004881a8c', nome: 'Murilo Benhur Mano Bogo',         sexo: 'M', idade: 9,  peso: 29   },
  { id: '60fdb4a1-1df5-4163-91ea-233f84bf52b8', nome: 'Yuri Leonardo Igachira Livramento',sexo:'M', idade: 9,  peso: 33   },
  { id: '523c2069-f3f9-43c7-a937-b0059b840a80', nome: 'Gabriel Gomes Rezer',             sexo: 'M', idade: 10, peso: 31   },
  { id: '1ce9ca5a-c87d-4332-adb6-64bb503aa05b', nome: 'Maria Isabella Gianchini De Oliveira', sexo:'F', idade:10, peso: 29 },
  { id: '1b61b251-5720-4bab-bc15-912c2d52045e', nome: 'Nataxa Freitas Nascimento',       sexo: 'F', idade: 10, peso: 42   },
  { id: 'ca1f52db-eab9-4318-8662-89eebc8b4505', nome: 'Rafaela Facholi Bonfim Scariot',  sexo: 'F', idade: 10, peso: 52   },
  { id: '38bedf84-ebaa-4fd5-952c-eb9815f8c95d', nome: 'Pietro da Silva Dutra',           sexo: 'M', idade: 10, peso: 33.4 },
  { id: '0c230faf-aa9e-46f9-a467-ed53a2965c48', nome: 'David Artur Cardenetti Muniz',    sexo: 'M', idade: 11, peso: 64   },
  { id: '4418b000-9bd5-4642-8f43-09acfb4a688c', nome: 'Jeiel Rodriges Dis Santos',       sexo: 'M', idade: 11, peso: 37.2 },
  { id: '829f7df6-6421-4003-9c25-a78d1332b6a7', nome: 'Lucas Santos Ribeiro',            sexo: 'M', idade: 11, peso: 47.15},
  { id: 'f4419a22-9fa4-404d-a337-dc4c010ad9d9', nome: 'Eloah Heinen Feitosa',            sexo: 'F', idade: 12, peso: 59   },
  { id: '769af1e5-f6e2-4731-baf8-a4efb07ee014', nome: 'Higor Chaves Aguiar',             sexo: 'M', idade: 12, peso: 59   },
  { id: 'f1d93cdb-f460-4fd0-9ad5-ba15f2f4258c', nome: 'Sofia Elisa Montagna De Oliveira',sexo: 'F', idade: 12, peso: 39   },
  { id: '74e25080-b56b-40c6-b6d2-e48abeadaff9', nome: 'Gabriel Vitalli Paredes Feitosa', sexo: 'M', idade: 13, peso: 35.4 },
  { id: '1fcd5d95-2419-4714-bebb-43033431f55f', nome: 'Kaleu Aparecido Hoscher Da Silva',sexo: 'M', idade: 13, peso: 52.2 },
  { id: 'd385e45b-c680-43d7-a398-64bf3d75b535', nome: 'Luiz Henrique Deoclides Dos Santos', sexo:'M', idade:13, peso: 45  },
  { id: '2a75a3a3-7743-47b9-8e45-6857e52db0b3', nome: 'Otávio Santos De Oliveira',       sexo: 'M', idade: 13, peso: 51   },
  { id: 'ccf3984b-7fee-4cdb-948b-b06b6c9f4615', nome: 'Thiago De Assis Guandalin',       sexo: 'M', idade: 13, peso: 43   },
  { id: '0e55868c-4107-4469-949b-d736e6fa76f9', nome: 'Isadora Carla Paulino',           sexo: 'F', idade: 14, peso: 49   },
  { id: '6efc52c4-f74a-489b-babc-9d3c486c9154', nome: 'João Pedro Dias Lagares',         sexo: 'M', idade: 14, peso: 47   },
  { id: '95c5e58a-bb6b-4065-81af-3881b30be8d1', nome: 'Ludmila Gomes Frenzel',           sexo: 'F', idade: 14, peso: 92   },
  { id: '7901bb5a-4c74-495e-9d16-99d3a6bc3fbe', nome: 'Miguel Gomes Rezer',              sexo: 'M', idade: 14, peso: 55   },
  { id: '675c6410-f52f-485f-84a6-8886124240e8', nome: 'Adrian Victor Da Silva Natividade',sexo:'M', idade: 15, peso: 63   },
  { id: '57054a2f-c189-4200-9c03-9b1a0d1c795f', nome: 'Luiz Davi Dillemburg dos Santos', sexo: 'M', idade: 15, peso: 75.5 },
  { id: '1163d04e-6aaa-4856-828d-44321c513b1d', nome: 'Witalo Jose Joaquim Da Silva',    sexo: 'M', idade: 17, peso: 64   },
];

const SEXO_MAP = { M: 'Masculino', F: 'Feminino' };

async function fetchCategoryRows() {
  // Buscar todas as category_rows do evento (kimono + branca) para fazer match em memória.
  const { data: tables, error: tErr } = await admin
    .from('event_category_tables')
    .select('category_table_id')
    .eq('event_id', EVENT_ID);
  if (tErr) throw tErr;
  const tableIds = tables.map(t => t.category_table_id);
  if (tableIds.length === 0) throw new Error('Nenhum category_table vinculado ao evento');

  const all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await admin
      .from('category_rows')
      .select('id, table_id, sexo, idade, faixa, categoria_peso, peso_min_kg, peso_max_kg, uniforme, categoria_completa')
      .in('table_id', tableIds)
      .ilike('faixa', 'branca')
      .ilike('uniforme', 'kimono')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function parseIdadeRange(idadeStr) {
  // formatos possíveis: "7 anos", "4 a 5 anos", "7-15 anos", "16-17 anos", "30+", "Adulto", etc.
  if (!idadeStr) return null;
  const s = idadeStr.toLowerCase();
  const range = s.match(/(\d+)\s*[-aàe]\s*(\d+)/);
  if (range) return { min: +range[1], max: +range[2] };
  const single = s.match(/(\d+)\s*\+/);
  if (single) return { min: +single[1], max: 99 };
  const eq = s.match(/(\d+)/);
  if (eq) return { min: +eq[1], max: +eq[1] };
  return null;
}

function matchRow(atleta, rows) {
  const sexoFull = SEXO_MAP[atleta.sexo];
  const candidates = rows.filter(r => {
    if ((r.sexo || '').toLowerCase() !== sexoFull.toLowerCase()) return false;
    const range = parseIdadeRange(r.idade);
    if (!range) return false;
    if (atleta.idade < range.min || atleta.idade > range.max) return false;
    const min = r.peso_min_kg == null ? 0 : Number(r.peso_min_kg);
    const max = r.peso_max_kg == null ? 9999 : Number(r.peso_max_kg);
    return atleta.peso >= min && atleta.peso <= max;
  });
  // Em caso de múltiplos, prefere o de range de idade mais estreito (mais específico)
  candidates.sort((a, b) => {
    const ra = parseIdadeRange(a.idade);
    const rb = parseIdadeRange(b.idade);
    return (ra.max - ra.min) - (rb.max - rb.min);
  });
  return candidates[0] || null;
}

async function main() {
  console.log('Buscando categorias do evento...');
  const rows = await fetchCategoryRows();
  console.log(`  ${rows.length} category_rows (Kimono/Branca) encontradas.`);

  // Valida pacote antes
  const { data: pkg, error: pkgErr } = await admin
    .from('inscription_packages')
    .select('*')
    .eq('id', PACKAGE_ID)
    .single();
  if (pkgErr) throw pkgErr;
  if (pkg.event_id !== EVENT_ID) throw new Error('Pacote não corresponde ao evento');
  if (pkg.assigned_to_tenant_id !== TENANT_ID) throw new Error('Pacote não está atribuído ao tenant');
  const remaining = pkg.total_credits - pkg.used_credits;
  console.log(`Pacote OK: ${remaining}/${pkg.total_credits} créditos restantes.`);
  if (remaining < ATLETAS.length) throw new Error(`Pacote tem só ${remaining} créditos, precisa de ${ATLETAS.length}`);

  // Faz o match
  const matched = [];
  const unmatched = [];
  for (const a of ATLETAS) {
    const m = matchRow(a, rows);
    if (m) matched.push({ atleta: a, row: m });
    else unmatched.push(a);
  }

  console.log(`\nMatch: ${matched.length}/${ATLETAS.length}`);
  if (unmatched.length > 0) {
    console.log('Atletas sem categoria:');
    unmatched.forEach(a => console.log(`  - ${a.nome} | ${a.sexo} ${a.idade}a ${a.peso}kg`));
    throw new Error('Aborta. Resolva os matches primeiro.');
  }

  // Insere cada inscrição. Em caso de erro num, desfaz os já feitos.
  const inserted = [];
  for (let i = 0; i < matched.length; i++) {
    const { atleta, row } = matched[i];

    // Checa se já existe inscrição
    const { data: existing, error: exErr } = await admin
      .from('event_registrations')
      .select('id')
      .eq('event_id', EVENT_ID)
      .eq('athlete_id', atleta.id)
      .not('status', 'in', '("cancelada","carrinho")')
      .maybeSingle();
    if (exErr) throw exErr;
    if (existing) {
      console.log(`#${(i+1).toString().padStart(2)} JÁ EXISTE ${atleta.nome} → ${existing.id} (pulando)`);
      continue;
    }

    const { data: reg, error: regErr } = await admin
      .from('event_registrations')
      .insert({
        event_id: EVENT_ID,
        athlete_id: atleta.id,
        category_id: row.id,
        registered_by: REGISTERED_BY,
        tenant_id: TENANT_ID,
        status: 'isento',
        package_id: PACKAGE_ID,
      })
      .select('id')
      .single();

    if (regErr) {
      console.error(`#${(i+1).toString().padStart(2)} ERRO ${atleta.nome}: ${regErr.message}`);
      // rollback
      if (inserted.length > 0) {
        console.log(`Rollback: deletando ${inserted.length} inscrições já feitas...`);
        await admin.from('event_registrations').delete().in('id', inserted);
      }
      throw regErr;
    }

    inserted.push(reg.id);
    console.log(`#${(i+1).toString().padStart(2)} OK ${atleta.nome} → ${row.categoria_completa || row.id}`);
  }

  // Atualiza used_credits
  const novosCreditos = pkg.used_credits + inserted.length;
  const { error: upErr } = await admin
    .from('inscription_packages')
    .update({ used_credits: novosCreditos })
    .eq('id', PACKAGE_ID);
  if (upErr) throw upErr;

  console.log(`\nFinal: ${inserted.length} inscrições criadas. Pacote agora: ${novosCreditos}/${pkg.total_credits} usados.`);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
