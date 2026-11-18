# G2 — Auditoria de Supabase/PostgreSQL, inicialização e fixtures

**Data:** 16/11/2026  
**Worktree:** `/home/bruno/fitness_saas/.worktrees/apym-g2-phase1`, branch `codex/apym-g2-phase1`  
**Alvo declarado:** banco Supabase de desenvolvimento, schema PostgreSQL `gymkhana`.  
**Estado inicial (16/11/2026):** auditoria local concluída; naquele momento nenhuma conexão remota, migration, seed, `db push`, reset ou alteração de banco havia sido executada. Ver atualização pós-aprovação abaixo.

## Atualização pós-aprovação — 17/11/2026

Após autorização explícita do usuário para seguir com as migrations, conectamos ao Supabase de desenvolvimento e aplicamos as sete migrations do repositório no schema `gymkhana`.

- `DIRECT_DATABASE_URL` aponta para o host direto IPv6, sem rota IPv6 disponível neste ambiente. `prisma migrate status` falhou nesse endpoint antes de qualquer escrita.
- O session pooler IPv4 configurado em `DATABASE_URL` foi usado temporariamente como endpoint de migration. `migrate status` confirmou sete migrations pendentes e nenhuma migration anterior no alvo `postgres`, schema `gymkhana`.
- `prisma migrate deploy` aplicou `0_init`, `20260710120000_sprint_product_extensions`, `20260712120000_auth_signup_oauth`, `20260712140000_gymflo_import_batch`, `20260712200000_custom_entities_analytics`, `20260713140000_setting_gym_scope` e `20261116000000_gym_staff_assignment` com sucesso.
- Verificação read-only posterior: `prisma migrate status` reportou “Database schema is up to date!”; `gymkhana._prisma_migrations` contém 7 linhas aplicadas, 0 pendentes e 0 revertidas.
- O schema ativo foi confirmado como `gymkhana`; o catálogo encontrou 69 objetos nesse schema. Os metadados Prisma estão em `gymkhana._prisma_migrations`, e não em `public`.
- Antes da aplicação, o inventário read-only mostrou `gymkhana` sem objetos e sem `_prisma_migrations`. Depois, as contagens de objetos em `auth` (28) e `storage` (10) permaneceram iguais; `public` não apresentou objetos antes nem depois. A migration `0_init` contém apenas `CREATE SCHEMA IF NOT EXISTS "public"`, no-op porque `public` já existia.
- Nenhum seed, `db push`, reset ou exclusão foi executado. Não houve alteração intencional a tabelas .NET/APYM ou Supabase Auth/Storage.
- Aviso operacional: migrations futuras podem usar `DIRECT_DATABASE_URL` somente quando o endpoint estiver roteável (por exemplo, em ambiente com IPv6 ou com endpoint direto IPv4 habilitado). Para esta execução autorizada, o session pooler IPv4 foi usado como alternativa.

Esta atualização substitui as recomendações de “NO-GO” e os estados “não executado” abaixo, que documentam a avaliação anterior à aprovação. Os comandos e procedimentos abaixo permanecem como registro do plano original, não como instruções para repetir a inicialização.

## Decisão

**NO-GO para migration/seed neste momento.** O código está configurável para selecionar `gymkhana`, mas ainda não há prova de conectividade nem de que esse schema está vazio. Antes de qualquer escrita, rotacionar a credencial de banco que foi compartilhada em texto nesta conversa; depois injetar credenciais novas localmente, confirmar o alvo com consultas read-only e obter aprovação explícita para a migration e, separadamente, para o seed.

O caminho proposto é **GO condicional** somente se: a credencial tiver sido rotacionada; `DATABASE_URL` e `DIRECT_DATABASE_URL` confirmarem `schema=gymkhana` no mesmo banco; o schema estiver ausente ou realmente vazio e sem histórico parcial; as tabelas `public`, `auth` e `storage` tiverem inventário pre-execução guardado; backup/snapshot de desenvolvimento estiver confirmado; e houver aprovação explícita para aplicar as sete migrations existentes. Se `gymkhana` contiver qualquer objeto/dado ou migration parcial, parar e reconciliar; não limpar/resetar.

## 1. Prisma e datasource

- `prisma/schema.prisma` usa provider `postgresql`, `url = env("DATABASE_URL")` e `directUrl = env("DIRECT_DATABASE_URL")`. Os modelos não declaram `@@schema`; portanto este é um datasource de schema único e o parâmetro PostgreSQL/Prisma `?schema=gymkhana` deve selecionar o schema default para o Client e o CLI.
- Ambos URLs precisam conter o mesmo `schema=gymkhana`; `DIRECT_DATABASE_URL` é a URL usada pelos comandos de migration por causa de `directUrl`. O runtime usa `DATABASE_URL`.
- `src/lib/prisma-env.ts` preserva os parâmetros existentes com `URL.searchParams`; para hosts `pooler.supabase.com`, atualmente acrescenta `pgbouncer=true`, `connection_limit=10` e `pool_timeout=20` se ausentes. Um teste local com URLs fictícias mostrou que `schema=gymkhana` é preservado. Nenhuma conexão foi aberta.
- O host runtime fornecido é o shared pooler na porta 5432; a documentação Supabase atual identifica 5432 como session pooler e recomenda `pgbouncer=true` para transaction pooling (normalmente porta 6543). O código o adiciona também no host shared pooler; isso desabilita prepared statements no Prisma e merece verificação de runtime, mas não remove `schema`. Se no futuro mudar para transaction pooler, usar flag e limite apropriados conforme ambiente. A URL direct de migrations evita pooling e é a escolha recomendada.
- Prisma instalado e no lockfile: `prisma` e `@prisma/client` **6.19.2**; `package.json` declara `^6.19.2`. `migration_lock.toml` declara `provider = "postgresql"`. O projeto requer Node `>=24`; validações desta revisão foram executadas com Node 24. Prisma 6 aceita `url`/`directUrl` no schema; o aviso de depreciação de `package.json#prisma` refere-se ao Prisma 7 e não impede Prisma 6.
- A validação estática com URL local fictícia `?schema=gymkhana` passou (`prisma validate`). Isso comprova parsing/schema Prisma, **não** conectividade, existência/permissões do schema remoto ou roteamento de migration no Supabase.

### URLs — formato local, sem credenciais no repositório

Usar `.env.local` (está ignorado pelo Git) ou injeção por secret manager; nunca colar URLs com senha em arquivos versionados, histórico de shell ou relatório. Formatos esperados:

```dotenv
DATABASE_URL="postgresql://<POOLER_USER>:<URL_ENCODED_PASSWORD>@<SHARED_POOLER_HOST>:5432/postgres?schema=gymkhana&sslmode=require"
DIRECT_DATABASE_URL="postgresql://<DIRECT_USER>:<URL_ENCODED_PASSWORD>@<DIRECT_HOST>:5432/postgres?schema=gymkhana&sslmode=require"
```

Percent-encode caracteres reservados da senha (por exemplo `!` como `%21`). Não incluir `pgbouncer=true` manualmente na URL de session pooler salvo se a equipe optar explicitamente por essa compatibilidade; `getRuntimeDatabaseUrl()` adiciona a flag localmente. Não compartilhar os valores ou saídas que os imprimam.

## 2. Histórico de migrations

Há **7** diretórios de migration: `0_init`, `20260710120000_sprint_product_extensions`, `20260712120000_auth_signup_oauth`, `20260712140000_gymflo_import_batch`, `20260712200000_custom_entities_analytics`, `20260713140000_setting_gym_scope` e `20261116000000_gym_staff_assignment` (G2 RBAC). `migrate deploy` num schema de destino realmente vazio tentaria aplicar as sete em ordem lexical; não deve ser usado para “consertar” um schema existente sem conferir status/drift.

### Referências explícitas a schemas

Busca em todos os `prisma/migrations/**/*.sql` por identificadores de schema, `CREATE SCHEMA`, `DROP SCHEMA` e `SET search_path` encontrou somente:

```sql
-- prisma/migrations/0_init/migration.sql:2
CREATE SCHEMA IF NOT EXISTS "public";
```

O texto `publicBookSlug` em `0_init` é nome de coluna, não schema. Não há referência SQL a `auth`, `storage`, `extensions`, `public.<tabela>`, nem `SET search_path`. As demais tabelas/types/indexes/FKs são SQL não qualificado. O Prisma CLI deve receber `schema=gymkhana` em `DIRECT_DATABASE_URL` para executar esse SQL no schema selecionado. A instrução explícita acima checa/cria apenas `public`; no Supabase espera-se `public` existente, então deve ser no-op. Confirmar sua existência antes.

As migrations não criam, alteram ou referenciam `auth.users`, tabelas gerenciadas pelo Supabase Auth, nem tabelas .NET/APYM. Com o schema param correto, suas operações não qualificadas e os metadados Prisma ficam em `gymkhana`. Isso é uma conclusão de inspeção/configuração; a localização remota de `_prisma_migrations` só pode ser confirmada após uma migration aprovada, consultando `pg_tables`.

### Escritas contidas no histórico

- `20260710120000_sprint_product_extensions` atualiza `Bill.dueAmount` e `Expense.paidAt`. Num schema novo, as tabelas acabam de ser criadas e não contêm linhas, logo os updates não mudam registros.
- `20260713140000_setting_gym_scope` contém `UPDATE`, `INSERT` e `DELETE` para backfill/reorganização de `Setting`. Num schema novo iniciado por `0_init`, essa tabela começa vazia; não há dados a transformar. **Se `gymkhana` não estiver vazio, esta migration pode alterar/apagar linhas existentes de Setting. Isso é bloqueador para deploy sem análise individual e aprovação.**
- `20261116000000_gym_staff_assignment` cria enum, índice, tabela, índice único parcial e FKs; não contém backfill nem DML. Não será executada sem aprovação.

`0_init` cria as tabelas Gymkhana/Fitness360 sem qualificar schema. Ele não lista objetos do middleware .NET ou Supabase Auth. A garantia depende do datasource realmente selecionar `gymkhana`; não usar URLs sem o parâmetro em nenhum dos dois papéis.

## 3. Histórico e metadados Prisma

Prisma Migrate guarda histórico na tabela `_prisma_migrations` do schema-alvo da conexão Migrate. Com `DIRECT_DATABASE_URL` contendo `?schema=gymkhana`, a localização esperada é `gymkhana._prisma_migrations`; `DATABASE_URL` deve apontar o mesmo schema para runtime. A prova pós-aplicação é: tabela presente em `gymkhana`, ausente em `public` (salvo um histórico independente preexistente, que deve causar parada), e sete linhas aplicadas com `finished_at IS NOT NULL`, sem linha falha.

Não assumir que a migration table ausente significa banco não usado: o schema também pode conter tabelas sem histórico, ou o histórico pode estar em `public`. Inspecionar catálogos e status antes. Nunca resolver divergência com `migrate reset`, `db push`, `migrate resolve` ou remoção de metadata sem plano/aprovação.

## 4. Procedimento seguro de clean initialization

Este procedimento é para uma execução futura após aprovação; **nenhum passo de escrita foi executado**.

### A. Preparação local

```bash
cd /home/bruno/fitness_saas/.worktrees/apym-g2-phase1
node --version                         # esperado: v24.x
npx prisma -v                         # esperado: Prisma/Client 6.19.2
npx prisma validate                  # esperado: schema valid
```

Configurar as duas URLs localmente com os formatos acima. Verificar sem imprimir credenciais:

```bash
node - <<'NODE'
for (const key of ["DATABASE_URL", "DIRECT_DATABASE_URL"]) {
  const value = process.env[key];
  if (!value) throw new Error(`${key} ausente`);
  const url = new URL(value);
  if (url.searchParams.get("schema") !== "gymkhana") {
    throw new Error(`${key} precisa selecionar schema=gymkhana`);
  }
  if (url.pathname !== "/postgres") throw new Error(`${key}: database inesperado`);
  console.log(`${key}: schema=${url.searchParams.get("schema")}; database=postgres; segredo oculto`);
}
NODE
```

Resultado esperado: duas linhas confirmando schema `gymkhana` e database `postgres`, sem host, user ou password impressos. Esse check valida a string local, não o servidor.

### B. Inventário remoto somente leitura antes de qualquer escrita

Executar no SQL Editor do projeto de desenvolvimento, confirmar projeto/destino pelo dashboard e guardar os resultados. Não usar `public` como alvo. Se `gymkhana` não existir, interromper aqui até aprovação explícita para criá-lo.

```sql
BEGIN TRANSACTION READ ONLY;

SELECT current_database() AS database_name,
       current_schema() AS editor_schema,
       current_setting('search_path') AS search_path,
       current_setting('transaction_read_only') AS read_only,
       current_setting('server_version') AS postgres_version;

SELECT nspname AS schema_name, pg_get_userbyid(nspowner) AS owner
FROM pg_namespace
WHERE nspname IN ('gymkhana', 'public', 'auth', 'storage')
ORDER BY nspname;

SELECT n.nspname AS schema_name, c.relname AS object_name,
       c.relkind AS object_kind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('gymkhana', 'public', 'auth', 'storage')
  AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
ORDER BY n.nspname, c.relkind, c.relname;

SELECT n.nspname AS schema_name, t.typname AS enum_name
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname IN ('gymkhana', 'public', 'auth', 'storage')
  AND t.typtype = 'e'
ORDER BY n.nspname, t.typname;

SELECT schemaname, tablename
FROM pg_tables
WHERE tablename = '_prisma_migrations'
  AND schemaname IN ('gymkhana', 'public', 'auth', 'storage')
ORDER BY schemaname;

COMMIT;
```

Antes de uma inicialização limpa: `database_name=postgres`, schema `gymkhana` ausente ou sem objetos/enum/metadata; as listas atuais de `public`, `auth` e `storage` devem ser preservadas para comparação pós-aplicação. Se `gymkhana` não existir, a criação proposta depois de aprovação é `CREATE SCHEMA IF NOT EXISTS gymkhana AUTHORIZATION postgres;` executada no SQL Editor pelo responsável. Não executar agora. Se tiver qualquer objeto ou dados em `gymkhana`, parar; não usar drop/reset.

### C. Checagem Prisma remota (somente leitura)

Depois de configurar `DIRECT_DATABASE_URL`, sem aplicar mudanças:

```bash
npx prisma migrate status
```

Em schema vazio sem `_prisma_migrations`, Prisma 6 pode sair com código 1 indicando migration table ausente; nesse cenário a ausência precisa coincidir com o inventário read-only e não significa erro de conectividade. Se mostrar datasource/schema diferentes, histórico em schema inesperado, migrations aplicadas/falhas ou drift, parar. Não executar comandos de correção.

### D. Aplicação futura, somente após gate/aprovação

```bash
npx prisma validate
npx prisma migrate deploy
npx prisma migrate status
```

`migrate deploy` aplica as sete migrations pendentes pelo `DIRECT_DATABASE_URL`; não rodar `migrate dev`, `db push`, `migrate reset`, nem o seed padrão. Saída esperada em schema novo: migrations listadas da pasta `prisma/migrations`, 7 aplicadas, `migrate status` termina com “Database schema is up to date!”. O header precisa identificar banco `postgres` e schema `gymkhana`. Senão, parar e não tentar rollback destrutivo.

Após isso, repetir o inventário de catálogos da etapa B. Esperado: todos os objetos Gymkhana criados em `gymkhana`; `gymkhana._prisma_migrations` com sete migrations concluídas; `public`, `auth` e `storage` com o mesmo inventário anterior. A única exceção potencial de schema é a checagem `CREATE SCHEMA IF NOT EXISTS public` da migration inicial, que não muda o schema `public` já existente.

Rollback seguro: não existe migration down. Em falha, parar o deploy, preservar logs e snapshot. Preferir correção forward. Restaurar snapshot ou remover schema `gymkhana` é destrutivo e requer aprovação explícita separada. Nunca apagar `public`, `auth`, `storage` ou `_prisma_migrations` manualmente.

## 5. Fixture RBAC de duas academias

Fixture sintética adicionada em `prisma/fixtures/apym-g2-two-gym.ts` e seed isolado em `prisma/seed-apym-g2-two-gym.ts`. O seed não está no entrypoint padrão, não foi executado e não contém dados reais:

| Entidade | Fixture |
|---|---|
| Account | Uma account com Gym A e Gym B. |
| Manager | Identidade sintética `SUB_ADMIN` + `AccountMembership.OWNER`; não recebe role global ADMIN nem função de plataforma. |
| Staff comum | Uma identidade global sintética, `isTrainer=false`, membership `STAFF` ativa na account. |
| Gym A | `GymStaffAssignment.TRAINER` para o staff e um `TrainerClient` ativo só para Member A. |
| Gym B | `GymStaffAssignment.RECEPTION` para a mesma identidade, sem `TrainerClient` para Member B. |

O script só cria registros ausentes. Se IDs/unique keys já existirem com conteúdo divergente, ele aborta a transação; não atualiza ou apaga registros. Exige `APYM_G2_ENABLE_TEST_FIXTURE_SEED=I_CONFIRM_DEV_FIXTURE_WRITE`, `DATABASE_URL` com `schema=gymkhana`, database `postgres` e `APYM_G2_EXPECTED_DB_HOST` igual ao host verificado. Só executá-lo após migration, inventário confirmado e autorização explícita do seed.

Testes unitários foram vinculados aos mesmos IDs fixture:

- `src/lib/__tests__/apym-multi-gym-authorization.test.ts`: uma identidade resolve capacidades independentes TRAINER em A e RECEPTION em B; acesso a gym de outra account é negado antes de buscar atribuição.
- `src/lib/__tests__/trainer-delegation.test.ts`: exige papel TRAINER, usuário ativo, gym/membro exatos e `TrainerClient` ativo; nega Member B/Gym B porque fixture só delega Member A/Gym A.

Resultados esperados no fluxo de autorização: A permite `canPrescribeWorkouts`, nega `canCreatePayments`; B permite `canCreatePayments`, nega `canPrescribeWorkouts`; tentativa de prescrever Member B retorna negação mesmo que o usuário seja treinador em A.

Depois de aprovação futura, comando (não executado):

```bash
APYM_G2_ENABLE_TEST_FIXTURE_SEED=I_CONFIRM_DEV_FIXTURE_WRITE \
APYM_G2_EXPECTED_DB_HOST="<host-exato-confirmado-de-DATABASE_URL>" \
npx tsx prisma/seed-apym-g2-two-gym.ts
```

Verificação esperada da fixture: duas academias, dois membros, uma membership STAFF ativa, uma OWNER ativa, duas atribuições ativas (uma TRAINER, uma RECEPTION), e exatamente um vínculo `TrainerClient` (Gym A/Member A). Nenhum usuário do Supabase Auth é criado; o seed não pode servir para login.

**Não executar `npm run db:seed` nem `npx prisma db seed`:** o entrypoint padrão `prisma/seed.ts` chama `scripts/seed-demo-gym`, que cria demo account/gym e pode vincular usuários existentes.

## 6. Evidências executadas nesta revisão

| Checagem | Resultado |
|---|---|
| `prisma -v` com CLI/Client do lock | 6.19.2 / 6.19.2. |
| `prisma validate` com URL local fictícia terminando em `?schema=gymkhana` | Passou; não conectou. Aviso de depreciação `package.json#prisma` para Prisma 7. |
| Teste local `getRuntimeDatabaseUrl()` com URL pooler fictícia | Preservou `schema=gymkhana`; aplicou `pgbouncer=true` e `connection_limit=10` no wrapper runtime. |
| Busca de SQL de migration por `public`, `auth`, `storage`, `SET search_path` | Única referência de schema: `CREATE SCHEMA IF NOT EXISTS "public"` em `0_init:2`. |
| `npm run typecheck` | Passou. |
| `npm run test:ci` | Passou: 34 suítes, 253 testes. Não executa o seed. |
| `git diff --check` | Passou. |
| Conectividade remota, status remoto, migrations e seed | Não executados. Nenhuma credencial foi copiada para arquivos. |

## Pendências antes de solicitar GO

1. Rotacionar/revogar a credencial compartilhada e injetar substituta localmente; não enviar nova senha no chat.
2. Confirmar via inventário read-only que a conexão é o projeto de desenvolvimento pretendido e que `gymkhana` está ausente/vazio; salvar baseline de `public`, `auth`, `storage`.
3. Executar `migrate status` com `DIRECT_DATABASE_URL`; reportar schema e estado sem revelar URL.
4. Confirmar suporte de rede ao host direct (pode exigir IPv6/IPv4 add-on); não substituir por outro host sem validar o mesmo projeto e schema.
5. Solicitar aprovação explícita para (a) criação do schema caso ausente, (b) deploy das migrations, e depois, separadamente, (c) seed sintético.

## Referências oficiais

- [Prisma ORM 6 — datasource e URL `schema`](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql) e [connection URLs](https://www.prisma.io/docs/orm/v6/reference/connection-urls).
- [Prisma Migrate v6 — migration history](https://www.prisma.io/docs/orm/v6/prisma-migrate/understanding-prisma-migrate/migration-histories) e [`migrate deploy`](https://www.prisma.io/docs/orm/v6/prisma-client/deployment/deploy-database-changes-with-prisma-migrate).
- [Supabase — conectar a PostgreSQL/poolers](https://supabase.com/docs/guides/database/connecting-to-postgres) e [Prisma troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting).
