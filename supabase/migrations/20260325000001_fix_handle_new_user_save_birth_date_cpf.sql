CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_role text;
  v_full_name text;
  v_gym_name text;
  v_tenant_id uuid;
  v_master_id uuid;
  v_master_name text;
  v_birth_date date;
  v_cpf text;
begin

  -- FORCE 'atleta' role for public signups, ignore metadata role
  v_role := 'atleta';

  -- Captura metadados seguros
  v_full_name   := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  v_gym_name    := nullif(trim(new.raw_user_meta_data->>'gym_name'), '');
  v_master_name := nullif(trim(new.raw_user_meta_data->>'master_name'), '');
  v_cpf         := nullif(trim(new.raw_user_meta_data->>'cpf'), '');

  -- birth_date: só salva se for uma data válida
  begin
    v_birth_date := (new.raw_user_meta_data->>'birth_date')::date;
  exception when others then
    v_birth_date := null;
  end;

  -- tenant_id e master_id nulos no signup público
  v_tenant_id := null;
  v_master_id := null;

  -- Blindagem contra CHECK full_name_length (>=3)
  if v_full_name is not null and char_length(v_full_name) < 3 then
    v_full_name := v_full_name || ' Atleta';
  end if;

  insert into public.profiles (
    id,
    full_name,
    role,
    gym_name,
    tenant_id,
    master_id,
    master_name,
    birth_date,
    cpf
  )
  values (
    new.id,
    v_full_name,
    v_role::public.user_role,
    v_gym_name,
    v_tenant_id,
    v_master_id,
    v_master_name,
    v_birth_date,
    v_cpf
  );

  return new;

exception
  when others then
    raise exception 'handle_new_user failed: %', sqlerrm;
end;
$function$;
