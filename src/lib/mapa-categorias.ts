/**
 * Monta a estrutura somente leitura de categorias de um evento para o organizador:
 * grupo > sexo > divisão de idade > faixa > categorias (peso + modalidade).
 * Categorias desativadas no evento são descartadas.
 */

export interface CategoriaRowInput {
    table_name: string;
    sexo: string | null;
    divisao_idade: string | null;
    faixa: string | null;
    categoria_completa: string;
    peso_min_kg: number | string | null;
    peso_max_kg: number | string | null;
    disabled: boolean;
}

export interface CategoriaDetalhe {
    peso: string;
    modalidade: string;
    minKg: number;
    maxKg: number | null;
    textoPeso: string;
}

export interface MapaFaixa {
    faixa: string;
    categorias: CategoriaDetalhe[];
}

export interface MapaDivisao {
    divisao: string;
    faixas: MapaFaixa[];
}

export interface MapaSexo {
    sexo: string;
    divisoes: MapaDivisao[];
}

export interface MapaGrupo {
    nome: string;
    sexos: MapaSexo[];
}

const ORDEM_SEXO = ['Masculino', 'Feminino'];

const CORES_FAIXA: Record<string, string> = {
    branca: '#FDFDFD',
    cinza: '#61656C',
    amarela: '#FDB022',
    laranja: '#E62E05',
    verde: '#067647',
    azul: '#00359E',
    roxa: '#491C96',
    marrom: '#542C0D',
    preta: '#0A0D12',
};

/**
 * Cores de uma faixa, na ordem em que aparecem no nome.
 * Aceita faixas combinadas com ou sem conector: "Azul e Roxa", "Cinza Amarela".
 */
export function coresDaFaixa(faixa: string): string[] {
    return faixa
        .toLowerCase()
        .split(/\s+e\s+|\s+/)
        .map((p) => CORES_FAIXA[p])
        .filter((c): c is string => Boolean(c));
}

const ORDEM_FAIXA = [
    'Branca', 'Cinza Amarela', 'Laranja Verde', 'Azul', 'Azul e Roxa', 'Roxa',
    'Marrom', 'Preta e Marrom', 'Preta',
];

/** Divisão "0" é o Absoluto. Demais usam o número entre parênteses, ex.: "Master 1 (30–35)" → 30. */
export function ordemDivisao(divisao: string): number {
    if (divisao === '0' || divisao.toLowerCase() === 'absoluto') return -1;
    const m = divisao.match(/\((\d+)/);
    return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

export function nomeDivisao(divisao: string): string {
    return divisao === '0' ? 'Absoluto' : divisao;
}

export function ordemFaixa(faixa: string): number {
    const i = ORDEM_FAIXA.indexOf(faixa);
    return i < 0 ? ORDEM_FAIXA.length : i;
}

/**
 * Nomes de exibição dos grupos. O banco guarda nomes com erros e formatos inconsistentes
 * (ex.: "Categoras Juvenil 16 a 17 Anos"), então a exibição usa esta tabela.
 * A ordem da lista é a ordem de exibição.
 */
const NOMES_GRUPO: Array<{ padrao: RegExp; nome: string }> = [
    { padrao: /absoluto/i, nome: 'Absoluto' },
    { padrao: /sorriso kimono|4 - 15/i, nome: 'Infantil Kimono (4 a 15 anos)' },
    { padrao: /juvenil/i, nome: 'Juvenil 16 a 17 anos' },
    { padrao: /adulto/i, nome: 'Adulto 18 a 29 anos' },
    { padrao: /master/i, nome: 'Master 30 anos +' },
];

function indiceGrupo(nomeBanco: string): number {
    const i = NOMES_GRUPO.findIndex(({ padrao }) => padrao.test(nomeBanco));
    return i < 0 ? NOMES_GRUPO.length : i;
}

export function nomeGrupoAmigavel(nomeBanco: string): string {
    const i = indiceGrupo(nomeBanco);
    return i < NOMES_GRUPO.length ? NOMES_GRUPO[i].nome : nomeBanco;
}

const kg = (n: number) => `${String(n).replace('.', ',')} kg`;

/** Mesmo formato de faixa de peso que o atleta vê. */
export function textoPeso(minKg: number, maxKg: number | null, peso: string): string {
    if (peso.toLowerCase() === 'absoluto') return 'Sem limite de peso';
    if (minKg <= 0 && maxKg != null) return `Até ${kg(maxKg)}`;
    if (maxKg == null) return `Acima de ${kg(Math.round((minKg - 0.01) * 10) / 10)}`;
    return `${kg(minKg)} a ${kg(maxKg)}`;
}

/**
 * Extrai peso e modalidade do nome completo, que segue o formato:
 * "Divisão • N anos • Sexo • Faixa • Peso • Modalidade".
 * Se o nome não tiver esse formato, devolve peso vazio e modalidade vazia.
 */
export function parseNomeCategoria(categoriaCompleta: string): { peso: string; modalidade: string } {
    const partes = categoriaCompleta.split(' • ').map((p) => p.trim());
    if (partes.length !== 6) return { peso: '', modalidade: '' };
    return { peso: partes[4], modalidade: partes[5] };
}

export function montarMapaCategorias(linhas: CategoriaRowInput[]): MapaGrupo[] {
    const grupos = new Map<string, Map<string, Map<string, Map<string, CategoriaDetalhe[]>>>>();

    for (const linha of linhas) {
        if (linha.disabled) continue;

        const sexo = linha.sexo ?? 'Sem sexo';
        const divisao = linha.divisao_idade ?? 'Sem divisão';
        const faixa = linha.faixa ?? 'Sem faixa';
        const { peso, modalidade } = parseNomeCategoria(linha.categoria_completa);
        const minKg = Number(linha.peso_min_kg ?? 0);
        const maxKg = linha.peso_max_kg == null ? null : Number(linha.peso_max_kg);

        const porSexo = grupos.get(linha.table_name) ?? new Map();
        const porDivisao = porSexo.get(sexo) ?? new Map();
        const porFaixa = porDivisao.get(divisao) ?? new Map();
        const lista = porFaixa.get(faixa) ?? [];

        lista.push({
            peso: peso || linha.categoria_completa,
            modalidade,
            minKg,
            maxKg,
            textoPeso: textoPeso(minKg, maxKg, peso),
        });

        porFaixa.set(faixa, lista);
        porDivisao.set(divisao, porFaixa);
        porSexo.set(sexo, porDivisao);
        grupos.set(linha.table_name, porSexo);
    }

    return [...grupos.entries()]
        .sort(([a], [b]) => indiceGrupo(a) - indiceGrupo(b) || a.localeCompare(b, 'pt-BR'))
        .map(([nomeBanco, porSexo]) => ({
            nome: nomeGrupoAmigavel(nomeBanco),
            sexos: [...porSexo.entries()]
                .sort(([a], [b]) => (ORDEM_SEXO.indexOf(a) + 1 || 99) - (ORDEM_SEXO.indexOf(b) + 1 || 99))
                .map(([sexo, porDivisao]) => ({
                    sexo,
                    divisoes: [...porDivisao.entries()]
                        .sort(([a], [b]) => ordemDivisao(a) - ordemDivisao(b))
                        .map(([divisao, porFaixa]) => ({
                            divisao,
                            faixas: [...porFaixa.entries()]
                                .sort(([a], [b]) => ordemFaixa(a) - ordemFaixa(b))
                                .map(([faixa, categorias]) => ({
                                    faixa,
                                    categorias: categorias.sort((x, y) => x.minKg - y.minKg),
                                })),
                        })),
                })),
        }))
        .filter((g) => g.sexos.some((s) => s.divisoes.length > 0));
}
