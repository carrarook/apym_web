# APYM G2 Phase 1 — Segurança, identidade e mapeamentos

## Intenção

Preparar o painel Gymkhana para operar com perfis APYM e isolamento verificável, sem iniciar editor de prescrição, sincronização de dados, migration ou alteração do middleware .NET. A fase entrega autorização local e provas de teste; identidade federada e mapeamentos persistentes ficam especificados para aprovação posterior.

## Objetivos

- Usar NextAuth para a sessão web, `AccountMembership` ativa como vínculo obrigatório à conta e `GymStaffAssignment` como origem da função operacional por academia para usuários `STAFF`.
- Remover a autorização que deriva de `session.user.role` quando falta contexto de conta.
- Implementar políticas de gestor, professor e recepção nas operações atuais de membros, presença e pagamentos.
- Restringir acesso de professor a membros que tenham associação `TrainerClient` ativa na mesma academia.
- Provar negações por papel, delegação e academia com dados fictícios.
- Documentar um protocolo de ator Gymkhana separado de JWT Supabase, uma proposta de schema e as alterações necessárias no contrato .NET.

## Fora do escopo

- Criar, editar ou publicar rascunhos/prescrições.
- Integrar chamadas de negócio Gymkhana → APYM ou Flutter → Gymkhana.
- Alterar o repositório, banco ou contrato .NET nesta fase.
- Criar ou aplicar migration, gerar UUIDs artificiais ou usar secrets de produção.
- Tratar `Workout`/`WorkoutExercise` como prescrição; continuam sendo histórico/atividade.
- Criar perfil de administrador de plataforma. `User.role=ADMIN` não será considerado prova de autoridade global.

## Abordagens consideradas e escolhidas

### RBAC

1. **Guarda central com contexto ativo (escolhida):** resolver sessão, academia, conta, papel ativo e perfil em uma política central; operações recebem o contexto em vez de usar papel legado da sessão. Reduz divergências e permite fail-closed consistente. Exige atualizar os pontos atuais de autorização.
2. **Regras rota a rota:** menor alteração por rota, mas mantém guardas com semânticas diferentes e deixa espaço para omissões; rejeitada para APIs de negócio.

### Identidade Gymkhana → APYM

1. **JWT de ator Gymkhana com emissor próprio (escolhida para proposta):** após vínculo explícito e prova real da identidade Supabase, o servidor Gymkhana emite assertion de vida curta, assinada por chave assimétrica própria. O .NET aceita esse emissor adicional e continua verificando membership, tenant, papel e delegação em sua própria base. Não é um JWT Supabase e não usa credencial de serviço como ator.
2. **Guardar/renovar tokens Supabase reais:** preserva o validador atual do .NET, mas exige armazenar/rotacionar refresh tokens e controlar revogação no Gymkhana. Não escolhida.
3. **Migrar o login web para Supabase Auth:** reduz a ponte entre tokens, mas altera a autenticação e as contas do painel. Fora da decisão atual de manter NextAuth.

O usuário selecionou as opções 1 nas duas decisões em 16/11/2026. A aprovação deste documento ainda é necessária antes da implementação.

Continuam aprovadas as decisões de OAuth seguro, negar rotas globais a usuários comuns de academia e usar `jti` para auditoria na PoC sem tratá-lo como proteção contra replay.

## Modelo de perfil e permissões

O perfil é calculado para cada requisição usando academia ativa e conta autorizada:

| Condição de conta/academia | Condição de usuário | Perfil efetivo |
|---|---|---|
| `AccountMembership` ativa `OWNER` ou `ADMIN`, e Gym pertence à conta | usuário ativo | `manager` em todas as academias dessa conta; atribuição operacional não reduz essa autoridade |
| `AccountMembership` ativa `STAFF`, e atribuição ativa `MANAGER` para o Gym | usuário ativo | `manager` nessa academia |
| `AccountMembership` ativa `STAFF`, e atribuição ativa `TRAINER` para o Gym | usuário ativo | `trainer` nessa academia, com delegação `TrainerClient` por aluno |
| `AccountMembership` ativa `STAFF`, e atribuição ativa `RECEPTION` para o Gym | usuário ativo | `reception` nessa academia |
| membership ausente/inativa, atribuição ausente/inativa, usuário inativo ou Gym fora da conta | qualquer | negar |

**Precedência:** a membership ativa é pré-requisito de acesso à conta e define a autoridade de conta. `OWNER`/`ADMIN` permanecem gestores de todas as academias cuja `Gym.accountId` corresponda à conta; `GymStaffAssignment` não os rebaixa nem os torna operadores globais. Para `STAFF`, somente uma atribuição ativa para o `gymId` selecionado concede função operacional. Ausência de atribuição válida falha fechada. `User.role` no JWT, `User.accountId` legado e `User.isTrainer` não substituem membership nem atribuição para autorização de negócio.

O schema atual tem `AccountMembership @@unique([userId, accountId])`, `Gym.accountId`, `User.isActive` e `User.isTrainer`. A nova função é por academia: a mesma pessoa pode ser `TRAINER` na Academia A e `RECEPTION` na Academia B. `isTrainer` será preservado por compatibilidade, mas não será consultado por permissões APYM. Código legado que ainda use `isTrainer` para autorização ou seleção de treinadores precisa ser migrado ou isolado antes de considerar o RBAC concluído.

Matriz inicial coerente com `03-ROLES-PERMISSIONS.md`:

| Operação | Gestor | Professor | Recepção |
|---|---:|---:|---:|
| Consultar lista/detalhe de alunos | Sim | Somente alunos delegados | Sim, na academia ativa |
| Cadastrar matrícula/aluno | Sim | Não | Sim |
| Editar/excluir cadastro existente | Sim | Não | Não |
| Consultar presença/check-in | Sim | Não | Sim |
| Registrar check-in | Sim | Não | Sim |
| Consultar pagamentos | Sim | Não | Sim |
| Criar cobrança/pagamento operacional | Sim | Não | Sim |
| Editar/excluir pagamento existente, administrar staff, integrações ou marketplace | Sim | Não | Não |
| Publicar prescrição | Somente futuro endpoint + professor efetivo + delegação ativa | Somente futuro endpoint + delegação ativa | Não |

Novas permissões específicas (`canRegisterMembers`, `canViewAttendance`, `canManageAttendance`, `canCreatePayments`, `canViewAssignedMembers`, `canViewAssignedWorkouts`) evitam conceder a `STAFF` o significado amplo de `canEditMembers`/`canEditPayments`. `canEditMembers` e `canEditPayments` permanecem para gestores. `canPrescribeWorkouts` fica definido como capability futura, sem endpoint/rota nesta fase. A política de treinamento não será conectada aos mutators atuais de `Workout`, pois eles registram atividade e não prescrição.

Rotas de diagnóstico/administração global sem relação com academia não recebem autoridade por perfil Gymkhana. O inventário deve marcá-las como `platform-only` e negar acesso à sessão comum até haver uma identidade de operador de plataforma aprovada; não se usa `User.role=ADMIN` como substituto.

## Contexto e guardas server-side

Criar um resolver em `src/lib/security/gym-authorization.ts` (ou localização equivalente confirmada pelo plano) que produza contexto validado com `userId`, `gymId`, `accountId`, `accountMemberRole`, `gymStaffRole` e tipo de autenticação. O resolver:

1. Exige sessão NextAuth ativa.
2. Resolve academia da sessão por conta autorizada; header/cookie continuam sendo somente preferência validada.
3. Carrega `Gym.accountId`, `User.isActive`, membership ativa e, para `STAFF`, exatamente a atribuição ativa daquele `gymId`.
4. Nega papel ausente, membership suspensa, academia de outra conta ou usuário desativado. Não usa role recebido do browser, cookie, sessão JWT ou e-mail para decidir permissão.
5. Passa o contexto explícito à função de autorização. `requirePermission`/`hasPermission` sem papel/contexto falham fechado.

Não haverá fallback de autorização via `User.accountId` ou `User.role`: ausência de `AccountMembership` ativa nega acesso. Isso é uma mudança de compatibilidade deliberada e requer um censo antes da ativação para identificar usuários legados sem membership.

`userCanAccessGym` e os resolvers de conta/academia devem exigir `AccountMembership.isActive=true` para o par `userId + Gym.accountId`; `User.accountId` não reabre acesso quando a membership está ausente ou inativa. A atribuição ativa ainda precisa corresponder ao `gymId` exato para usuários `STAFF`.

`TrainerClient` só autoriza quando a linha corresponde simultaneamente a `trainerId`, `memberId`, `gymId`, `isActive=true`, `startDate <= now` e `endDate IS NULL OR endDate >= now`; o usuário precisa estar ativo e ter `GymStaffAssignment.role=TRAINER` ativa para o mesmo Gym. A associação e o membro são verificados na mesma academia. `OWNER`/`ADMIN` não ganham delegação implícita para prescrever.

No checkout atual não existe rota de prescrição. G2 fase 1 implementa e testa o primitivo de autorização por delegação e restringe leituras atuais de membros/alunos de professores; não haverá publicação nem teste HTTP de publicação até existir endpoint de prescrição em fase posterior.

## Rotas a migrar e comportamento

O inventário de implementação cobre todos os `requirePermission`, `adminOnly` e checks de `session.user.role` em rotas de negócio. Os arquivos/rotas identificados no checkout são:

- Superfície crítica de membros: `/api/members` GET/POST; `/api/members/[id]` GET/PUT/DELETE; `/api/members/photo` POST; `/api/members/photo/generate` POST; `/api/members/fix-date` POST.
- Presença e visitas: `/api/attendance` GET/POST; `/api/attendance/bootstrap` GET; `/api/attendance/bootstrap/secondary` GET; `/api/attendance/call-list` GET; `/api/attendance/qr` GET/POST; `/api/free-trial-visits` GET/POST; `/api/free-trial-visits/[id]` DELETE.
- Superfície crítica de pagamentos: `/api/payments` GET/POST; `/api/payments/[id]` PATCH/DELETE; `/api/payments/quick-entry` GET/POST; `/api/payments/sync-memberships` POST; `/api/payments/razorpay/create-link` POST; `/api/payments/deduplicate` POST; `/api/payments/fix-missing-memberships` POST.
- Treino/histórico: `/api/workouts` GET/POST/DELETE.
- Demais rotas hoje usando uma das guardas/checks localizados na busca estática: `/api/account-context` GET; `/api/accounts` GET/POST; `/api/admin/attendance/reassign-date` POST; `/api/admin/backdate-late-payments` POST; `/api/admin/fix-stale-overdue` POST; `/api/audit` GET; `/api/bills/[id]` GET/DELETE; `/api/commerce/products/[id]/marketplace-reference` GET/PATCH; `/api/custom-analytics` GET/POST; `/api/custom-entities` GET/POST; `/api/expenses/[id]` PUT/DELETE; `/api/gym-context` GET; `/api/gym/profile` GET/PUT; `/api/gyms` GET/POST; `/api/health/errors` GET/DELETE; `/api/leads/[id]` PATCH/DELETE; `/api/marketplace` GET; `/api/overdue/list` GET; `/api/plans` GET/POST; `/api/plans/[id]` PUT/DELETE; `/api/predictions/refresh` POST; `/api/salaries/[id]` PUT/DELETE; `/api/settings/notifications` GET/PUT; `/api/settings/session` GET/PUT; `/api/users` GET/POST; `/api/users/[id]` GET/PUT/DELETE; `/api/validate` POST; `/api/whatsapp/send` POST. As rotas chamadas por wrapper ou por helpers indiretos serão conferidas também; este inventário está baseado em `requirePermission`, `adminOnly`, `session.user.role`, `withProtectedRoute` e `createApiHandler` e não substitui a auditoria de cada handler.
- Rotas globais/platform-only: `/api/health/errors` GET/DELETE e `/api/health` GET (campos administrativos) e POST. O GET público de `/api/health` mantém apenas a resposta básica de disponibilidade. Não se infere autoridade de plataforma a partir de papel de academia.

O relatório G2 produzirá um inventário final por arquivo, verbo HTTP, capability, perfil permitido e tipo de escopo. Testes de handler cobrem cada verbo crítico de membros, presença, pagamentos e treino; uma tabela de teste liga as demais rotas de negócio migradas à guarda central. Operações sem concessão explícita serão somente para `manager` ou negadas.

Rotas para prova: listagem/detalhe de alunos deve filtrar por `TrainerClient` para professor; POST de matrícula, check-in e cobrança requerem as permissões operacionais respectivas; PUT/DELETE de aluno e update/delete de pagamento são apenas gestor. Recursos de outra conta retornam 404/403 sem revelar existência.

Os wrappers `createApiHandler` e `withProtectedRoute`, e guardas inline, não podem manter fallback para `session.user.role`. Auth OAuth/Gymkhana existentes não podem ser usados para vincular Supabase por e-mail. Risco observado em G0/G1 (`allowDangerousEmailAccountLinking` e `resolveOAuthUser` procurar usuário por e-mail) será fechado antes de emitir assertion APYM.

O fluxo NextAuth mantém acesso por provider já associado (`provider + providerUserId`). Se não houver vínculo por provider e o e-mail já pertencer a usuário Gymkhana, o callback recusa o login/vínculo; não cria associação por e-mail. Contas novas via OAuth só são provisionadas com e-mail verificado pelo provider (Google claim verificada; GitHub e-mail explicitamente verificado). Um fluxo explícito de vincular outros providers a conta existente fica fora da fase; usuários existentes continuam usando provider já associado ou Credentials.

## Vínculo de identidade proposto

### Cerimônia de vínculo

1. Usuário inicia o vínculo dentro de sessão NextAuth autenticada e recente.
2. Usuário autentica-se também na conta real de Supabase Auth através do fluxo oficial; Gymkhana não coleta senha Supabase. O access token real é enviado apenas para a rota de servidor de vínculo.
3. Gymkhana chama o `GET /api/v1/me` existente com esse Bearer token, valida sucesso e obtém `userId` UUID e memberships ativas. Não compara e-mail para decidir identidade; vínculo é global 1:1 (`User.id` único ↔ Supabase `sub` único), pois `User` é a identidade Gymkhana global e pode pertencer a várias contas.
4. Só grava o vínculo quando a identidade Supabase possui ao menos uma membership ativa e a identidade local NextAuth ainda está ativa. Para cada operação futura, o tenant da academia deve estar na resposta/membership atual do .NET. O registro fica imutável quanto aos identificadores; troca exige revogação e novo vínculo auditável.
5. A rota BFF não retorna access/refresh token ao browser nem persiste refresh token Supabase.

### Assertion de ator para chamadas futuras

Gymkhana só emite a assertion no servidor, após sessão, membership local, mapa `Gym→tenant`, mapa `Member→APYM` e link de identidade válidos. Proposta de claims mínimos:

```json
{
  "iss": "https://<host-configurado-do-apym-web>",
  "aud": "apym-api",
  "sub": "<Supabase Auth user UUID validado no vínculo>",
  "act": { "sub": "<Gymkhana User.id>" },
  "iat": 0,
  "nbf": 0,
  "exp": 0,
  "jti": "<id aleatório único>"
}
```

Assinar com ES256 ou RS256 usando chave privada de servidor, `kid`, expiração máxima proposta de 2 minutos e sem permissões/tenant definidos pelo cliente. A chave privada ficará em secret manager; uma rota JWKS pública fornece apenas chaves públicas. Rotação deve permitir sobreposição curta de `kid`. `X-Tenant-Id` segue obrigatório nos endpoints tenant-scoped; o .NET confere a membership ativa e a autorização local em cada operação. O .NET não confia em papel Gymkhana nem em `act` para aprovação de prescrição. `jti` identifica emissão e correlaciona logs, mas não impede replay sozinho; assertion bearer de curta duração pode ser reproduzida até `exp`. Mutations futuras exigem idempotency key e tratamento de retry; se APYM exigir uso único do JWT, adicionar replay-cache distribuído no .NET como requisito separado.

## Contrato necessário no middleware .NET (proposta, sem implementação)

Contrato atual consultado: `carrarook/apym_api/api/openapi/v1.json`, branch `main`, OpenAPI `1.0.0`, blob SHA `aca8089456f97773e5989d7e01218d0d28b81b29`. `SupabaseJwtAuthentication.cs` valida issuer/audience Supabase, expiração, chave e algoritmo ES256. `GET /api/v1/me` aceita access token Supabase. A API não aceita atualmente JWT Gymkhana. O contrato tem 18 paths e não contém CRUD/consulta de membros nem idempotency header declarado. `POST /api/v1/admin/tenants` cria tenant pendente e convite de owner e exige contexto platform-admin; o token do convite é de uso único. Não presumir que um gestor Gymkhana pode chamar essa operação.

Alterações .NET para uma fase de integração futura:

1. Adicionar um segundo esquema Bearer `GymkhanaActor`, sem enfraquecer o atual Supabase scheme: issuer configurado, audience fixa `apym-api`, assinatura ES256/RS256 restrita, JWKS HTTPS com cache e `kid`, lifetime, `sub` UUID e `jti` obrigatórios.
2. Aplicar política explícita por rota: preservar Supabase para Flutter/fluxo atual; aceitar `GymkhanaActor` somente em endpoints web aprovados. `sub` resolve o Supabase Auth user; tenant membership, role trainer/owner, estado do tenant e delegação são lidos no banco .NET por request.
3. Registrar `act.sub` como ator Gymkhana apenas para auditoria, nunca como autorização; logar `iss`, `sub`, `act.sub`, tenant, ação e `jti`, sem token.
4. Especificar operação idempotente de vínculo entre referência externa Gymkhana (`Gymkhana Member.id`, string opaca) e `memberId` APYM UUID. O OpenAPI atual não esclarece como `memberId` nasce nem se coincide com Auth user UUID; o time APYM precisa definir se o endpoint associa um member APYM já existente ou o cria a partir de referência externa. Não assumir igualdade nem converter string para UUID.
5. Documentar no OpenAPI respostas de 401/403/404/409, política de replay/revogação e headers usados. O código .NET permanece fora desta fase.

Para provisionamento do tenant, o .NET precisa definir se ele será criado por um administrador APYM ou por uma operação de integração restrita a um owner autenticado; não conceder à assertion de ator escopo de platform-admin. Para membros, o contrato precisa declarar o tipo/ciclo de vida de `memberId` e uma operação idempotente de link/upsert que aceite `Member.id` Gymkhana como referência opaca. O OpenAPI atual não permite descobrir nem criar esses vínculos.

## Proposta de schema para função por academia (não aplicar nesta fase)

O modelo atual já relaciona `Gym` a `Account` por `Gym.accountId`, e `AccountMembership` já garante unicidade de `[userId, accountId]`. A proposta registra a conta na atribuição para que o banco possa garantir que o usuário tem membership naquela conta e que a academia pertence à mesma conta. Isso exige adicionar uma chave única composta em `Gym` para ser alvo da FK composta; `Gym.id` continua sendo a chave primária.

```prisma
enum GymStaffRole {
  MANAGER
  TRAINER
  RECEPTION
}

model GymStaffAssignment {
  id               String       @id @default(cuid())
  userId           String
  gymId            String       @db.Uuid
  accountId        String       @db.Uuid
  role             GymStaffRole
  isActive         Boolean      @default(true)
  assignedById     String
  updatedById      String?
  deactivatedById  String?
  deactivatedAt    DateTime?
  changeReason     String?      @db.Text
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  AccountMembership AccountMembership @relation(fields: [userId, accountId], references: [userId, accountId], onDelete: Restrict)
  Gym              Gym          @relation(fields: [gymId, accountId], references: [id, accountId], onDelete: Restrict)
  AssignedBy       User         @relation("GymStaffAssignmentAssignedBy", fields: [assignedById], references: [id], onDelete: Restrict)
  UpdatedBy        User?        @relation("GymStaffAssignmentUpdatedBy", fields: [updatedById], references: [id], onDelete: Restrict)
  DeactivatedBy    User?        @relation("GymStaffAssignmentDeactivatedBy", fields: [deactivatedById], references: [id], onDelete: Restrict)

  @@index([accountId, gymId, isActive])
  @@index([userId, isActive])
}
```

Required inverse fields: `GymStaffAssignment[]` in `Gym` and `AccountMembership`; `Gym` adds `@@unique([id, accountId])` for the composite FK. `User` adds inverse relations named `GymStaffAssignmentsAssigned`, `GymStaffAssignmentsUpdated`, and `GymStaffAssignmentsDeactivated` for the three audit relations. The assignment's subject user is reached through `AccountMembership.User`; this avoids a redundant second FK for the same `userId`.

Prisma does not express a conditional unique constraint for only active rows. The migration therefore adds raw SQL:

```sql
CREATE UNIQUE INDEX "GymStaffAssignment_one_active_per_user_gym"
  ON "GymStaffAssignment" ("userId", "gymId")
  WHERE "isActive" = true;
```

O índice permite manter atribuições inativas como histórico e garante no máximo uma função ativa por usuário/academia. A troca é transacional: desativa a linha atual preenchendo `updatedById`, `deactivatedById`, `deactivatedAt` e motivo; depois cria a nova com `assignedById`. Uma repetição idempotente da mesma função ativa retorna o registro atual. Toda gravação exige membership ativa `OWNER`/`ADMIN` na conta da academia. A FK garante a existência da linha de membership; o resolver confere `AccountMembership.isActive` em cada requisição.

Compatibilidade Prisma verificada: o modelo acima, as relações inversas e `@@unique([id, accountId])` foram aplicados somente a uma cópia temporária do schema e `npx prisma validate` passou. A validação não conectou ao banco; o índice parcial é SQL de migration proposta e não foi executado.

`MANAGER` é uma atribuição para um membro `STAFF` com permissões de gestão operacional somente naquela academia. `OWNER`/`ADMIN` mantêm a gestão de toda a conta por `AccountMembership` e não precisam nem usam atribuição. Se o papel da conta mudar de `OWNER`/`ADMIN` para `STAFF`, o usuário perde o acesso operacional até que um gestor atribua uma função em cada academia.

## Migração e rollback propostos (sem execução)

1. **Censo somente leitura, antes de planejar o backfill:** em snapshot aprovado/ambiente de staging, contar usuários e gyms ativos, memberships por papel/estado, usuários com `User.accountId` sem `AccountMembership`, valores de `isTrainer`, vínculos `TrainerClient` ativos e referências em comissões. Não ler ou alterar produção nesta fase. O relatório deve identificar cada STAFF × gym e marcar sugestões (`isTrainer`, `TrainerClient`, comissões) como evidência para revisão, nunca como autorização automática.
2. **Pré-cadastro revisado:** gestores da conta confirmam manualmente a função de cada `STAFF` em cada academia. Preparar uma lista explícita de atribuições aprovadas com ator responsável e motivo; os registros só podem ser criados depois da migration, por fluxo auditado. Não criar papel automaticamente em todas as academias nem inferir `TRAINER` só de `isTrainer=true`.
3. **Migration aditiva:** adicionar enum/tabela, FKs/índices, chave composta em `Gym` e índice parcial; sem `UPDATE`, backfill ou default de papel. A coluna `User.isTrainer` permanece intacta para compatibilidade.
4. **Cutover de autorização:** gestores criam as atribuições revisadas usando o fluxo auditado; publicar guardas que exigem membership ativa e atribuição para `STAFF`. Usuários sem atribuição ficam sem acesso operacional até esse cadastro. Executar auditoria de atribuições duplicadas/inconsistentes e testes com duas academias antes de habilitar acesso de usuários.
5. **Revisão pós-cutover:** verificar contagens de atribuições, acessos negados esperados, logs de atribuição e rotas legadas ainda consultando `isTrainer`. Remover o uso de `isTrainer` em autorização, mantendo apenas compatibilidade de dados/contratos antigos.

O rollback da aplicação deve preservar a tabela e os registros novos; voltar a autorizar `STAFF` por `isTrainer` não é um rollback seguro. Em falha de cutover, desabilitar as operações de STAFF afetadas ou reverter apenas mudanças de interface enquanto o guard permanece fail-closed. A remoção do enum/tabela ou reversão destrutiva da migration exige backup, confirmação de que nenhum código usa as atribuições e aprovação separada. Esta proposta não executa nem agenda migration.

## Impactos previstos em rotas e interfaces

- O resolver de autorização deixa de carregar `isTrainer` como atributo de perfil e passa a buscar `GymStaffAssignment` por `userId + gymId + isActive`, validando a conta no vínculo. Os guards `/api/members`, `/api/attendance`, `/api/free-trial-visits`, `/api/payments` e `/api/workouts` recebem o perfil efetivo por academia; checks antigos por `session.user.role` ou `isTrainer` não podem conceder permissões.
- Criar/editar funcionário deixa de representar função operacional com `User.role` (`ADMIN`/`SUB_ADMIN`). A tela atual `/dashboard/employees` verifica papel global da sessão, lista usuários da conta, e cria `AccountMembership`; deve ganhar seleção explícita de academia e atribuição `MANAGER`/`TRAINER`/`RECEPTION`, mantendo a criação de conta/credenciais separada do papel de operação. A API atual `/api/users` também cria membership; ela não deve aceitar `isTrainer` ou `User.role` como substituto da atribuição.
- O `GET/POST/PATCH` de `/api/trainers/commissions` hoje filtra/valida treinadores via `User.isTrainer`; sua autorização e seleção de treinador devem consultar `GymStaffAssignment` da academia. O gestor da academia pode administrar comissões; um professor não recebe permissão financeira por ser `TRAINER`.
- Navegação e visibilidade de páginas, incluindo `/dashboard/trainers`, devem usar o perfil da academia ativa. Um professor em A pode ver recursos permitidos em A, enquanto recepção em B não herda esses recursos. A interface é apenas apresentação: as APIs aplicam os mesmos checks server-side.
- O campo `isTrainer` pode permanecer em `User`, nos DTOs e em schemas antigos apenas durante compatibilidade controlada; APIs e UI novas não o editam nem usam para conceder acesso. A lista de referências no relatório G2 deve distinguir persistência legada de uso de autorização.
- Endpoints de atribuição de staff ainda precisam ser definidos no plano após aprovação. Proposta inicial: endpoints tenant-scoped por academia, acessíveis somente a `OWNER`/`ADMIN` ativos, com criação, troca e revogação auditadas. Nenhum endpoint de gestão de staff será implementado antes da aprovação deste desenho.

## Proposta de schema Gymkhana (não aplicar nesta fase)

Todas as associações abaixo devem ser gravadas somente após resposta validada do .NET; criação repetida retorna o registro existente ou conflito, nunca gera nova relação silenciosa. O desenho deve incluir relações inversas Prisma em `Gym`, `Member` e `User`. O estado de tenant deve ser enum (`PENDING`, `ACTIVE`, `SUSPENDED`). Os mapeamentos de membro derivam `tenantId` através de `Member.Gym.ApymGymTenantMapping`, evitando duplicar e permitir inconsistência de `gymId` no vínculo de membro.

```prisma
model ApymGymTenantMapping {
  id        String   @id @default(cuid())
  gymId     String   @unique @db.Uuid
  tenantId  String   @unique @db.Uuid
  status    ApymMappingStatus @default(PENDING)
  verifiedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  Gym       Gym      @relation(fields: [gymId], references: [id], onDelete: Restrict)
}

model ApymMemberMapping {
  id            String   @id @default(cuid())
  memberId      String   @unique
  apymMemberId  String   @unique @db.Uuid
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  Member        Member   @relation(fields: [memberId], references: [id], onDelete: Restrict)
}

model ApymIdentityLink {
  id              String   @id @default(cuid())
  userId          String
  supabaseUserId  String   @db.Uuid
  verifiedAt      DateTime
  revokedAt       DateTime?
  createdAt       DateTime @default(now())
  User            User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  @@index([userId, revokedAt])
  @@index([supabaseUserId, revokedAt])
}

enum ApymMappingStatus {
  PENDING
  ACTIVE
  SUSPENDED
}
```

Adicionar relações inversas opcionais: `Gym.ApymGymTenantMapping`, `Member.ApymMemberMapping` e `User.ApymIdentityLink[]`.

Migration proposta acrescentará índices únicos parciais SQL para no máximo um link ativo por `userId` e por `supabaseUserId`, mantendo linhas revogadas como histórico. `Gym`, `Member` e `User` receberão relações inversas opcionais. O vínculo de membro permanece único nos dois lados; remapeamento exige fluxo de correção auditado. Antes de migration, revisar quem pode criar/revogar links e como APYM expõe/cria seu `memberId`.

## Testes de aceite

- Unitários da precedência: `OWNER`/`ADMIN` ativo gerencia gyms da própria conta sem virar platform-admin; membership ausente/inativa nega, mesmo se `User.accountId`/JWT dizem ADMIN; `STAFF` sem atribuição ativa nega mesmo se `isTrainer=true`; `MANAGER`, `TRAINER` e `RECEPTION` ativos só têm o perfil atribuído ao gym solicitado.
- Teste multi-academia obrigatório: mesma identidade com `TRAINER` na Academia A e `RECEPTION` na Academia B; A permite apenas permissões de professor/delegação, B permite somente recepção; trocar o gymId no request não carrega o papel de A para B. Cobrir academias na mesma conta e em contas diferentes, com memberships correspondentes.
- Testes de ciclo de vida da atribuição: atribuição inativa nega; uma troca de `TRAINER` para `RECEPTION` mantém histórico inativo e exatamente uma atribuição ativa; duas inserções concorrentes de papéis ativos para o mesmo user/gym têm uma rejeitada pelo índice parcial; gym/account incompatíveis e user sem membership correspondente não podem ganhar atribuição.
- Unitários de delegação: permite `TrainerClient` ativo correto; nega treinador diferente, aluno diferente, academia diferente, `isActive=false`, início futuro, fim expirado, usuário inativo e usuário sem `GymStaffAssignment.TRAINER` ativa.
- Testes de handler com duas academias/account IDs fictícios: usuário de Gym A não consegue selecionar/listar/ler/mutar Gym B; professor de A não encontra aluno sem delegação; manager de A não acessa outra conta sem membership ativa; recepção em B não herda direitos de professor em A.
- Cobertura de handler: cada verbo de `/api/members`, `/api/members/[id]`, `/api/attendance`, `/api/free-trial-visits`, `/api/payments`, `/api/payments/[id]` e `/api/workouts` testa ao menos negação de perfil e o caso de academia não autorizada; professor recebe lista/detalhe/histórico somente de alunos delegados.
- Identidade: testes de desenho/validação isolada para UUID obtido de `/me`, rejeição de token inválido/tenant sem membership e nenhum vínculo por e-mail. Não testar emissão ou uso .NET nesta fase porque isso ainda não será implementado.
- Gates finais: `npm run typecheck`, `npm run test:ci`, `npm run lint`, `npm run audit:tenant-scope:p0`, `npm run audit:mutating-zod`, `npm run openapi:check`.

## Riscos e perguntas que este design deixa para aprovação

- A API APYM ainda precisa definir a origem e o ciclo de vida de `memberId` UUID; não há rota correspondente no contrato atual.
- O JWT de ator cria confiança entre duas aplicações. O .NET precisa validar chaves, issuer, audience, expiração, tenant membership e autorização do domínio por request; sem isso, não se integra.
- O fluxo real de autenticação Supabase para vínculo no painel precisa ser definido (usuário autenticado nos dois sistemas, sem coleta de senha Supabase pelo Gymkhana).
- Dados atuais não informam, por si sós, qual função cada usuário deve ter em cada academia. O censo e a confirmação explícita são necessários; perfis não serão inferidos automaticamente de `isTrainer`.
- O `jti` proposto não é anti-replay; assertion curta pode ser reproduzida até expirar. Replay-cache é requisito adicional se APYM exigir garantia de uso único.
- `ApymIdentityLink` é global 1:1 entre uma identidade Gymkhana e uma Supabase. Esta cardinalidade acompanha o modelo atual de `User` global entre contas.
- O contrato atual não define `memberId` lifecycle e não oferece operação de vínculo/upsert. APYM deve definir endpoint de associação idempotente com uma referência externa string opaca, ou documentar uma forma segura de obter o UUID APYM existente. Não gerar UUID no Gymkhana.
- O fluxo OAuth atual permite vincular conta por e-mail sem verificação explícita. Antes de emitir assertion APYM, desligar auto-link por e-mail: login por provider já vinculado segue funcionando; provider não vinculado que colida com e-mail existente é negado até fluxo explícito de link; novo provisionamento exige e-mail verificado pelo provider. Isso mantém NextAuth e impede usar e-mail como prova de identidade.
- Rotas `platform-only` não têm papel dedicado no schema atual. O design propõe negar essas APIs a perfis APYM comuns até definir operador de plataforma.

