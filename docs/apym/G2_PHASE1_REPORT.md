# APYM G2 — Fase 1: segurança, identidade e mapeamentos

**Data:** 16/11/2026  
**Workspace:** branch `codex/apym-g2-phase1`, worktree isolada em `/home/bruno/fitness_saas/.worktrees/apym-g2-phase1`  
**Escopo:** RBAC server-side por academia, delegação de treinador, segurança OAuth, desenho de identidade e mapeamentos APYM. Nenhuma migration foi aplicada e nenhum banco foi conectado ou alterado.

## Resultado

Foi implementada autorização local por contexto validado de academia. NextAuth continua autenticando o painel; `AccountMembership` ativa é pré-requisito para acessar a conta; e usuários `STAFF` recebem papel operacional apenas por `GymStaffAssignment` ativo na academia selecionada. `User.isTrainer` e os papéis legados da sessão não concedem permissões de negócio. `OWNER`/`ADMIN` ativos da conta mantêm gestão das academias daquela conta, mas não recebem autoridade de plataforma.

Uma mesma identidade pode ser `TRAINER` na Academia A e `RECEPTION` na Academia B. Um treinador só lê os alunos e históricos cobertos por `TrainerClient` ativo e correspondente a treinador, aluno e academia; ser professor não concede acesso geral aos alunos. Ausência ou inconsistência de membership, atribuição, academia ou usuário resulta em negação.

## Alterações realizadas

- Adicionados resolver e contexto central de autorização em `src/lib/security/gym-authorization.ts`, capabilities em `src/lib/permissions.ts` e guardas centralizadas em `src/lib/rbac/`.
- Atualizados wrappers e operações de membros, presença, pagamentos, treinos, comissões e rotas administrativas para consumir autorização validada. Fallbacks de `session.user.role`, `User.accountId` e `isTrainer` não concedem acesso. Rotas de plataforma sem principal de operador negam acesso; `/api/health` mantém somente a resposta pública básica. O bypass legado de cron por sessão de administrador foi removido.
- Adicionadas operações de gestão de atribuições por academia: `GET/POST /api/gyms/[gymId]/staff` e `PATCH/DELETE /api/gyms/[gymId]/staff/[assignmentId]`. Só gestores ativos (`OWNER`/`ADMIN`) da conta podem gerenciar. A criação idempotente, troca e revogação preservam histórico e ator de auditoria. Alvos devem ser membros `STAFF` ativos da mesma conta.
- `/api/users` deixou de tratar `User.role` como papel operacional; cria/revoga membership e desativa atribuições correspondentes. Edição global de identidade compartilhada não é permitida por esta superfície.
- A tela de funcionários passou a selecionar academia e atribuir função operacional. A entrada de navegação “Employees” está visível para permitir que gestores cuja role global legada não seja `ADMIN` encontrem a página; a autorização continua no servidor.
- `cachedJson` define `private, no-store`, evitando reaproveitar no navegador uma resposta específica de usuário/academia após troca de contexto.
- Endurecido o login OAuth: removido auto-link inseguro por e-mail; providers já vinculados continuam funcionando; colisões de e-mail sem vínculo existente são negadas; provisionamento novo exige e-mail verificado pelo provider.
- Atualizado `openapi/openapi.json` para documentar as quatro operações de atribuição de staff.
- `isTrainer` permanece por compatibilidade em schema/DTO legado, mas a busca de autorização não o consulta.

## Schema e migration proposta — não aplicada

O schema Prisma contém o enum `GymStaffRole` (`MANAGER`, `TRAINER`, `RECEPTION`) e `GymStaffAssignment` com `userId`, `gymId`, `accountId`, `role`, `isActive`, datas e campos de auditoria (`assignedById`, `updatedById`, `deactivatedById`, `deactivatedAt`, `changeReason`). FKs compostas vinculam a atribuição à membership `[userId, accountId]` e à academia `[gymId, accountId]`. A chave primária existente de `Gym.id` permanece; `@@unique([id, accountId])` viabiliza a FK composta.

A migration proposta em `prisma/migrations/20261116000000_gym_staff_assignment/migration.sql` é aditiva: enum, tabela, índices e FKs. SQL cria índice único parcial que limita a uma atribuição ativa por usuário/academia, mantendo as inativas como histórico. Não há backfill automático nem default de função. O arquivo está no worktree, **não foi executado**.

**Precedência:** membership ativa é necessária. `OWNER`/`ADMIN` ativos têm capacidade de gestão das academias da própria conta, independentemente de atribuição operacional. `STAFF` precisa de uma atribuição ativa no `gymId` atual. Atribuição `MANAGER` dá gestão operacional naquela academia. `TrainerClient` é uma condição adicional para professor acessar um aluno.

**Migração futura:** primeiro fazer censo somente leitura em snapshot aprovado/staging de usuários, academias, memberships, `isTrainer`, `TrainerClient` e comissões. Gestores confirmam explicitamente cada `STAFF × academia`; os dados legados servem apenas de evidência e não determinam backfill. Aplicar migration aditiva somente após aprovação separada; inserir atribuições por fluxo auditável e habilitar acessos após validação. Sem atribuição, `STAFF` falha fechado. Em rollback, preservar dados e não restaurar permissões baseadas em `isTrainer`; desabilitar operações de STAFF afetadas se necessário.

## Identidade e mapeamentos APYM propostos

NextAuth continua como sessão web. O vínculo APYM deve ser feito por fluxo que autentica o usuário nas duas identidades, sem comparar e-mail para provar identidade e sem coletar senha Supabase. A rota de vínculo deve validar um access token Supabase real via `GET /api/v1/me`; só então registrar uma relação verificada entre `User.id` Gymkhana e `sub` Supabase. Tokens Supabase não devem ser expostos ao browser pelo BFF nem refresh tokens persistidos pelo Gymkhana.

Para chamadas futuras, proposta de assertion assinada pelo Gymkhana com chave assimétrica própria (ES256 ou RS256), issuer configurado, audience fixa `apym-api`, `sub` Supabase validado, `act.sub` Gymkhana para auditoria, `kid`, `iat/nbf/exp` e `jti` aleatório único; duração máxima proposta de 2 minutos. JWKS publica apenas chaves. O tenant, papel e autorização continuam verificados pelo .NET em cada operação. `jti` correlaciona auditoria e **não** impede replay sozinho.

Mapeamentos persistentes propostos, ainda sem migration: `ApymGymTenantMapping` (Gym local ↔ tenant UUID APYM, únicos nos dois lados, com estado); `ApymMemberMapping` (ID string opaco Gymkhana ↔ UUID APYM, único nos dois lados); `ApymIdentityLink` (User Gymkhana ↔ Supabase UUID, únicos entre links ativos e com revogação/auditoria). Nenhum UUID será derivado artificialmente de ID local. A proposta completa de campos e índices está em `docs/superpowers/specs/2026-11-16-apym-g2-phase1-design.md`.

### Contrato .NET requerido antes de integração

O contrato consultado na auditoria G1 foi `carrarook/apym_api/api/openapi/v1.json`, branch `main`, versão OpenAPI `1.0.0`, blob SHA `aca8089456f97773e5989d7e01218d0d28b81b29`; deve ser revalidado antes da implementação. Ele documenta autenticação Supabase e `/api/v1/me`, mas não o emissor Gymkhana, nem ciclo de vida de `memberId` ou vínculo idempotente de membro.

Antes de integração, o time APYM precisa aprovar: segundo esquema Bearer `GymkhanaActor` com issuer/audience/JWKS/algoritmos/revogação; política de rotas que preserve o esquema Supabase do Flutter; uso de `sub` como identidade autenticada e `act.sub` apenas para auditoria; membership/role/delegação tenant-scoped validadas no .NET; criação e ciclo de vida do tenant; e operação idempotente para associar `Member.id` string opaco ao `memberId` UUID, com respostas 401/403/404/409 e política de replay. Nenhum endpoint, payload ou integração definitiva foi presumido ou implementado; middleware .NET não foi alterado.

## Testes de autorização e isolamento

Foram adicionados testes negativos para sessão/papel sem contexto, membership ausente/inativa, papel operacional ausente, papel errado, academia/conta diferente, alvo de atribuição sem membership, treinador sem delegação, delegação para outro aluno/academia ou fora da janela ativa. O teste multi-academia usa a mesma identidade como `TRAINER` na Academia A e `RECEPTION` na Academia B e comprova que o papel e permissões não cruzam academias. Testes de rota de staff cobrem autorização de gestor, conta errada, idempotência e conflito de unicidade. Também há testes de cache privado e OAuth sem auto-link por e-mail.

## Evidências de validação

Verificações executadas no worktree após as alterações finais:

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | Passou, exit 0. |
| `npm run test:ci` | Passou: 34 suítes, 252 testes. O script exclui suítes de API E2E, workflows de pagamento, inferência de planos, clustering/dedupe de pagamentos e importação WhatsApp; não é validação E2E. |
| `npm run lint` | Passou, 0 erros; 9 avisos existentes `react-hooks/exhaustive-deps`. |
| `npm run audit:tenant-scope:p0` | Passou, exit 0; scanner listou 45 candidatos heurísticos e encontrou 0 correspondências na lista P0. Os 45 foram triados estaticamente; isso não prova ausência de falha runtime. |
| `npm run audit:mutating-zod` | Passou; rotas mutáveis usam Zod ou handlers de domínio. |
| `npm run openapi:check` | Passou; especificação atualizada, 193 paths. |
| `npx prisma validate` | Passou com URL local fictícia para validação estática; nenhuma conexão ou migration. Há aviso de depreciação da configuração Prisma em `package.json`. |
| `git diff --check` | Passou antes da geração deste relatório; repetir na checagem final. |

Os três erros TypeScript preexistentes foram corrigidos no G1; typecheck atual continua verde. Comparação com baseline: teste CI de 27 suítes/219 testes para 34/252. O lint mantém os mesmos nove avisos do baseline.

## Pendências e riscos

1. Não foi realizado censo de produção; a migration precisa de lista de atribuições confirmada e aprovação de execução. Usuários STAFF sem atribuição ficarão sem capacidade operacional após adoção das guardas.
2. O desenho da identidade Supabase e dos três mapeamentos ainda exige migrations e validação de negócio; não há vínculo de usuário nem chamadas APYM nesta fase.
3. O OpenAPI é privado e pode mudar; revalidar SHA e contrato com seu proprietário. A API atual não define `memberId` lifecycle nem upsert idempotente.
4. Não houve teste browser/E2E contra servidor real, banco, Supabase ou middleware. Testes unitários e estáticos não substituem esse ambiente.
5. O gate P0 passa, porém os 45 candidatos heurísticos não equivalem a prova de isolamento runtime; os críticos cobertos por testes foram verificados, e os demais precisam continuar sendo tratados conforme exposição.
6. Rotas de plataforma permanecem negadas até existir uma identidade de operador de plataforma separada. A navegação Employees é exibida amplamente; APIs e operações continuam protegidas server-side.

## Proposta para G2 — fase 2, sujeita a aprovação

1. **Censo e plano de cutover:** obter snapshot de staging aprovado; reconciliar memberships, usuários, academias, treinadores delegados, comissões e usuários sem atribuição; produzir CSV/revisão por gestor sem gravar dados automaticamente. Definir janela de ativação e rollback fail-closed.
2. **Aprovar e aplicar migrations em ambiente de teste:** `GymStaffAssignment` e depois, em migration separada, três mapeamentos APYM. Validar constraint parcial, FKs compostas, unicidade, remoção/revogação e restore. Nenhuma execução em produção sem autorização específica.
3. **Provisionamento manual/auditado de funções:** gestor confirma por academia; registrar ator, motivo, validade operacional e revisão das sugestões legadas. Testar duas academias, troca de papel, revogação e corridas concorrentes.
4. **Contrato de identidade e API .NET:** obter OpenAPI versionado e aprovação do time APYM para login duplo, vínculo verificado, segundo esquema bearer, JWKS/rotação, claims, expiração, revogação/replay, tenant e associação idempotente do membro. Alterações .NET permanecem em PR/repositório próprio e aguardam autorização do proprietário.
5. **PoC em staging, sem publicação de prescrição:** implementar o vínculo de identidade e tenant/membro apenas quando os contratos e migrations estiverem aprovados; validar chamadas a `/me`, token de ator e erros de tenant/identidade. Logs não incluem tokens ou dados sensíveis.
6. **Gate de encerramento:** testes negativos cross-account/cross-gym, professor sem `TrainerClient`, membership revogada, identity link revogado, tenant incorreto, retry idempotente, gates CI e revisão de segurança. Publicação e editor de prescrições continuam fora deste plano até aprovação própria.

**Estado:** G2 fase 1 concluída no worktree isolado; migration proposta não executada; aguarda aprovação para qualquer avanço à fase 2.
