import { describe, it, expect } from 'vitest';
import { classifyOrigin, splitCents, toCents } from './registration-origin';

const base = { amountCents: 12000 };

describe('classifyOrigin', () => {
    it('ignora canceladas e carrinho', () => {
        expect(classifyOrigin({ ...base, status: 'cancelada' }, null)).toBeNull();
        expect(classifyOrigin({ ...base, status: 'carrinho' }, null)).toBeNull();
    });
    it('cortesia tem prioridade sobre o status', () => {
        expect(classifyOrigin({ ...base, status: 'pago', is_courtesy: true }, null)).toBe('cortesia');
    });
    it('pix direto e dinheiro ficam por fora, sem virar Asaas', () => {
        expect(classifyOrigin({ ...base, status: 'pix_direto' }, null)).toBe('pix_academia');
        expect(classifyOrigin({ ...base, status: 'pago', manual_payment_method: 'pix_direto' }, { asaas_payment_id: 'pay_1' })).toBe('pix_academia');
        expect(classifyOrigin({ ...base, status: 'pago_em_mao' }, null)).toBe('dinheiro');
    });
    it('pago com pagamento Asaas real é asaas (inclui agendado)', () => {
        expect(classifyOrigin({ ...base, status: 'pago' }, { asaas_payment_id: 'pay_1' })).toBe('asaas');
        expect(classifyOrigin({ ...base, status: 'agendado' }, { asaas_payment_id: 'pay_1' })).toBe('asaas');
    });
    it('pago com valor zero é grátis', () => {
        expect(classifyOrigin({ status: 'pago', amountCents: 0, promo_type_applied: 'free_second_registration' }, { asaas_payment_id: 'pay_1' })).toBe('gratis');
    });
    it('isento: pacote x evento próprio', () => {
        expect(classifyOrigin({ ...base, status: 'isento' }, null)).toBe('pacote');
        expect(classifyOrigin({ ...base, status: 'isento' }, { asaas_payment_id: 'own_event_x' })).toBe('gratis');
        expect(classifyOrigin({ ...base, status: 'isento_evento_proprio' }, null)).toBe('gratis');
    });
    it('pago em evento próprio sem método vira por_fora', () => {
        expect(classifyOrigin({ ...base, status: 'pago' }, { asaas_payment_id: 'own_event_x' })).toBe('por_fora');
    });
    it('pendente', () => {
        expect(classifyOrigin({ ...base, status: 'aguardando_pagamento' }, null)).toBe('pendente');
    });
});

describe('splitCents / toCents', () => {
    it('rateia R$ 1,99 em 3 sem perder centavos', () => {
        expect(splitCents(199, 3)).toEqual([67, 66, 66]);
        expect(splitCents(199, 3).reduce((a, b) => a + b, 0)).toBe(199);
    });
    it('converte para centavos sem erro de float', () => {
        expect(toCents(10.1 + 10.2)).toBe(2030);
        expect(toCents('120.00')).toBe(12000);
        expect(toCents(null)).toBe(0);
    });
});
