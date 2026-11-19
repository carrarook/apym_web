import type { LegalSection } from "@/lib/legal/content";

// Faithful Brazilian Portuguese rendering of the legal copy. The English source
// remains available when the user's selected locale is English.
const ptBR: Record<string, Omit<LegalSection, "id">> = {
  overview: {
    title: "Visão geral",
    paragraphs: [
      "O Fitness360 (\"nós\") é um software de gestão para academias operado pela GymKhana Fitness 360. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos dados pessoais quando você usa nosso aplicativo como gestor ou funcionário de uma academia, ou quando a academia registra informações de alunos no sistema.",
      "Tratamos dados para oferecer recursos de planos, cobranças, presença e comunicação. Não vendemos dados pessoais.",
    ],
  },
  "data-we-collect": {
    title: "Dados que coletamos",
    paragraphs: ["Dependendo de como sua academia usa o Fitness360, podemos tratar:"],
    bullets: [
      "Dados da conta: nome, telefone, e-mail, função (administrador/funcionário) e credenciais de acesso (senhas armazenadas com hash).",
      "Dados dos alunos: nome, contatos, plano, histórico de pagamentos, registros de presença e observações opcionais.",
      "Dados operacionais: identificadores da academia/unidade, registros de auditoria, eventos de presença por QR Code e documentos de cobrança.",
      "Dados técnicos: endereço IP, tipo de navegador, cookies de sessão e registros de erros (sanitizados sempre que possível).",
    ],
  },
  "legal-basis": {
    title: "Finalidade e base legal",
    paragraphs: [
      "Tratamos dados pessoais para cumprir nosso contrato com a academia (prestação do serviço), atender a interesses legítimos (segurança, prevenção a fraudes e melhoria do produto) e cumprir obrigações legais, quando aplicável.",
      "Em geral, a academia é a controladora dos dados de seus alunos. O Fitness360 atua como operador ao tratar os registros dos alunos conforme as instruções da academia.",
    ],
  },
  retention: {
    title: "Retenção",
    paragraphs: [
      "Mantemos os dados enquanto a conta da academia estiver ativa e pelo tempo necessário para cumprir obrigações legais, fiscais ou contábeis. A academia pode solicitar a exportação ou exclusão dos dados, observadas a legislação aplicável e as rotinas de backup.",
    ],
  },
  security: {
    title: "Medidas de segurança",
    paragraphs: [
      "Adotamos medidas de proteção reconhecidas pelo setor, incluindo tráfego criptografado (HTTPS), senhas armazenadas com hash, controle de acesso por função, consultas parametrizadas ao banco de dados (sem SQL concatenado por texto), validação de entradas, cabeçalhos de segurança (CSP e HSTS em produção) e segredos mantidos somente em variáveis de ambiente, nunca no código-fonte.",
    ],
  },
  sharing: {
    title: "Prestadores de serviço e compartilhamento",
    paragraphs: [
      "Podemos utilizar fornecedores de infraestrutura (por exemplo, hospedagem, banco de dados e mensagens) sujeitos a obrigações contratuais de confidencialidade. Não compartilhamos dados dos alunos com anunciantes.",
    ],
    bullets: [
      "Hospedagem e banco de dados (por exemplo, Vercel e PostgreSQL/Supabase, conforme configurados pelo operador).",
      "Integrações opcionais: API do WhatsApp Business (Meta Cloud) e notificações push, somente quando ativadas pela academia.",
    ],
  },
  rights: {
    title: "Seus direitos",
    paragraphs: [
      "Conforme a legislação aplicável (incluindo, quando pertinente, a Lei de Proteção de Dados Pessoais da Índia), as pessoas podem solicitar acesso, correção, exclusão ou limitação do tratamento de seus dados. Alunos devem primeiro entrar em contato com sua academia; a academia pode falar conosco pelo endereço abaixo.",
    ],
  },
  cookies: {
    title: "Cookies e sessões",
    paragraphs: [
      "Usamos cookies essenciais para autenticação e gerenciamento de sessão. Eles são necessários para o funcionamento do aplicativo. O produto principal não usa cookies de publicidade de terceiros.",
    ],
  },
  contact: {
    title: "Contato",
    paragraphs: [
      "Dúvidas sobre esta política: mailgymkhana@gmail.com. Última atualização: 19 de maio de 2026.",
    ],
  },
  acceptance: {
    title: "Aceitação dos termos",
    paragraphs: [
      "Ao acessar ou usar o Fitness360, você concorda com estes Termos de Serviço. Se usar o serviço em nome de uma academia, declara ter autoridade para vincular essa organização a estes termos.",
    ],
  },
  service: {
    title: "O serviço",
    paragraphs: [
      "O Fitness360 oferece ferramentas para gestão de alunos, pagamentos, presença, relatórios e envio opcional de mensagens. Os recursos podem mudar; buscamos avisar com antecedência razoável sobre alterações relevantes.",
    ],
  },
  accounts: {
    title: "Contas e segurança",
    paragraphs: [
      "Você é responsável por proteger suas credenciais e pelas atividades realizadas em sua conta. Avise-nos prontamente sobre qualquer acesso não autorizado. Podemos suspender contas que violem estes termos ou representem um risco de segurança.",
    ],
  },
  "acceptable-use": {
    title: "Uso aceitável",
    paragraphs: ["Você concorda em não:"],
    bullets: [
      "Enviar conteúdo ilícito ou violar direitos de terceiros.",
      "Tentar contornar a autenticação, procurar vulnerabilidades ou inserir código malicioso (SQL, XSS etc.).",
      "Sobrecarregar ou interromper o serviço (por meio de automação abusiva ou coleta de dados sem autorização).",
      "Armazenar dados de cartões de pagamento fora das integrações aprovadas.",
    ],
  },
  data: {
    title: "Dados dos clientes",
    paragraphs: [
      "As academias mantêm a titularidade de seus dados comerciais. Você nos concede uma licença limitada para hospedar e tratar esses dados exclusivamente para prestar o serviço. Você deve obter o consentimento ou fornecer os avisos adequados sobre os dados dos alunos que inserir.",
    ],
  },
  disclaimer: {
    title: "Isenção de garantias e limitação de responsabilidade",
    paragraphs: [
      "Na medida permitida por lei, o serviço é fornecido \"no estado em que se encontra\". Não nos responsabilizamos por danos indiretos ou consequenciais. Nossa responsabilidade total fica limitada aos valores pagos nos doze meses anteriores à reclamação ou a INR 10.000, prevalecendo o maior valor, salvo quando a lei exigir outro limite.",
    ],
  },
  termination: {
    title: "Encerramento",
    paragraphs: [
      "Qualquer parte pode encerrar o contrato conforme o acordo aplicável. Com o encerramento, o acesso termina; a exportação ou exclusão dos dados seguirá a Política de Privacidade e as condições comerciais.",
    ],
  },
  law: {
    title: "Legislação aplicável",
    paragraphs: [
      "Estes termos são regidos pelas leis da Índia. Os tribunais de Mumbai, Maharashtra, terão jurisdição exclusiva, respeitadas as proteções obrigatórias ao consumidor.",
    ],
  },
  "contact-terms": {
    title: "Contato",
    paragraphs: [
      "Assuntos jurídicos: mailgymkhana@gmail.com. Última atualização: 19 de maio de 2026.",
    ],
  },
};

export function localizeLegalSections(sections: LegalSection[], locale: string): LegalSection[] {
  if (locale !== "pt-BR") return sections;
  return sections.map((section) => ({ ...section, ...ptBR[section.id] }));
}
