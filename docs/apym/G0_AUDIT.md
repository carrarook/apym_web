# G0 — Auditoria do fork APYM / Gymkhana

**Data:** 16/11/2026
**Escopo:** auditoria estática do checkout e gates locais; nenhum banco, ambiente de produção ou dado real foi acessado.
**Resultado em G0:** diagnóstico concluído; G1/G2 ainda aguardavam aprovação naquele momento. A execução aprovada de G1 está registrada em `G1_REPORT.md`.

## 1. Proveniência do checkout

| Item | Evidência observada |
|---|---|
| Repositório de trabalho | `carrarook/apym_web` (remote `origin`) |
| Branch | `main`, acompanhando `origin/main` |
| HEAD | `8197e4434fe152abb383ebc46c176e12aea06f10` |
| Commit | `chore: ignore workspace mockups directory (#19)`, datado de 2026-07-14 |
| Upstream Gymkhana verificado | `gymkhana-fitness-360/gymkhana` `HEAD`/`main` apontava para o mesmo SHA no momento da auditoria |
| Versão declarada | `0.2.0` em `package.json`; `git describe --tags` não encontrou tag aplicável |
| Stack declarada | Next.js `16.1.6`, React `19.2.3`, TypeScript `5`, Prisma `6.19.2`, PostgreSQL; Node `>=24`, npm `>=10` |
| Licença | Apache-2.0; `LICENSE` e `NOTICE` presentes |
| Estado inicial do Git | `main...origin/main`; o diretório `apym_web_wiki/` estava não rastreado no repositório de aplicação antes desta auditoria |

O upstream não está configurado como remote local; a comparação de SHA foi feita consultando diretamente a referência pública do repositório Gymkhana. O `origin/main` do fork e o upstream estavam no mesmo commit, então este checkout não apresentava commits APYM divergentes do upstream nessa data.

## 2. Fonte de arquitetura consultada

O caminho solicitado (`apym_web_wiki/APYM_GYMKHANA_CODEX_WIKI.md`) **não existe neste checkout**. Em conformidade com `apym_web_wiki/AGENTS.md`, foram lidos integralmente `README.md`, `CODEX_START_HERE.md` e todos os documentos em `apym_web_wiki/docs/apym/` (`01` a `11` e `REFERENCE_FULL.md`). Este relatório registra a ausência do consolidado literal; usou os documentos modulares como fonte, sem alterar decisões.

Invariantes aplicados nesta auditoria:

- Operações de negócio originadas no Flutter passam pelo middleware APYM .NET.
- O Gymkhana Web pode usar o backend Gymkhana para administração; publicação de prescrição APYM precisa de validação no middleware.
- Não tratar `gymId` como `tenantId`, nem associar usuários Supabase e NextAuth apenas pelo e-mail.
- Autorização precisa validar ator, academia e aluno no servidor; uma service key não comprova aprovação humana.
- Sem mudança de funcionalidade, contrato APYM, schema, migration, seed ou deploy em G0.

## 3. Arquitetura e mapa do código real

O checkout é um monólito modular Next.js App Router. Na contagem do checkout há **49 arquivos `page.tsx` em `src/app`**, **169 `route.ts` em `src/app/api`** e **37 diretórios de domínio** em `src/domains`.

| Área | Implementação observada | Evidência principal |
|---|---|---|
| Interface web | App Router com login, signup, dashboard, membros, pagamentos, presenças, finanças, classes, staff/trainers e área de membro | `src/app/**/page.tsx`, `src/components/app-sidebar.tsx` |
| APIs | Route handlers organizados em rotas HTTP e delegação parcial para handlers/domínios; OpenAPI local do Gymkhana tem 191 paths | `src/app/api/**/route.ts`, `openapi/openapi.json` |
| Domínios | Módulos para `identity`, `tenancy`, `members`, `memberships`, `payments`, `fitness`, `staff`, `attendance`, `billing` e outros | `src/domains/*` |
| Persistência | Prisma Client e migrations SQL versionadas; PostgreSQL é o datasource | `prisma/schema.prisma`, `prisma/migrations/*` |
| Contexto multiacademia | `Account` agrupa uma ou mais `Gym`; seleção de conta/academia vem de sessão + associação consultada no banco | `src/lib/account-scope.ts`, `src/lib/gym-scope.ts`, `src/lib/api/gym-context.ts` |
| Auth de usuário web | NextAuth v5, sessão JWT, Credentials e OAuth Google/GitHub opcionais; middleware exige sessão para rotas classificadas como `SESSION` | `src/lib/auth.ts`, `src/middleware.ts`, `src/lib/security/api-auth-classes.ts` |
| Auth de API integradora Gymkhana | Há classes `API_KEY` para `/api/v1` e `OAUTH_BEARER` para agent/MCP; isso é infraestrutura Gymkhana, não integração APYM | `src/lib/security/api-auth-classes.ts`, `src/app/api/v1/*`, `src/app/api/oauth/*` |
| Supabase | SDKs e helpers de cliente Supabase existem, inclusive service client; o fluxo de login observado continua em NextAuth | `src/lib/supabase/server.ts`, `src/lib/supabase/service.ts`, `src/lib/auth.ts` |

O `openapi/openapi.json` é a API do próprio Gymkhana. Não foi encontrada rota, variável de configuração, adapter ou modelo APYM/.NET/`tenantId` no código de aplicação nesta auditoria. Não confundir a API REST v1 Gymkhana autenticada por `x-api-key` com o contrato APYM.

## 4. Prisma: identidade, academia e dados de negócio

O schema contém, entre outros, `Account`, `AccountMembership`, `Gym`, `User`, `UserAuthProvider`, `Member`, `Membership`, `Payment`, `Plan`, `TrainerClient`, `Workout` e `WorkoutExercise`.

- `Account` possui vários `Gym`; cada `Gym` tem `accountId` e ID UUID. Este ID não é um `tenantId` APYM.
- `AccountMembership` liga usuário e conta com `OWNER`, `ADMIN` ou `STAFF`, além de `isActive`.
- O enum legado `Role` tem somente `ADMIN` e `SUB_ADMIN`; `User.isTrainer` é booleano, não um papel de professor com permissões próprias.
- `Member`, `Membership`, `Payment`, `Workout` e diversas entidades operacionais incluem `gymId`.
- `TrainerClient` registra `gymId`, `trainerId`, `memberId` e `isActive`; é uma base de relacionamento existente, porém não equivale por si só à autorização de prescrição.
- `Workout` e `WorkoutExercise` armazenam nome, data, duração/calorias/notas e exercícios com séries/repetições/carga/descanso. Não há modelo separado de catálogo de exercícios, rascunho prescritivo, versão publicada, aprovação, autorização de adaptação, revogação ou sessão de execução offline.
- `DietPlanAssignment` é atribuição de plano alimentar, não motor de prescrição de exercício.
- A auditoria não aplicou migrations, gerou seeds ou conectou-se ao banco.

## 5. Autenticação e autorização

### Sessão atual

`src/lib/auth.ts` implementa NextAuth com JWT e atualização periódica do estado `isActive`. Login por senha busca usuário no Prisma; OAuth pode provisionar conta/academia. `src/middleware.ts` valida JWT na borda para rotas `SESSION`, mas a própria classe de rota exige que cada handler faça suas autorizações adicionais.

### Papéis atuais vs. APYM

O RBAC atual reconhece permissões de membros, pagamentos, renovações, lembretes, relatórios e WhatsApp. `OWNER`/`ADMIN` da conta recebem conjunto amplo; `STAFF` recebe permissões de leitura definidas em `src/lib/rbac/account-roles.ts`. Não há papéis APYM explícitos de gestor, professor responsável, professor adicional, recepção e admin da plataforma com a matriz de escopo da wiki.

Há dois mecanismos de papel (`User.role` legado e `AccountMembership.role`). `requirePermission` só aplica o papel da conta quando o chamador lhe entrega `accountMemberRole`; a assinatura permite omiti-lo e então usa `session.user.role`. Essa diferença deve ser resolvida e testada antes de usar as permissões existentes como matriz APYM.

### Observações de segurança da identidade

- `src/lib/auth.ts` ativa `allowDangerousEmailAccountLinking` para provedores OAuth configurados.
- `src/lib/auth/oauth-users.ts` procura usuário existente pelo e-mail normalizado e cria `UserAuthProvider` para o usuário encontrado. O fluxo inspecionado não exige/verifica explicitamente `email_verified` antes desse vínculo.
- Isso é incompatível com usar e-mail sozinho para vincular NextAuth, Supabase Auth e identidade APYM. Não prova exploração em runtime, mas é um bloqueio de desenho para delegação até definir uma associação verificada.
- Helpers Supabase usam cookies/anon key ou service role, mas não há evidência de Supabase Auth participando do callback/session principal do NextAuth.

## 6. Isolamento entre academias

O caminho normal de contexto resolve a conta autorizada por `AccountMembership`/`User.accountId` e, em seguida, lista/resolve academias dessa conta. Um `gymId` vindo de header/cookie é tratado como preferência e aceito apenas se estiver na lista de academias acessíveis. Rotas de membros/treinos também verificam `memberId` + `gymId` antes da consulta. Isso é uma base reaproveitável para isolamento de academia.

O gate `npm run audit:tenant-scope:p0` terminou com exit code **0**, mas encontrou **47 leituras Prisma candidatas a não terem escopo**. O número é saída de análise estática conservadora, não 47 vazamentos confirmados: parte das consultas é global/de identidade e outras usam helpers/contexto que o scanner não reconhece. O gate P0 cobre uma lista menor e passou; a lista completa ainda precisa de revisão por domínio antes de afirmar isolamento total para o APYM.

### Lacuna concreta em treinos

`src/domains/fitness/handlers/workout-crud.ts` valida sessão, permissão genérica de membro, `gymId` acessível e se o membro pertence à academia. Contudo, não consulta `TrainerClient` nem valida que o professor atual foi delegado para aquele aluno. A permissão usada é `canEditMembers`, não uma autorização de prescrição. O modelo e o handler atuais não atendem ao requisito APYM de validar professor + academia + aluno.

## 7. Treinos: reaproveitamento e limites

Há tela `/dashboard/workouts`, endpoint `GET/POST/DELETE /api/workouts`, domínio `fitness` e tabelas Prisma para treinos/exercícios. A tela está orientada a visualizar atividade por aluno (“Workout Tracking”, duração, calorias e histórico); a API aceita exercício, séries, repetições, peso, descanso e notas.

**Reaproveitável:** layout da tela, seletor de aluno, apresentação de exercícios/séries e componentes de dashboard como ponto de partida para uma interface de edição.

**Personalização necessária:** vocabulário e jornada de professor; seleção de alunos delegados; política de tempo disponível; alternativas permitidas; estado/resultado de publicação; feedback no painel e menus/ações condicionados ao papel APYM.

**Novo no recorte APYM:** contrato adapter server-side Gymkhana → middleware, identidade/delegação verificável, publicação validada no .NET, versionamento imutável, aprovação explícita e vínculo de autorização à versão. Execução/offline/reconciliação continuam no middleware/Flutter conforme wiki, não são recursos encontrados neste checkout.

O uso de `Workout` como armazenamento de rascunho precisa de decisão: ele representa atividade/histórico hoje e não contém ciclo de publicação. Reutilizar diretamente economizaria estrutura, mas misturaria semânticas e não preservaria versão; separar o rascunho da entidade de atividade teria custo maior e fronteiras mais claras. Nenhuma opção foi implementada ou escolhida em G0.

## 8. Integração com middleware APYM .NET

| Item | Diagnóstico de G0 |
|---|---|
| Adaptador APYM no Gymkhana | Ausente no código inspecionado. |
| Endpoint/segredo APYM em configuração | Não encontrado em `.env.example`, `src` ou `package.json`. |
| `tenantId` APYM persistido/mapeado | Não encontrado no schema/código. `Gym.id` e `Account.id` não podem ser tratados como tenant. |
| Identidade Supabase ↔ usuário Gymkhana | Não há vínculo persistido observado; `UserAuthProvider` é para OAuth web e não é vínculo Supabase. |
| API Gymkhana local | Descrita no OpenAPI local; inclui CRUD do Gymkhana e `/workouts`, mas não contrato APYM. |
| OpenAPI APYM solicitado pela wiki | **Na execução de G0**, o repositório `carrarook/apym_api` não pôde ser lido: GitHub exigiu autenticação em `git ls-remote` e o caminho raw da especificação respondeu 404. O contrato foi disponibilizado por acesso de leitura durante G1; ver o adendo abaixo. |
| Eventos/webhooks | O código/spec e `docs/FEATURE_PARITY.md` marcam outbound webhooks como planejados; não presumir entrega de eventos existente. |

Antes de codificar chamadas G2, disponibilizar um checkout/arquivo OpenAPI atual ou acesso de leitura ao `apym_api`. Precisam ser consultados os esquemas e requisitos reais de autenticação, `X-Tenant-Id`, ator/delegação, idempotência, respostas/erros e rotas de publicação/consulta. Não foi criado endpoint fictício nem chamada de rede a ambiente APYM.

## 9. Classificação do que existe

| Classificação | Capacidades |
|---|---|
| **Reaproveitar** | Next.js App Router; layout/dashboard e componentes; cadastro de membro, memberships, planos, pagamentos e presença; hierarquia `Account → Gym`; seleção segura de academia na maior parte dos fluxos; login NextAuth se essa identidade for mantida; UI/shape básico de exercícios e séries; convenções dos domínios e gates de API. |
| **Personalizar** | Branding APYM, idioma/terminologia e navegação; separar experiência de gestor, professor e recepção; matriz de permissões e guardas no servidor; delegação professor-aluno; tela de treino atual para edição como interface de rascunho; configuração de regras por tempo e substituições; fluxo de identidade e vínculo entre sistemas; políticas de sincronização de dados operacionais. |
| **Desenvolver novo após decisões** | Modelo de vínculo `Account/Gym ↔ ApymTenant`; identidade/associação verificável Gymkhana–Supabase–APYM; adapter server-side .NET com prova do ator humano; publicação com versionamento/autorização/auditoria no middleware; interfaces de estado publicado e consulta de resultado; integração de membros/status/eventos se confirmada em G4. A persistência autoritativa de versões/sessões deve continuar no .NET conforme a arquitetura aprovada. |

## 10. Baseline executado

Ambiente inicial do shell: Node `18.19.1`/npm `9.2.0`, abaixo de `.nvmrc` (`24`) e `engines`. NVM foi usado para instalar/selecionar Node `24.18.0` (npm `11.16.0`); `npm ci` completou usando o lockfile, executou `prisma generate` e não alterou `package-lock.json`. A instalação informou 75 avisos de vulnerabilidade do conjunto instalado (6 low, 34 moderate, 28 high, 7 critical); `npm audit` não foi executado separadamente.

| Comando (Node 24.18.0) | Resultado real |
|---|---|
| `npm run typecheck` | **Falhou** com 3 erros: `src/app/api/trainers/commissions/route.ts:217` (`mutatingBodySchema` não encontrado); `src/app/dashboard/payments/page.tsx:218` (`payments` ausente no tipo `{}`, em dois usos); `src/app/dashboard/payments/page.tsx:374` (`logger` não encontrado). |
| `npm run lint` | **Passou**, 0 erros e 9 warnings `react-hooks/exhaustive-deps` em páginas de bills, challenges, member, payments, settings, trainers e workouts. |
| `npm run test:ci` | **Passou:** 24 suítes, 210 testes. O script exclui os caminhos `api-e2e`, `payment-edge-cases`, `payment-workflows-integration`, `plan-inference`, `payment-dedupe-clustering` e `whatsapp-import`. |
| `npm run audit:tenant-scope:p0` | **Passou** (exit 0); 47 achados potenciais no scanner, nenhum hit na lista que este gate classifica como regressão P0. |
| `npm run audit:mutating-zod` | **Passou:** “All mutating routes use Zod or domain handlers.” |
| `npm run openapi:check` | **Passou:** gerador escreveu 191 paths e verificação confirmou spec atualizado; `git status`/`git diff` não mostraram alteração de `openapi/openapi.json`. |
| E2E/browser e banco | **Não executados:** exigiriam subir aplicação/serviços e configuração local que não foram preparados; nenhuma conexão ou migration foi feita. |

Comandos de desenvolvimento declarados: `npm run dev`, `npm run dev:turbo`, `npm run build`; setup documentado em `docs/DEVELOPMENT.md` via `npm run fitness360:init` (este último não foi executado por envolver banco, migrations e seed).

## 11. Riscos e pendências que bloqueiam implementação segura

1. Entregar acesso ao OpenAPI atual do middleware APYM para conhecer contratos antes de escrever qualquer adapter.
2. Decidir identidade web: manter NextAuth com vínculo verificado para Supabase/APYM, ou adotar Supabase Auth também para web. Os custos são, respectivamente, menor migração inicial vs. identidade mais uniforme, mas com conversão de sessão/usuários maior.
3. Definir ownership e mapeamento idempotente de `Account`, `Gym`, usuário, membro e `tenantId`, inclusive quem cria o Gym e quando o tenant passa a ativo. Não fazer correspondência automática por e-mail.
4. Aprovar a matriz APYM e o modo de representar gestor, professor responsável/adicional e recepção; os papéis atuais não cobrem todos esses casos.
5. Resolver delegação server-side para publicação e fechar a lacuna de `TrainerClient` no fluxo de treino.
6. Escolher a fronteira entre rascunho Gymkhana e prescrição autoritativa .NET sem reaproveitar `Workout` como versão publicada por acidente.
7. Revisar manualmente os 47 achados de tenant-scope e definir destino dos 3 erros de typecheck antes de exigir gates verdes para G1.

## 12. Proposta para G1 e G2 — para aprovação

### G1 — Base do painel APYM

1. Validar a matriz de papéis APYM contra `AccountMembership`, `User.role`, `isTrainer` e `TrainerClient`.
2. Implementar menus e proteções server-side por escopo de conta, academia e aluno; demonstrar duas academias fictícias e negar acesso cruzado.
3. Aplicar branding/navegação APYM reutilizando o layout atual.
4. Decidir e implementar o vínculo persistente/verificável entre Gymkhana e tenant APYM somente após definir ownership e contrato.
5. Sair de G1 com testes negativos por papel e academia e com baseline TypeScript resolvido ou explicitamente acompanhado.

**Alternativa de identidade a escolher:** (A) manter NextAuth no painel, acrescentando associação verificável com identidades APYM/Supabase; reduz migração, mas exige um mecanismo explícito de prova de identidade/ator para o middleware. (B) usar Supabase Auth também no painel; aproxima a identidade web/mobile e simplifica a validação de tokens no .NET, mas exige plano de migração de sessão e contas existentes. Não recomendo escolher apenas com base no e-mail.

### G2 — Prescrição ponta a ponta

1. Primeiro ler o OpenAPI APYM real e fechar payloads, autenticação, idempotência e erros.
2. Definir interface de rascunho do professor no Gymkhana e validar professor→academia→aluno no servidor.
3. Criar adapter exclusivamente server-side, transmitindo identidade/delegação verificável; sem token de serviço no browser e sem Flutter→Gymkhana.
4. Enviar publicação ao middleware; este valida e persiste versão, aprovações e autorizações. Gymkhana mostra o ID/versão/estado devolvido.
5. Demonstrar com dados fictícios: professor autorizado publica, professor não delegado/recepção/outro tenant recebe negação; a prescrição publicada é consultável pelo Flutter via middleware.

**Escolha de persistência do rascunho:** (A) estender `Workout` reaproveita a forma atual, mas mistura registro de atividade e prescrição; (B) separar rascunho de treino de atividade mantém semânticas mais claras, com implementação maior. A decisão deve preservar que versões publicadas e autorizações são do middleware.

**Estado no encerramento de G0:** era necessária aprovação da alternativa de identidade, do desenho de rascunhos e acesso ao contrato; G1 ainda não havia iniciado. A aprovação e o acesso obtidos depois estão documentados no relatório G1.

## Adendo G1 — confirmação posterior do contrato e tenancy

Este adendo preserva o estado histórico de G0 e registra fatos verificados depois da aprovação de G1.

- O arquivo privado `carrarook/apym_api/api/openapi/v1.json`, branch `main`, foi lido em G1. Blob SHA consultado: `aca8089456f97773e5989d7e01218d0d28b81b29`; OpenAPI `1.0.0`. O contrato não foi copiado para este repositório.
- `GET /api/v1/me` identifica o usuário Supabase pelo JWT Bearer e lista associações ativas. Rotas de negócio usam JWT Bearer e `X-Tenant-Id`. Aceite de convite exige token e e-mail verificado.
- Criação de tenant: `POST /api/v1/admin/tenants`; aceite de convite: `POST /api/v1/invitations/accept`. Publicação: `POST /api/v1/members/{memberId}/workouts`, com `X-Tenant-Id` UUID e `PublishWorkoutRequest` contendo `planId` UUID e `snapshot` JSON.
- O middleware valida JWT do Supabase. NextAuth mantém sessão própria no Gymkhana. O contrato consultado não expõe troca ou atestado de sessão NextAuth por JWT Supabase. A publicação permanece bloqueada até existir forma aprovada de transmitir a identidade do ator humano.
- `Member.id` no Gymkhana é string e o contrato APYM exige UUID; é necessário mapeamento explícito e idempotente. `Gym.id` não deve ser usado como `tenantId`.
- Reexecução de `scripts/audit-tenant-scope.mjs --json`: 47 candidatos, 0 hits no conjunto P0. A revisão estática por call site não confirmou leitura de dados de outra academia nesses resultados. A lista e suas evidências estão em `G1_REPORT.md`; isso não substitui testes de integração com tenants fictícios.
- Permanecem lacunas separadas dos 47 achados: `workout-crud` não valida `TrainerClient`; e `requirePermission` permite omitir `accountMemberRole`, usando então `session.user.role`. G1 também identificou e corrigiu o fallback que reabria uma `AccountMembership` inativa via `User.accountId`; a correção tem testes em `account-scope.test.ts`. O uso de papel legado nas rotas ainda precisa ser mapeado antes de guardas APYM server-side.

