-- Setup local (corre no `supabase db reset`, não vai para produção):
-- dá folga aos limites de tempo, que a máquina de dev anda carregada.
alter role anon set statement_timeout = '30s';
alter role authenticated set statement_timeout = '30s';
alter role authenticator set statement_timeout = '30s';
