-- Remove unique constraint on CPF to allow duplicate CPFs across athletes
DROP INDEX IF EXISTS profiles_cpf_unique_idx;
