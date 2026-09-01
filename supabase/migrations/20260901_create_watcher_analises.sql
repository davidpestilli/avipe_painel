create table if not exists public.watcher_analises (
  ambiente text not null,
  registro_id bigint not null check (registro_id > 0),
  analisado boolean not null default false,
  anotacao text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (ambiente, registro_id)
);

create or replace function public.watcher_analises_atualizar_data()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists watcher_analises_atualizar_data on public.watcher_analises;
create trigger watcher_analises_atualizar_data
before update on public.watcher_analises
for each row execute function public.watcher_analises_atualizar_data();

alter table public.watcher_analises enable row level security;
