# G1 — Relatório de estabilização e preparação do painel APYM

**Data:** 16/11/2026  
**Escopo:** estabilização do baseline, mapeamento inicial de perfis, branding inicial, revisão dos 47 candidatos do scanner de tenancy e desenho de identidade/rascunhos. Sem migration, alteração de banco, deploy ou chamadas ao middleware.

## Decisões aplicadas

- NextAuth continua sendo a autenticação do painel. A ligação verificada com Supabase Auth/APYM foi planejada, sem implementação definitiva.
- Perfis reaproveitam papéis existentes: `OWNER`/`ADMIN` → gestor; `STAFF` + `isTrainer=true` → professor; demais `STAFF` → recepção. A associação precisa ser ativa e específica da conta. `TrainerClient` ativo será exigido separadamente por aluno.
- Rascunhos de prescrição serão entidade separada da atividade `Workout`. A publicação, versões, autorizações, adaptações e revogações pertencem ao middleware .NET.
- O painel mantém o visual atual e usa o nome APYM por padrão. `NEXT_PUBLIC_APP_NAME` continua permitindo override de white-label.
- OpenAPI APYM foi lido em modo somente leitura. SHA e incompatibilidades estão registrados neste documento e no adendo G1 de `G0_AUDIT.md`.

## Alterações realizadas

1. **TypeScript baseline:** `src/app/api/trainers/commissions/route.ts` agora valida PATCH com schema Zod próprio e deixa de usar schema inexistente/`any`. `src/app/dashboard/payments/page.tsx` declara o formato SWR, restaura logger ausente, usa valores numéricos compatíveis com o DTO e encapsula callback de atualização.
2. **Validação de comissão:** adicionados `src/domains/trainers/commission-validation.ts` e teste unitário para ID obrigatório e `isPaid` opcional/booleano.
3. **Perfil APYM inicial:** `src/lib/apym/profiles.ts` classifica papel de conta ativa em gestor, professor ou recepção. O helper não concede permissão e não substitui verificações de membership, academia e aluno.
4. **Membership desativada:** `src/lib/account-scope.ts` não usa `User.accountId` legado para restaurar acesso à mesma conta quando a `AccountMembership` dessa conta está inativa. Compatibilidade legada permanece para contas sem registro correspondente; dois testes cobrem negação das rotas de fallback.
5. **Branding:** `APP_NAME` passa a ter `APYM` como default e a tela de login usa a configuração central. Nenhuma alteração foi feita em textos legais, marketing, conteúdo de assistência ou dados de negócio.
6. **Documentação:** `G0_AUDIT.md` recebeu adendo de acesso ao contrato e revisão de tenancy; este relatório registra evidências e proposta de G2.

## Revisão dos 47 achados do scanner

O comando `node scripts/audit-tenant-scope.mjs --json` em Node 24.18.0 reportou 47 candidatos. O scanner procura `gymId` em uma janela textual pequena e não compreende builders de `where`, autorização anterior, PK global ou jobs que iteram academias. A classificação cobre todos os 47 call sites:

| Grupo / call sites | Contagem | Classificação e evidência estática |
|---|---:|---|
| `src/app/api/public/book-trial/route.ts:26,64` | 2 | Busca pública por `Gym.publicBookSlug` único para resolver destino de trial; não lista nem retorna dados de outras academias. |
| `src/app/api/trainers/commissions/route.ts:68` | 1 | `where` é montado com `gymId` resolvido no contexto da rota e passado a `findMany`; falso positivo de construção indireta. |
| `src/domains/billing/handlers/list-bill-templates.ts:17` | 1 | `ReceiptTemplate` é catálogo global sem `gymId` no modelo; leitura autenticada de template compartilhado. |
| `src/domains/communications/adapters/prisma-reminder-log-queries.ts:83` | 1 | `legacyWhere` carrega `gymId` dinâmico antes da consulta. |
| `src/domains/expenses/adapters/prisma-expense-queries.ts:54,66` | 2 | `buildWhere` inicia por `gymId` e alimenta `findMany` e `groupBy`. |
| `src/domains/finance/handlers/salaries.ts:86,122,133` | 3 | O `where` inclui academia resolvida para listagem e agregações; consultas derivadas reutilizam o filtro. |
| `src/domains/identity/handlers/password-reset.ts:65` | 1 | Token de redefinição consultado por hash/validade, sem entidade de academia. |
| `src/domains/identity/handlers/signup.ts:23` | 1 | Busca global por identidade/e-mail antes de provisionar usuário; unicidade de identidade é global no schema. |
| `src/domains/members/adapters/prisma-member-queries.ts:162,183` | 2 | Filtro de academia é construído dinamicamente no adapter para ambas as consultas. |
| `src/domains/platform/cron-tasks.ts:93` | 1 | Job de plataforma lista academias para processamento global; processamento posterior ocorre por ID de academia. |
| `src/domains/platform/users/handlers/list-users.ts:46,96`; `src/domains/platform/users/handlers/user-crud.ts:53,84,88,136` | 6 | Listagem deriva IDs de usuários das associações à conta. Operações por ID/e-mail são globais e handlers validam escopo da conta antes de mutar/retornar usuário; contato/e-mail são únicos globais. |
| `src/domains/revenue-opportunities/service.ts:161` | 1 | Serviço global enumera academias e delega cada processamento com `gymId`. |
| `src/inngest/lifecycle-cron-functions.ts:18` | 1 | Cron enumera academias para executar tarefa por academia. |
| `src/lib/account-scope.ts:28,47,52,62,90,96`; `src/lib/account-user-scope.ts:13,17` | 8 | Consultas de identidade, membership e conta para resolver/validar escopo; não são leituras de membros/pagamentos sem academia. G1 corrigiu fallback que reabria membership inativa; veja teste `account-scope.test.ts`. |
| `src/lib/auth/oauth-users.ts:20,30`; `src/lib/auth/provision-owner.ts:72`; `src/lib/auth.ts:203` | 4 | Leituras globais de provedor/usuário para autenticação e provisionamento. Vínculo OAuth por e-mail exige revisão de `email_verified` e não pode servir de vínculo APYM. |
| `src/lib/cron/job-tracker.ts:13` | 1 | Lock/registro global por nome de job para coordenar cron, não dado de academia. |
| `src/lib/member-protection.ts:219,244` | 2 | Utilitários globais de proteção/estatística e busca por ID global de membro; pesquisa de chamadas não encontrou consumidor em rota de negócio. |
| `src/lib/oauth/clients.ts:70` | 1 | Busca de credencial OAuth por `clientId` globalmente único; autorização de escopo ocorre separadamente. |
| `src/lib/services/member.service.ts:197,247` | 2 | Adapter passa filtro de academia construído dinamicamente. |
| `src/lib/services/membership.service.ts:227,240` | 2 | Helpers consultam `memberId` globalmente único; não foi localizado chamador de rota/APYM. Exigir prova de academia se entrada não confiável chegar a esses helpers. |
| `src/lib/services/payment.service.ts:352` | 1 | Método utilitário busca por PK; não foi localizado chamador de produção. Rota de exclusão vigente usa handler `id` + `gymId`. |
| `src/lib/services/status-updater.service.ts:91,114,152` | 3 | Serviço global percorre memberships por estado e IDs globais; não foi identificada chamada web sem contexto de job. Se usado em request, escopo de academia é obrigatório. |
| **Total** | **47** | **0 hits P0 no gate. Nenhuma leitura cross-gym foi confirmada estaticamente nesses candidatos.** |

Este resultado não prova ausência de vulnerabilidade em runtime. A revisão foi estática e não executou casos com duas academias; G2 precisa incluir testes negativos de escopo.

## Riscos e bloqueios encontrados

1. **Token incompatível:** o middleware APYM valida JWT Supabase; JWT de sessão NextAuth não é aceito. O OpenAPI consultado não fornece token exchange/delegação. Não enviar chamada como service account que apague o ator humano. É necessário contrato aprovado para obter/atestar identidade do usuário.
2. **IDs incompatíveis:** Gymkhana `Member.id` é string; APYM recebe UUID `memberId`. Definir mapa estável e idempotente antes de publicação. `Gym.id`, `Account.id` e `tenantId` são distintos.
3. **Delegação de treino:** `workout-crud` valida academia e membro, mas não valida `TrainerClient` ativo do professor. Nenhuma publicação APYM pode depender desse handler até haver autorização por professor + academia + aluno.
4. **RBAC legado:** `requirePermission` permite omitir `accountMemberRole`; então usa `session.user.role`, que pode divergir do papel ativo da conta. É necessário mapear rotas e exigir papel ativo antes de usar essas guardas para autorização APYM.
5. **Compatibilidade de membership:** G1 fechou o fallback para reativar a mesma conta por `User.accountId` se sua `AccountMembership` está inativa. O fallback legado continua para contas sem associação correspondente.
6. **Contrato sem snapshot local:** OpenAPI privado foi consultado em branch `main`, versão `1.0.0`, blob SHA `aca8089456f97773e5989d7e01218d0d28b81b29`. Não foi versionado neste fork; repetir implementação exige verificar SHA atual.

O classificador de perfis ainda não está ligado à navegação nem a guardas de API. Isso foi mantido como pendência: aplicar apenas ocultação de menus não provaria autorização server-side, e o RBAC legado precisa ser consolidado com o papel ativo antes de liberar operações diferentes para professor e recepção. Nenhum endpoint de negócio recebeu autorização nova nesta entrega.

## Identidade e tenancy — desenho preparado

- NextAuth permanece como login e sessão do painel. Não equiparar e-mail a identidade APYM.
- Definir vínculo explícito entre `User.id`, Supabase `sub` UUID, associação APYM e `Account`/`Gym`, após prova verificada dos dois lados.
- `/api/v1/me` pode confirmar memberships Supabase ativos depois da obtenção segura de JWT Supabase. Conta/academia Gymkhana serão resolvidas do contexto local; `X-Tenant-Id` virá de mapa persistido e será revalidado, nunca de parâmetro do browser sem validação.
- Convite de owner requer o fluxo real documentado. Idempotência deve usar chave de associação/tenant e estado de provisionamento, com retry seguro sem tenants duplicados.
- G1 não cria colunas/tabelas e não vincula identidades automaticamente.

## Módulo de rascunhos — desenho preparado

- Persistência de rascunho deve ser independente de `Workout` e `WorkoutExercise`, que continuam representando atividade/histórico.
- O rascunho deverá guardar academia local, aluno, autor, conteúdo editável, timestamps e estado local; retenção, exclusão e formato precisam de validação no G2.
- Reaproveitar componentes de `/dashboard/workouts` para exercícios e séries; a tela atual não é fonte autoritativa de prescrição APYM.
- Salvar/editar rascunho não publica. Publicação envia snapshot ao middleware, que retorna versão; autorização e histórico publicados ficam no .NET.
- Alterações a publicação exigem aprovação explícita do professor e preservação das versões.

Nenhum modelo, migration ou rota de prescrição foi criado nesta etapa.

## Proposta detalhada para G2 — aguarda aprovação

### G2.1 — Fechar contratos e identidade

1. Revalidar SHA da especificação e confirmar mudanças desde `aca8089`.
2. Obter do time APYM fluxo aprovado para JWT Supabase representar a pessoa autenticada no NextAuth, com expiração, audience, refresh, logout e revogação. Se não existir, especificar e aprovar contrato de exchange no middleware antes de codificar.
3. Definir mapa persistente `Gym` → `tenantId` e `Member.id` → UUID APYM, incluindo provisionamento, reconciliação, remoção e idempotência.
4. Resolver papel ativo e membership inativo; depois garantir que autorização server-side sempre use papel da conta validada.

**Gate:** nenhum token de serviço representa o professor; conta, academia, tenant e aluno não são inferidos de e-mail ou ID recebido do browser.

### G2.2 — Rascunho local de prescrição

1. Aprovar schema separado para rascunho (campos, relações Gym/Member/User, estado e exclusão) antes da migration.
2. Criar serviço e rotas server-side com RBAC e validação de `TrainerClient` ativo na mesma academia.
3. Adaptar UI de workouts como editor; cobrir gestor, professor delegado, professor não delegado, recepção, associação suspensa e tenant incorreto.
4. Não alterar `Workout` para armazenar prescrição.

### G2.3 — Publicação no middleware

1. Implementar adapter server-only com payload exato `planId` + `snapshot`, JWT Supabase atestado do usuário, `X-Tenant-Id` mapeado e UUID do aluno mapeado.
2. Implementar idempotência/retry e tratamento de 401, 403, 404, conflito e falha temporária; nunca registrar token ou snapshot pessoal em logs.
3. Registrar referência/versão/estado retornados pelo .NET no rascunho sem replicar autoria de versão ou autorização.
4. Demonstrar com tenants fictícios publicação permitida e negações para professor sem delegação, recepção, identidade removida e tenant errado. Flutter continua consumindo somente .NET.

**Aceite de G2:** fluxo ponta a ponta em ambiente de teste; payload conferido com OpenAPI vigente; testes server-side negativos de papel, delegação e tenant; nenhuma alteração de banco de produção.

## Evidências de validação

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | **Passou**, exit 0, sem erros. |
| Testes focados de validação de comissão, perfil e escopo | **Passaram:** 3 suítes, 9 testes. |
| `npm run test:ci -- --runInBand` | **Passou:** 27 suítes, 219 testes; inclui as 3 novas suítes. |
| `npm run lint` | **Passou**, 0 erros e 9 avisos preexistentes de `react-hooks/exhaustive-deps`. |
| `npm run audit:tenant-scope:p0` | **Passou**, exit 0; 47 achados candidatos, nenhum na lista P0. |
| `npm run audit:mutating-zod` | **Passou:** todas as rotas mutáveis usam Zod ou handlers de domínio. |
| `npm run openapi:check` | **Passou:** spec Gymkhana atualizada com 191 paths e sem diff pendente. |

Ambiente de verificação: Node `24.18.0`. Nenhum teste e2e/browser foi executado; nenhum banco foi conectado ou alterado.
