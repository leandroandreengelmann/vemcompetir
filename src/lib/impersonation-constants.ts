/**
 * Nomes dos cookies de controle da impersonação ("acessar como").
 * Mantidos fora do módulo 'use server' porque arquivos de server actions
 * só podem exportar funções async.
 */
export const IMP_ACTIVE = 'imp_active';
export const IMP_LABEL = 'imp_label';
export const IMP_ADMIN_RETURN = 'imp_admin_return';
export const IMP_ADMIN_ID = 'imp_admin_id';

export const IMP_MAX_AGE = 60 * 60 * 8; // 8h
