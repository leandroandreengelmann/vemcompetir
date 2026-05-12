// One-off bulk import: 34 atletas da PROJETO MAIS CULTURA PORTO DOS GAÚCCHOS-MT
// Vincula ao tenant e ao mestre Luiz Pedro Simonetti Toledo.
// Uso: node scripts/import-atletas-mais-cultura.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Carrega .env.local manualmente (sem depender de dotenv)
const envText = readFileSync('.env.local', 'utf-8');
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Variáveis SUPABASE ausentes em .env.local');
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TENANT_ID = 'e9641aed-f4ef-4668-8304-2028a5c2278d';
const GYM_NAME = 'PROJETO MAIS CULTURA PORTO DOS GAÚCCHOS-MT';
const MASTER_ID = '2d4f4b1c-c0cc-429e-a04f-b8ba0a1c1e1e';
const MASTER_NAME = 'Luiz Pedro Simonetti Toledo';

// [nome, cpf (11 dig), idade, peso, sexo]
const ATLETAS = [
  ['Vinicius Facholi Bonfim Scariot', '09503993105', 7, 35, 'M'],
  ['Benicio Schmeng Couto', '08731212107', 8, 29, 'M'],
  ['Isabella da Conceição Ribeiro', '09997368177', 8, 51, 'F'],
  ['Lorenzo R. De Carvalho Lopes', '20035162716', 8, 35, 'M'],
  ['Rebeca Vitoria Cardenetti Muniz', '08966587160', 8, 49, 'F'],
  ['Valentina Montagna Figueiredo', '10711055157', 8, 33, 'F'],
  ['Vinicius Teodoro Possumato', '08877098180', 8, 42.15, 'M'],
  ['Heloisa Francolino De Oliveira', '52281601831', 9, 37, 'F'],
  ['Julia Maria Dias Lagares', '08034628166', 9, 35, 'F'],
  ['Murilo Benhur Mano Bogo', '09942291199', 9, 29, 'M'],
  ['Yuri Leonardo Igachira Livramento', '10655961119', 9, 33, 'M'],
  ['Gabriel Gomes Rezer', '09380783132', 10, 31, 'M'],
  ['Maria Isabella Gianchini De Oliveira', '12687879142', 10, 29, 'F'],
  ['Nataxa Freitas Nascimento', '10845882180', 10, 42, 'F'],
  ['Rafaela Facholi Bonfim Scariot', '09956825182', 10, 52, 'F'],
  ['Pietro da Silva Dutra', '10772056196', 10, 33.4, 'M'],
  ['David Artur Cardenetti Muniz', '11275659152', 11, 64, 'M'],
  ['Jeiel Rodriges Dis Santos', '07916673169', 11, 37.2, 'M'],
  ['Lucas Santos Ribeiro', '06993945118', 11, 47.15, 'M'],
  ['Eloah Heinen Feitosa', '09174622110', 12, 59, 'F'],
  ['Higor Chaves Aguiar', '08007915176', 12, 59, 'M'],
  ['Sofia Elisa Montagna De Oliveira', '06858140174', 12, 39, 'F'],
  ['Gabriel Vitalli Paredes Feitosa', '10232072140', 13, 35.4, 'M'],
  ['Kaleu Aparecido Hoscher Da Silva', '10953902102', 13, 52.2, 'M'],
  ['Luiz Henrique Deoclides Dos Santos', '10193544194', 13, 45, 'M'],
  ['Otávio Santos De Oliveira', '04950846205', 13, 51, 'M'],
  ['Thiago De Assis Guandalin', '08660269160', 13, 43, 'M'],
  ['Isadora Carla Paulino', '06671947112', 14, 49, 'F'],
  ['João Pedro Dias Lagares', '10005605113', 14, 47, 'M'],
  ['Ludmila Gomes Frenzel', '09383769181', 14, 92, 'F'],
  ['Miguel Gomes Rezer', '09380806108', 14, 55, 'M'],
  ['Adrian Victor Da Silva Natividade', '70575256133', 15, 63, 'M'],
  ['Luiz Davi Dillemburg dos Santos', '06943153110', 15, 75.5, 'M'],
  ['Witalo Jose Joaquim Da Silva', '09728523106', 17, 64, 'M'],
];

const CURRENT_YEAR = new Date().getFullYear();

function randomEmail() {
  const r = Math.random().toString(36).substring(2, 10);
  return `${r}-${Date.now()}@dummy.competir.com`;
}
function randomPassword() {
  return Math.random().toString(36).slice(-10) + 'A1!@';
}

async function loadAcademyTemplate() {
  const { data, error } = await admin
    .from('guardian_term_templates')
    .select('content')
    .eq('is_active', true)
    .eq('type', 'academy')
    .single();
  if (error) throw error;
  return data.content;
}

function renderDeclaration(template, athleteName) {
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  return template
    .replace(/\{\{atleta_nome\}\}/g, athleteName)
    .replace(/\{\{responsavel_nome\}\}/g, GYM_NAME)
    .replace(/\{\{responsavel_cpf\}\}/g, '—')
    .replace(/\{\{responsavel_vinculo\}\}/g, 'Academia/Equipe')
    .replace(/\{\{responsavel_telefone\}\}/g, '—')
    .replace(/\{\{academia_nome\}\}/g, GYM_NAME)
    .replace(/\{\{data\}\}/g, today);
}

async function importOne(template, [nome, cpf, idade, peso, sexo], i) {
  const birth_date = `${CURRENT_YEAR - idade}-01-01`;
  const email = randomEmail();
  const password = randomPassword();

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    user_metadata: {
      role: 'atleta',
      full_name: nome,
      tenant_id: TENANT_ID,
      birth_date,
      belt_color: 'BRANCA',
      weight: peso,
      phone: '',
      is_responsible: false,
      is_master: false,
      master_id: MASTER_ID,
      master_name: MASTER_NAME,
      cpf,
      sexo,
    },
    email_confirm: true,
  });
  if (authErr) throw new Error(`auth.createUser falhou: ${authErr.message}`);

  const userId = created.user.id;

  const { error: profErr } = await admin.from('profiles').upsert({
    id: userId,
    role: 'atleta',
    full_name: nome,
    tenant_id: TENANT_ID,
    gym_name: GYM_NAME,
    birth_date,
    belt_color: 'BRANCA',
    weight: peso,
    phone: null,
    is_responsible: false,
    is_master: false,
    master_id: MASTER_ID,
    master_name: MASTER_NAME,
    cpf,
    sexo,
    has_guardian: false,
    guardian_name: null,
    guardian_phone: null,
    guardian_cpf: null,
    guardian_relationship: null,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`profiles.upsert falhou: ${profErr.message}`);
  }

  const content = renderDeclaration(template, nome);
  const { error: decErr } = await admin
    .from('athlete_guardian_declarations')
    .upsert({
      athlete_id: userId,
      responsible_type: 'academy',
      responsible_name: GYM_NAME,
      responsible_cpf: null,
      responsible_relationship: 'academia',
      responsible_phone: null,
      content,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'athlete_id' });
  if (decErr) console.warn(`[#${i + 1}] declaração falhou: ${decErr.message}`);

  return userId;
}

async function main() {
  console.log(`Carregando template 'academy'...`);
  const template = await loadAcademyTemplate();

  const results = [];
  for (let i = 0; i < ATLETAS.length; i++) {
    const row = ATLETAS[i];
    try {
      const id = await importOne(template, row, i);
      results.push({ i: i + 1, nome: row[0], status: 'OK', id });
      console.log(`#${(i + 1).toString().padStart(2)} OK   ${row[0]} -> ${id}`);
    } catch (e) {
      results.push({ i: i + 1, nome: row[0], status: 'ERRO', error: e.message });
      console.error(`#${(i + 1).toString().padStart(2)} ERRO ${row[0]}: ${e.message}`);
    }
  }

  const ok = results.filter(r => r.status === 'OK').length;
  const erro = results.filter(r => r.status === 'ERRO').length;
  console.log(`\nFinal: ${ok} OK, ${erro} ERRO de ${ATLETAS.length} total.`);
  if (erro > 0) process.exit(1);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
