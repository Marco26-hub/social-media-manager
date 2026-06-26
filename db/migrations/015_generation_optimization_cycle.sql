alter table calendario add column if not exists production_cycle_stage text
  check (production_cycle_stage in ('brief','creative','production','review','publish','learn'));
alter table calendario add column if not exists optimization_cycle_json jsonb;
alter table calendario add column if not exists performance_hypothesis text;
alter table calendario add column if not exists next_iteration_actions jsonb;

comment on column calendario.production_cycle_stage is 'Step del ciclo operativo: brief, creative, production, review, publish, learn';
comment on column calendario.optimization_cycle_json is 'Ipotesi, metrica da osservare, segnale di apprendimento, test successivo e fallback';
comment on column calendario.performance_hypothesis is 'Ipotesi realistica sul perché il contenuto dovrebbe funzionare';
comment on column calendario.next_iteration_actions is 'Azioni concrete per migliorare la prossima iterazione dopo i dati';

create index if not exists idx_calendario_cliente_cycle_stage on calendario(cliente_id, production_cycle_stage);
