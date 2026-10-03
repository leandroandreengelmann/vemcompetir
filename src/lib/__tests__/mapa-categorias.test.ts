import { describe, it, expect } from 'vitest';
import { coresDaFaixa, montarMapaCategorias, nomeGrupoAmigavel, parseNomeCategoria, textoPeso, ordemDivisao, type CategoriaRowInput } from '../mapa-categorias';

describe('coresDaFaixa', () => {
    it('faixa simples devolve uma cor', () => {
        expect(coresDaFaixa('Preta')).toEqual(['#0A0D12']);
    });

    it('faixa combinada com conector devolve as duas cores', () => {
        expect(coresDaFaixa('Azul e Roxa')).toEqual(['#00359E', '#491C96']);
    });

    it('faixa combinada sem conector (kids) devolve as duas cores', () => {
        expect(coresDaFaixa('Cinza Amarela')).toEqual(['#61656C', '#FDB022']);
    });

    it('nome desconhecido não devolve cor', () => {
        expect(coresDaFaixa('Sem faixa')).toEqual([]);
    });
});

describe('nomeGrupoAmigavel', () => {
    it('corrige o erro de digitação do banco nos grupos juvenis', () => {
        expect(nomeGrupoAmigavel('Categoras Juvenil 16 a 17 Anos')).toBe('Juvenil 16 a 17 anos');
    });

    it('nomeia os grupos como o organizador já aprovou', () => {
        expect(nomeGrupoAmigavel('CATEGORIAS 4 - 15 ANOS INFANTIL SORRISO KIMONO')).toBe('Infantil Kimono (4 a 15 anos)');
        expect(nomeGrupoAmigavel('CATEGORIAS ABSOLUTO PARA SORRISO')).toBe('Absoluto');
        expect(nomeGrupoAmigavel('Categorias Adulto 18 a 29 Anos')).toBe('Adulto 18 a 29 anos');
        expect(nomeGrupoAmigavel('Categorias Master 30 Anos +')).toBe('Master 30 anos +');
    });

    it('mantém o nome original quando não há regra', () => {
        expect(nomeGrupoAmigavel('Grupo especial 2026')).toBe('Grupo especial 2026');
    });
});

const linha = (overrides: Partial<CategoriaRowInput> & { categoria_completa: string }): CategoriaRowInput => ({
    table_name: 'Categorias Master 30 Anos +',
    sexo: 'Masculino',
    divisao_idade: 'Master 1 (30–35)',
    faixa: 'Branca',
    peso_min_kg: 0,
    peso_max_kg: 76,
    disabled: false,
    ...overrides,
});

describe('parseNomeCategoria', () => {
    it('extrai peso e modalidade do formato completo', () => {
        expect(parseNomeCategoria('Master 1 (30–35) • 30 anos • Masculino • Branca • Pluma • Kimono'))
            .toEqual({ peso: 'Pluma', modalidade: 'Kimono' });
    });

    it('devolve vazio quando o nome não tem o formato esperado', () => {
        expect(parseNomeCategoria('Categoria avulsa')).toEqual({ peso: '', modalidade: '' });
    });
});

describe('textoPeso', () => {
    it('usa "Até" quando o mínimo é zero', () => {
        expect(textoPeso(0, 44.3, 'Galo')).toBe('Até 44,3 kg');
    });

    it('usa intervalo entre mínimo e máximo', () => {
        expect(textoPeso(44.31, 48.3, 'Pluma')).toBe('44,31 kg a 48,3 kg');
    });

    it('usa "Acima de" quando não há máximo', () => {
        expect(textoPeso(69.01, null, 'Super Pesado')).toBe('Acima de 69 kg');
    });

    it('marca o absoluto como sem limite', () => {
        expect(textoPeso(0, null, 'Absoluto')).toBe('Sem limite de peso');
    });
});

describe('ordemDivisao', () => {
    it('coloca o Absoluto antes das divisões de idade', () => {
        expect(ordemDivisao('0')).toBeLessThan(ordemDivisao('Pré-mirim I (4)'));
    });

    it('ordena pela idade entre parênteses', () => {
        expect(ordemDivisao('Master 2 (36–40)')).toBeGreaterThan(ordemDivisao('Master 1 (30–35)'));
    });
});

describe('montarMapaCategorias', () => {
    it('descarta categorias desativadas', () => {
        const mapa = montarMapaCategorias([
            linha({ categoria_completa: 'Master 1 (30–35) • 30 anos • Masculino • Branca • Pluma • Kimono', disabled: true }),
            linha({ categoria_completa: 'Master 1 (30–35) • 30 anos • Masculino • Branca • Pena • Kimono' }),
        ]);
        const cats = mapa[0].sexos[0].divisoes[0].faixas[0].categorias;
        expect(cats.map((c) => c.peso)).toEqual(['Pena']);
    });

    it('some com grupo, sexo e divisão que ficaram sem categorias ativas', () => {
        const mapa = montarMapaCategorias([
            linha({ table_name: 'CATEGORIAS ABSOLUTO PARA SORRISO', divisao_idade: '0', sexo: 'Feminino', faixa: 'Branca', categoria_completa: '0 • 200 anos • Feminino • Branca • Absoluto • No-Gi', disabled: true }),
            linha({ table_name: 'CATEGORIAS ABSOLUTO PARA SORRISO', divisao_idade: '0', sexo: 'Masculino', faixa: 'Branca', categoria_completa: '0 • 200 anos • Masculino • Branca • Absoluto • Kimono' }),
        ]);
        expect(mapa).toHaveLength(1);
        expect(mapa[0].sexos.map((s) => s.sexo)).toEqual(['Masculino']);
    });

    it('agrupa Master 1 Branca com todos os pesos juntos, ordenados por peso', () => {
        const mapa = montarMapaCategorias([
            linha({ categoria_completa: 'x • 30 anos • Masculino • Branca • Pena • Kimono', peso_min_kg: 58.51, peso_max_kg: 64 }),
            linha({ categoria_completa: 'x • 30 anos • Masculino • Branca • Galo • Kimono', peso_min_kg: 0, peso_max_kg: 53.5 }),
            linha({ categoria_completa: 'x • 30 anos • Masculino • Azul • Galo • Kimono', faixa: 'Azul' }),
        ]);
        const faixas = mapa[0].sexos[0].divisoes[0].faixas;
        expect(faixas.map((f) => f.faixa)).toEqual(['Branca', 'Azul']);
        expect(faixas[0].categorias.map((c) => c.peso)).toEqual(['Galo', 'Pena']);
    });

    it('mantém Masculino antes de Feminino e divisões em ordem de idade', () => {
        const mapa = montarMapaCategorias([
            linha({ sexo: 'Feminino', divisao_idade: 'Master 2 (36–40)', categoria_completa: 'x • 36 anos • Feminino • Branca • Pluma • Kimono' }),
            linha({ sexo: 'Masculino', divisao_idade: 'Master 2 (36–40)', categoria_completa: 'x • 36 anos • Masculino • Branca • Pluma • Kimono' }),
            linha({ sexo: 'Masculino', divisao_idade: 'Master 1 (30–35)', categoria_completa: 'x • 30 anos • Masculino • Branca • Pluma • Kimono' }),
        ]);
        expect(mapa[0].sexos.map((s) => s.sexo)).toEqual(['Masculino', 'Feminino']);
        expect(mapa[0].sexos[0].divisoes.map((d) => d.divisao)).toEqual(['Master 1 (30–35)', 'Master 2 (36–40)']);
    });

    it('retorna vazio quando todas as categorias estão desativadas', () => {
        expect(montarMapaCategorias([
            linha({ categoria_completa: 'x • 30 anos • Masculino • Branca • Pena • Kimono', disabled: true }),
        ])).toEqual([]);
    });
});
