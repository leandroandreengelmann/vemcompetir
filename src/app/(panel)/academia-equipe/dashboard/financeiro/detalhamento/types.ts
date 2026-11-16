import type { Origin } from '../../actions/registration-origin';

export type OriginRow = {
    origin: Origin;
    count: number;
    /** valor cobrado em centavos (0 para cortesia, grátis e pacote) */
    amountCents: number;
    /** taxa do Asaas em centavos (só origem asaas) */
    feeCents: number;
    /** inscrições Asaas sem taxa gravada (fee_pix_snapshot nulo) */
    feeMissingCount: number;
};

export type Detalhamento = {
    rows: OriginRow[];
    asaasGrossCents: number;
    asaasFeeCents: number;
    asaasNetCents: number;
    outsideCents: number;
    netCents: number;
    feeMissingCount: number;
    tokens: {
        enabled: boolean;
        consumed: number;
        unitPriceCents: number | null;
        costCents: number | null;
    };
    resultAfterTokensCents: number | null;
};
