# APYM G2 — Preparação da Fase 2

**Data:** 16/11/2026  
**Branch/worktree:** `codex/apym-g2-phase1`, `/home/bruno/fitness_saas/.worktrees/apym-g2-phase1`  
**Status:** análise e planejamento somente. Sem alteração de dados, migration, deploy, merge ou push.

## 1. Censo de staging — bloqueado por falta de acesso

Não há credenciais/configuração de staging injetadas no ambiente, nem snapshot local. O único arquivo encontrado é `.env.example`, com URLs ilustrativas para `localhost`; não é evidência nem alvo de staging. As variáveis de banco não estão presentes no ambiente. Não tentei conectar ou usar esses valores. Nenhuma consulta ou alteração de dados foi feita.

Para concluir o censo, é necessário disponibilizar uma conexão read-only de staging por meio aprovado (variável `DATABASE_URL`/`DIRECT_DATABASE_URL` injetada no processo) ou snapshot sanitizado. O processo deverá validar antes que o servidor é o staging esperado, autenticar com usuário sem escrita, abrir transação read-only e capturar apenas contagens/agregações e identificadores pseudonimizados necessários. Não coletar senha, hash, e-mail, telefone ou nome em relatório.

As consultas para execução pela equipe no snapshot estão em [`G2_PHASE2_CENSUS.sql`](./G2_PHASE2_CENSUS.sql). O arquivo é limitado a `SELECT`, com transação PostgreSQL `READ ONLY`, confirmação do banco/schema no primeiro resultado, pseudônimos por salt local e uma consulta opcional comentada para `GymStaffAssignment` caso a tabela já exista. O arquivo não foi executado aqui.

## Revisão pré-execução do SQL

- **Schema Prisma:** as consultas usam os nomes PostgreSQL sem `@@map`: `User`, `Account`, `Gym`, `AccountMembership`, `Member`, `TrainerClient` e `TrainerCommission`. Todos existem na migration inicial `prisma/migrations/0_init/migration.sql`; `GymStaffAssignment` só existe na proposta G2. O campo `Gym.isActive` e status de conta não existem, por isso não são supostos.
- **Compatibilidade PostgreSQL:** o datasource Prisma declara `postgresql`. O arquivo usa `BEGIN ... READ ONLY`, `to_regclass`, `LATERAL`, `FILTER` em agregados, `IS DISTINCT FROM`, `md5` e `format`; esses recursos são compatíveis com versões PostgreSQL modernas usadas com Prisma. O mínimo para as construções mais recentes aqui é PostgreSQL 9.4. A versão concreta de staging ainda é desconhecida; a consulta 1 expõe `server_version`, que deve ser conferido antes de prosseguir. Ver documentação oficial de [BEGIN / READ ONLY](https://www.postgresql.org/docs/current/sql-begin.html), [expressões de agregação FILTER](https://www.postgresql.org/docs/current/sql-expressions.html) e [`to_regclass`](https://www.postgresql.org/docs/current/functions-info.html).
- **Sem mutação:** o único SQL executável fora de comentários é `BEGIN TRANSACTION READ ONLY`, `SELECT`/CTEs de leitura e `COMMIT`. Não há DDL, DML, funções que escrevam dados, `SELECT FOR UPDATE`, nem chamadas a stored procedures. O snapshot deve ser acessado com credencial read-only e a execução deve parar se a ferramenta rejeitar o modo read-only; não remover o guard.
- **Tabelas condicionais:** `GymStaffAssignment` é detectada com `to_regclass` (qualificado pelo `current_schema`) e não é referenciada por consultas executáveis quando ausente. Os blocos opcionais de atribuição ficam comentados e só devem ser habilitados se a consulta 2 indicar a tabela presente. As outras tabelas consultadas fazem parte da migration inicial verificada.
- **PII/salt:** nenhuma saída inclui nomes, contatos, e-mail, senha/hash, endereço, saúde, fotos, valor de comissão ou texto de notas. Identificadores de usuário/conta/academia/aluno/treinador são hashes com um salt aleatório que o operador insere localmente; o valor não aparece no result set. Os pseudônimos são correlacionáveis entre consultas e devem ser tratados como dados pseudonimizados, não anônimos. Não compartilhar o SQL executado/histórico com o salt substituído.
- **Integridade professor-aluno:** a consulta 9 retorna pseudônimos e flags de janela, usuário ativo, membership ativa na conta do gym e `Member.gymId = TrainerClient.gymId`; consulta 10 agrega contagens de vínculos órfãos, expirados/futuros e gyms divergentes. A FK atual não garante que o `gymId` em `TrainerClient` seja o mesmo `Member.gymId`, portanto os joins são necessários.
- **STAFF sem função por academia:** a consulta 7 produz candidatos `AccountMembership.STAFF × Gym` com evidência legada, sem inferir papel. Se `GymStaffAssignment` não existir, o schema pré-G2 não tem função operacional por academia; todas as linhas de usuário/membership elegíveis exigem confirmação manual por gym. Se existir, a consulta opcional 13 encontra STAFF ativo sem atribuição ativa.

### Procedimento no editor SQL

1. Use o snapshot sanitizado ou conexão do ambiente de staging em schema confirmado pelo responsável. Prefira credencial read-only. Não use a conexão de produção.
2. Faça uma cópia local do SQL. Substitua todas as ocorrências de `REPLACE_CENSUS_SALT_LOCALLY_DO_NOT_SHARE` pelo mesmo segredo aleatório de pelo menos 32 caracteres; não use senha/credencial real. Não salve nem compartilhe o histórico do editor após inserir o salt.
3. Execute o bloco completo na mesma sessão, preservando `BEGIN TRANSACTION READ ONLY` e `COMMIT`. Se o editor não aceitar controle de transação multi-statement, não remova as linhas sem antes confirmar que a credencial é efetivamente read-only; nesse caso execute os `SELECT`s individualmente usando credencial read-only e mantenha todos os resultados locais até verificar a consulta 1.
4. Primeiro confira `db_label`, `schema_name`, `transaction_read_only = on` e `postgres_version`. Se banco/schema não forem o snapshot de staging esperado, ou o modo read-only não estiver ativo, pare e não execute as demais consultas.
5. Execute as consultas 2–11 e exporte somente seus result sets. A consulta 7 é uma matriz de revisão, não arquivo de backfill. Só habilite as consultas opcionais 12 e 13 após a consulta 2 confirmar que `GymStaffAssignment` existe; caso contrário, deixe ambas comentadas.
6. Antes de enviar, remova IDs originais, PII, salt e detalhes do endpoint/host. Compartilhe apenas os result sets das consultas 1–11 (com `db_label` substituído por um rótulo como `staging-sanitizado`), mais 13 se aplicável. Se a consulta 7/9/11 for grande, envie CSV sanitizado; não envie query history.

Os resultados necessários para preparar o backfill são: totais 2; distribuições 3, 4 e 8; perfis de conta 5; discrepâncias 6; matriz STAFF×academia 7; vínculos e status 9–10; evidência agregada de comissão 11; e atribuições atuais/missing-role 12–13 somente se a tabela já existir. Nenhuma dessas evidências será convertida automaticamente em função privilegiada.

### Plano de consulta read-only

O censo deve produzir:

| Entidade | Recortes mínimos |
|---|---|
| `User` | total/ativos/inativos; papel global legado; quantos têm `isTrainer`; quantos têm ou não `AccountMembership`; usuários sem membership ativa. Sem PII. |
| `Account` e `Gym` | totais/ativos por conta; academias sem conta válida, se houver; quantidade de gyms por conta. |
| `AccountMembership` | contagens por `OWNER`/`ADMIN`/`STAFF`, ativa/inativa, conta; usuários ligados a mais de uma conta; divergências entre papel global e membership. |
| `TrainerClient` | vínculos ativos por trainer/gym, usuário inativo, trainer sem membership, membro/gym divergentes e períodos expirados/futuros. IDs pseudonimizados para reconciliação. |
| Comissões | treinadores com comissão e sem `isTrainer`/sem membership; usar somente como sinal para revisão, nunca como regra de atribuição. |
| Atribuições | antes da migration, zero tabela; após uma futura aplicação aprovada, contagem por função/academia, duplicidades e linhas sem membership/academia válida. |

O resultado será uma planilha de revisão **STAFF × academia**, com sinais `isTrainer`, `TrainerClient` e comissão expostos apenas como evidência. Colunas de decisão precisam de confirmação expressa do gestor e trilha de quem aprovou. Até receber a fonte de staging, nenhum número ou perfil individual é afirmado.

## 2. Proposta de backfill sem concessão automática

### Autoridade e precedência

- `AccountMembership` ativa `OWNER`/`ADMIN`: conserva gestão da conta e das academias nela contidas; não ganha poder global de plataforma. Esses papéis não precisam de `GymStaffAssignment` para a autoridade da conta.
- `AccountMembership` `STAFF`: fica sem função operacional até que gestor da conta confirme atribuição por academia.
- `User.role`, `User.isTrainer`, comissões e associações `TrainerClient` **não** são fonte de grant. `isTrainer=true` pode sugerir uma linha a revisar; não pode gerar `TRAINER` automaticamente. Nem `User.role=ADMIN` converte `STAFF` em `MANAGER`.
- `TRAINER` atribuído só pode operar sobre cada aluno que tenha `TrainerClient` ativo, na mesma academia e dentro da janela de validade.
- Ausência, conflito ou incerteza mantém o usuário sem atribuição e falha fechada.

### Fluxo de preparação e backfill

1. Obter snapshot read-only e gerar pré-lista sem mutações.
2. Cada gestor da conta revisar as linhas de staff das academias sob sua conta; registrar papel escolhido, motivo, aprovador e data. Não aceitar autoaprovação inferida por legado.
3. Resolver casos sem aprovador, memberships inativas, usuário inativo, `Gym.accountId` divergente e usuário com mais de um papel histórico; manter pendente até decisão.
4. Após aprovação separada da migration e do backfill, importar apenas linhas aprovadas com `assignedById` real e motivo. Uma linha `MANAGER` exige confirmação nominal do gestor responsável; nenhuma elevação privilegiada automática.
5. Tornar a operação idempotente por chave lógica `(userId,gymId)` e estado ativo. Duplicata idêntica retorna a atribuição atual; papel distinto exige troca auditada (desativar linha antiga e criar nova em transação).
6. Relatar contagens antes/depois e comparar divergências. Habilitar as guardas somente quando o plano de comunicação e a população sem papel forem aceitos.

**Saída atual:** proposta de processo apenas. Não foi montado arquivo com registros nem realizado backfill.

## 3. Revisão dos 45 candidatos do scanner de tenancy

O inventário foi regenerado no checkout atual com `node scripts/audit-tenant-scope.mjs --json`: **45 candidatos, 0 correspondências na lista P0**. A janela heurística procura `gymId` próximo da query e não resolve builders, filtros montados antes, chave global única, isolamento por membership de conta ou processamento batch. Classificação por call site:

| Call sites | Qtde | Classificação baseada no código atual |
|---|---:|---|
| `src/app/api/public/book-trial/route.ts:26,64` | 2 | **Falso positivo esperado.** Busca pública por `publicBookSlug`, único no banco, resolve a academia explicitamente escolhida para página pública de trial; não é listagem de dados privados. Manter rate limit/validação do slug e rever os campos retornados se a página pública mudar. |
| `src/app/api/trainers/commissions/route.ts:79` | 1 | **Falso positivo.** `where` é `TrainerCommissionWhereInput` inicializado com `gymId` resolvido no contexto autenticado (linha 52). |
| `src/domains/billing/handlers/list-bill-templates.ts:17` | 1 | **Global intencional.** `ReceiptTemplate` é catálogo compartilhado sem FK `gymId`; leitura autenticada. Se templates passarem a ser customizáveis por academia, schema e filtro terão de mudar. |
| `src/domains/communications/adapters/prisma-reminder-log-queries.ts:83` | 1 | **Falso positivo.** `legacyWhere` é tipado e inicializado com `gymId` antes de `findMany`. |
| `src/domains/expenses/adapters/prisma-expense-queries.ts:54,66` | 2 | **Falso positivo.** Ambas as leituras usam `buildWhere(filters)` que inicializa `{ gymId: filters.gymId }`; `groupBy` reutiliza o mesmo filtro. |
| `src/domains/finance/handlers/salaries.ts:86,122,133` | 3 | **Falso positivo.** `Prisma.SalaryWhereInput` começa com `{ gymId }`; find e dois groupBy/agregados usam esse filtro. |
| `src/domains/identity/handlers/password-reset.ts:65` | 1 | **Global intencional.** Lookup por hash de token, estado e expiração; a identidade é global, e a atualização subsequente usa o `userId` do token resgatável. Proteção depende da entropia, uso único e expiração do token, não de academia. |
| `src/domains/identity/handlers/signup.ts:23` | 1 | **Global intencional.** Verifica e-mail/contato globalmente únicos para não criar identidades duplicadas entre contas. Não retorna registro ao solicitante; resposta informa apenas colisão. |
| `src/domains/members/adapters/prisma-member-queries.ts:188,209` | 2 | **Falso positivo.** Paginação cursor e offset usam o mesmo `where` construído com `gymId`, busca e status. |
| `src/domains/platform/cron-tasks.ts:93` | 1 | **Batch global intencional.** Job de sistema enumera gyms e chama sincronização passando cada `gym.id`; a query enumera IDs, não expõe dados a uma sessão de academia. A invocação/segredo do cron continua sendo controle crítico. |
| `src/domains/platform/users/handlers/list-users.ts:41,85`; `src/domains/platform/users/handlers/user-crud.ts:45,76,79,88,136` | 6 | **Escopo por conta, não por gym.** Handlers exigem gestor da conta; listagem deriva IDs de memberships ativas da conta; leitura/edição/exclusão verificam pertencimento antes de buscar por PK global. Edição bloqueia identidade compartilhada entre contas e alterações de papel global. Dados de identidade são globais por modelo; qualquer futura exposição de PII precisa revisar compartilhamento interconta. |
| `src/domains/revenue-opportunities/service.ts:161` | 1 | **Batch global intencional.** Enumera academias e delega para `generateOpportunitiesForGym(gym.id)`; saída interna de job. Verificar que o gatilho não está exposto como rota comum. |
| `src/inngest/lifecycle-cron-functions.ts:18` | 1 | **Batch global intencional.** Carrega ID/nome e processa tasks por gym, então atualiza estatísticas de todas as academias. Risco de disponibilidade/correção operacional, mas não é resposta cross-tenant a usuário. |
| `src/lib/account-scope.ts:25,56,72`; `src/lib/account-user-scope.ts:12,17` | 5 | **Escopo de identidade/conta.** Consultam membership da conta escolhida, associação conta-usuário ou usuário global após verificar membership. A listagem filtra `isActive`; fallback legado `User.accountId` não reabre membership inativa. Não são consultas de dados de academia. |
| `src/lib/auth/oauth-users.ts:20,35`; `src/lib/auth/provision-owner.ts:72`; `src/lib/auth.ts:221` | 4 | **Global intencional de autenticação.** Busca por `(provider, providerUserId)`, e-mail, contato ou `User.id`, todos identificadores globais. OAuth agora exige provider associado ou e-mail verificado e não auto-vincula por e-mail colidente. |
| `src/lib/cron/job-tracker.ts:13` | 1 | **Global intencional.** Procura execução `RUNNING` por nome de job para evitar duplicidade global. Pode serializar jobs de tenants diferentes com mesmo nome (risco de throughput), sem retorno de dados de tenant. |
| `src/lib/gym-scope.ts:111` | 1 | **Global intencional após escopo.** Consulta `User.isActive` por PK só depois de localizar academia e confirmar membership ativa do usuário para `Gym.accountId`. |
| `src/lib/member-protection.ts:219,244` | 2 | **Risco latente, sem consumidor encontrado.** O ID sequencial legado percorre todos os IDs `MEM-*`; os outros dois call sites de stats são contagens globais. `rg` não encontrou consumidor de `getProtectedMemberStats`. O contador global pode expor agregado multi-gym ou confundir UI se vier a ser ligado a uma rota; exigir `gymId` ou manter explicitamente platform-only antes de reutilizar. IDs protegidos são globalmente únicos; gerar sequência global não retorna PII, mas pode causar contenção/conflito concorrente. |
| `src/lib/oauth/clients.ts:70` | 1 | **Global intencional.** Client OAuth é resolvido pelo `clientId` globalmente único; validação subsequente checa atividade/segredo e usa `accountId`/`gymId` e scopes para autorização. Nunca considerar o lookup sozinho uma autorização. |
| `src/lib/services/member.service.ts:197,247` | 2 | **Falso positivo.** Os dois caminhos de listagem reutilizam `where` inicializado com `gymId`. |
| `src/lib/services/membership.service.ts:227,240` | 2 | **Dependência de autorização do chamador / latente.** Helpers recebem somente `memberId` e consultam membership ligada a chave global do membro. Nenhum uso de API foi encontrado; a superfície de domínio/adaptador pode ser reutilizada. Exigir prova `memberId + gymId` no chamador ou adicionar `gymId` à assinatura antes de expor dados/resultado em rota multi-tenant. |
| `src/lib/services/payment.service.ts:352` | 1 | **Dependência de autorização do chamador / código sem uso localizado.** Busca por Payment PK e remove após. Nenhum chamador atual de produção foi encontrado. Se reativado, o endpoint deve carregar pagamento por `id + gymId` antes de chamar; preferível tornar a função tenant-scoped. |
| `src/lib/services/status-updater.service.ts:91,114,152` | 3 | **Batch global intencional com risco operacional.** O job global recalcula status de membros a partir das memberships de todas as academias; atualizações usam PK global. Não retorna esses dados a um tenant. Confirmar em operação que só scheduler autorizado chama `updateAllExpiredMemberStatuses`; se algum uso por request surgir, restringir por gym e auditar transições. `getMemberWithCurrentStatus` aceita ID global e precisa de autorização upstream. |

**Síntese:** não foi confirmado vazamento cross-gym ativo entre os 45 pontos inspecionados. A maioria é filtro construído fora da janela do scanner, identidade/conta global ou batch de plataforma. Os riscos reais a carregar são helpers com assinatura sem `gymId` e potencial de reutilização, estatística de membros global sem consumer encontrado, confiança na autorização do chamador para lookups por PK e segurança operacional de jobs que percorrem todos os tenants. Esta é revisão estática, não teste dinâmico de staging; portanto não prova ausência geral de vulnerabilidade.

## 4. Contratos necessários Gymkhana/APYM Web ↔ middleware .NET

Contrato consultado anteriormente na G1: repositório privado `carrarook/apym_api`, `api/openapi/v1.json`, branch `main`, OpenAPI `1.0.0`, blob SHA `aca8089456f97773e5989d7e01218d0d28b81b29`. Revalidar essa revisão com o proprietário antes de codificar; o contrato conhecido aceita Supabase Auth e expõe `/api/v1/me`, mas não documenta o ator Gymkhana nem o lifecycle/upsert de membros.

| Área | Contrato a aprovar com .NET/APYM | Regra de segurança |
|---|---|---|
| Identidade | Fluxo de link que prova sessão NextAuth recente e autenticação Supabase real; endpoint `/me` valida token Supabase e memberships; formato e revogação de `ApymIdentityLink`. | Sem equivalência por e-mail, JWT Supabase fabricado, senha Supabase coletada pelo BFF ou service key como ator. Link global 1:1 conforme identidade `User` atual; revogação precisa interromper emissão. |
| Assertion | Segundo bearer scheme `GymkhanaActor`, issuer próprio configurado, audience fixa `apym-api`, JWKS HTTPS/`kid`, ES256 ou RS256 restrito, `sub` Supabase, `act.sub` Gymkhana para auditoria, `jti`, tempo máximo proposto de 2 minutos, rotação, clock skew, revogação e política de replay. | .NET mantém esquema Supabase existente para Flutter. `act` e papel Gymkhana não são autoridade APYM. `jti` sozinho não impede replay; exigir idempotency key e definir se é necessário replay cache. |
| Tenant | Definir provisionamento/ativação de tenant, operação autorizada para associar `Gym.id` ao `tenantId`, estados/suspensão e resposta de membership por request. | Browser não escolhe tenant sem validação; `X-Tenant-Id` deriva de mapeamento persistido Gym→tenant e .NET confere membership/estado em cada chamada. Assertion de ator não recebe platform-admin. |
| Papel de academia | Alinhar `OWNER`/`ADMIN` da conta Gymkhana com autoridade APYM e definir mapping explícito, se aplicável, para `MANAGER`/`TRAINER`/`RECEPTION`. Declarar revogação/alteração e cache TTL. | Mapeamento Gymkhana não concede poder que o principal APYM não possui. .NET continua autoridade para tenant, papel e permissões publicadas. Mudança/revogação deve propagar sem cache de longa duração. |
| Professor-aluno | Confirmar se APYM possui sua própria tabela de atribuição/delegação e qual combinação identifica treinador/aluno/tenant, janela, estado e revogação. Especificar endpoint/response para validar delegação por prescrição. | Atribuição local `TRAINER` é necessária, mas insuficiente. Deve existir delegação APYM ativa para aquele aluno/tenant. Negar por padrão em ausência/timeout/conflito; não listar outros alunos. |
| Membro e idempotência | Especificar se `memberId` APYM já existe ou é criado; endpoint idempotente para ligar referência externa opaca `Member.id` string a UUID APYM; `Idempotency-Key`, conflitos e códigos/respostas `401/403/404/409`. | Nunca converter ID string em UUID; unicidade dos dois lados; impedir remapeamento silencioso; definir exclusão, merge e reconciliação. |
| Auditoria/erros | Definir correlation ID, campos auditáveis (`iss`, `sub`, `act.sub`, tenant, ação, `jti`) e formatos de erro sem PII/token. | Não registrar bearer, chave ou snapshot pessoal. Diferenciar retryável de não-retryável e preservar idempotência. |

O contrato atual também exige decisão sobre criação de tenant: o endpoint de administração conhecido requer contexto platform-admin; um gestor de academia Gymkhana não deve receber essa autoridade por inferência. O proprietário da API precisa escolher fluxo administrado pelo APYM ou operação restrita adicional.

## 5. Plano de migration e rollback

### Migrations planejadas (separadas)

1. **M1 — `GymStaffAssignment`:** migration aditiva já proposta no worktree. Enum, tabela, auditoria, FKs compostas para membership e gym, índices normais e índice único parcial para `(userId,gymId)` com `isActive=true`. Sem backfill/default de função. Aplicar inicialmente somente em banco de teste restaurado de snapshot aprovado.
2. **M2 — mapeamentos APYM:** proposta separada após contrato: `ApymGymTenantMapping` (Gym ↔ tenant UUID); `ApymMemberMapping` (ID local string ↔ member UUID APYM); `ApymIdentityLink` (User local ↔ Supabase UUID, link/revogação verificada). Unicidade dos dois lados e unicidade parcial de links ativos; FKs `Restrict`; estados explícitos. Não incluir dados em migration nem gerar UUIDs sintéticos.
3. **M3 — opcional, só após PoC:** índices/constraints ou campos adicionais demonstrados como necessários pelo contrato vigente. Não antecipar integração real no schema.

### Aplicação controlada

1. Congelar SHA do código/schema, validar backup restaurável e destino staging por host/database em canal seguro; credencial de migration separada da credencial read-only do censo.
2. Executar primeiro restore de snapshot isolado; testar M1 sem backfill e verificar FK/index/índice parcial, `EXPLAIN` dos lookups, bloqueios e tempo.
3. Validar integridade: gym/account composto, membership/conta composto, uma atribuição ativa no máximo, desativação histórica preservada, transação de troca e concorrência.
4. Aplicar em staging somente com aprovação explícita, monitorar duração e lock; executar processo de confirmação manual e amostra de login por duas academias.
5. M2 só depois da aprovação do contrato, com fixture de tenant/member/identidade APYM aprovado e testes idempotentes. Não executar G2, backfill, integração ou deploy por esta autorização de preparação.

### Rollback

- **Rollback de aplicação antes da migration:** voltar versão do app sem tocar banco.
- **Após migration aditiva, antes de backfill:** primeiro reverter aplicação para versão compatível, mantendo tabelas/enum vazios. Não é necessário apagar schema para parar o uso.
- **Após atribuições/backfill:** reverter código mantendo linhas e auditoria; desligar capabilities de STAFF se houver inconsistência. Nunca restaurar autorização por `User.isTrainer` ou `User.role` legado.
- **Remoção física:** somente em janela aprovada e após backup/verificação de zero dependências e export auditável; dropar M2 antes de M1 por ordem de dependência. Uma migration destrutiva de rollback não é automática, não se executa durante rollback de app e exige aprovação separada.
- **Rollback parcial:** preservar identidade/mapping já verificado e marcar estado suspenso/revogado em vez de apagar vínculo, se o contrato exigir trilha. Resolver inconsistências manualmente, fail closed.

## Riscos, dependências e decisões pendentes

1. **Bloqueador do censo:** falta endpoint/configuração/snapshot read-only de staging. Sem isso não há contagem, proposta baseada em indivíduos nem confirmação de impacto.
2. **Contrato privado desatualizável:** confirmar acesso de leitura, SHA OpenAPI corrente e owner técnico APYM; definir operações não existentes (tenant provisioning, actor bearer, member link, delegação professor-aluno).
3. **Autoridade de gestão:** confirmar quais pessoas podem aprovar atribuições `MANAGER`; não inferir de role global, `isTrainer`, comissão ou nome/e-mail.
4. **Memberships incompletas:** há que decidir processo para STAFF sem membership ativa, múltiplas contas, conta suspensa e identidade global compartilhada; não corrigir por script automático.
5. **Jobs globais:** manter allowlist de jobs plataforma, limitar credenciais e alertar falha; separar execução tenant-scoped se trabalhos web passarem a invocar as mesmas funções.
6. **Helpers sem tenant no parâmetro:** antes de expor `getCurrentMembership`, `hasActiveMembership`, `getMemberWithCurrentStatus`, `deleteDuplicatePayment` ou estatísticas globais a APIs, mudar assinatura para receber contexto validado e consultar `(id,gymId)`. Os call sites encontrados hoje são service/adapter, job, ou não têm consumer; revalidar na fase de implementação.
7. **Ausência de prova dinâmica:** os 45 foram revistos estaticamente. O teste cross-gym multi-academia já existe na fase 1, mas não substitui teste de censo/handlers contra snapshot restaurado e fixtures isoladas.

## Critérios de aceite da próxima etapa

- Censo de staging executado com conexão read-only confirmada; relatório contém contagens, discrepâncias e nenhuma PII.
- Toda atribuição proposta é revisada por gestor identificado e tem motivo; zero `MANAGER`/`TRAINER` concedido apenas por regra automática ou legado.
- Lista das 45 consultas versionada com status por call site; helpers potencialmente reutilizáveis passam a exigir gym scope antes de qualquer exposição em rota.
- Contrato OpenAPI .NET corrente e decisão assinada pelo owner sobre identidade, issuer/audience/JWKS, tenant, funções, delegação, idempotência e member UUID lifecycle.
- M1/M2 aprovadas separadamente, ensaiadas num restore descartável; integridade e constraints conferidas; plano de rollback testado sem apagar registros.
- Testes de duas academias e duas contas cobrem `TRAINER` em A/`RECEPTION` em B, não delegado, delegated, revogado, tenant divergente, membership inativa e identidade APYM revogada.
- Gates CI e auditoria de tenancy aprovados; revisão manual documentada de todos os novos callsites; nenhum dado de produção alterado.
- Aprovação explícita para cada operação posterior: migration em staging, backfill, deploy/cutover e eventual ambiente de produção.

**Conclusão:** revisão estática, desenho de contratos e plano de migrations/rollback preparados. Censo real aguarda acesso read-only de staging. Nenhuma operação de dados ou integração foi executada.
