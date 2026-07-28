import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { MeiliSearch } from 'meilisearch'

const prisma = new PrismaClient()
const meili = new MeiliSearch({
  host: process.env['MEILISEARCH_HOST'] ?? 'http://localhost:7700',
  apiKey: process.env['MEILISEARCH_API_KEY'] ?? 'metalclean_meili_dev',
})

const WORKERS_INDEX = 'workers'
const JOBS_INDEX = 'jobs'

const now = new Date()
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000)

async function main() {
  console.log('🌱 A iniciar seed da MetalClean...\n')

  // ── 1. Limpar dados anteriores ─────────────────────────────────────────────
  console.log('  🗑  A limpar dados existentes...')
  await prisma.gdprRequest.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.moderationReport.deleteMany()
  await prisma.postComment.deleteMany()
  await prisma.postLike.deleteMany()
  await prisma.post.deleteMany()
  await prisma.review.deleteMany()
  await prisma.match.deleteMany()
  await prisma.jobApplication.deleteMany()
  await prisma.jobPosting.deleteMany()
  await prisma.workerCertification.deleteMany()
  await prisma.workerProfile.deleteMany()
  await prisma.companyProfile.deleteMany()
  await prisma.user.deleteMany()
  console.log('  ✓ Base de dados limpa\n')

  // ── 2. Hash de passwords ────────────────────────────────────────────────────
  const [workerHash, companyHash, adminHash] = await Promise.all([
    bcrypt.hash('Worker123!', 12),
    bcrypt.hash('Company123!', 12),
    bcrypt.hash('Admin123!', 12),
  ])

  // ── 3. Admin ────────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: 'admin@metalclean.pt',
      passwordHash: adminHash,
      accountType: 'admin',
      isVerified: true,
    },
  })

  // ── 4. Workers ──────────────────────────────────────────────────────────────
  console.log('  👷 A criar workers...')

  const joaoUser = await prisma.user.create({
    data: {
      email: 'joao.silva@email.pt',
      phone: '+351912345678',
      passwordHash: workerHash,
      accountType: 'worker',
      isVerified: true,
      workerProfile: {
        create: {
          fullName: 'João Silva',
          slug: 'joao-silva',
          headline: 'Soldador TIG certificado EN ISO 9606-1 | 8 anos em refinarias e petroquímica',
          bio: 'Soldador especializado em TIG com foco em inox AISI 316L e tubagens industriais. Experiência em refinarias, petroquímica e construção naval. Aprovação 100% RT nos últimos 3 projetos. Disponível para projetos nacionais e internacionais.',
          locationCity: 'Setúbal',
          locationCountry: 'PT',
          nationality: 'PT',
          birthYear: 1990,
          primarySpecialty: 'tig_welder',
          secondarySpecialties: ['mig_mag_welder'],
          yearsExperience: 8,
          availabilityStatus: 'available',
          availableFrom: daysFromNow(7),
          preferredContractType: 'subcontract',
          desiredHourlyRateMin: 20,
          desiredHourlyRateMax: 28,
          willingToRelocate: true,
          preferredLocations: ['PT-Setúbal', 'PT-Lisboa', 'ES-País Vasco'],
          hasOwnTools: true,
          equipmentList: ['Capacete automático Speedglas 9100', 'Esmerilhadoras Bosch', 'Macho TIG Dinse'],
          reviewCount: 1,
          scoreAvg: 4.50,
        },
      },
    },
    include: { workerProfile: true },
  })

  const anaUser = await prisma.user.create({
    data: {
      email: 'ana.costa@email.pt',
      phone: '+351923456789',
      passwordHash: workerHash,
      accountType: 'worker',
      isVerified: true,
      workerProfile: {
        create: {
          fullName: 'Ana Costa',
          slug: 'ana-costa',
          headline: 'Montadora de Tubagens | EN 13480-3 | Alta pressão e ligas especiais',
          bio: 'Montadora de tubagens com 5 anos de experiência em instalações industriais de alta pressão. Especializada em aço inoxidável e ligas especiais. Certificada pela SGS. Experiência em projetos petroquímicos em Portugal e Espanha.',
          locationCity: 'Porto',
          locationCountry: 'PT',
          nationality: 'PT',
          birthYear: 1993,
          primarySpecialty: 'pipe_fitter',
          secondarySpecialties: ['structural_fitter'],
          yearsExperience: 5,
          availabilityStatus: 'working',
          preferredContractType: 'subcontract',
          desiredHourlyRateMin: 18,
          desiredHourlyRateMax: 24,
          willingToRelocate: true,
          preferredLocations: ['PT-Porto', 'PT-Setúbal'],
          hasOwnTools: false,
          reviewCount: 0,
        },
      },
    },
    include: { workerProfile: true },
  })

  const miguelUser = await prisma.user.create({
    data: {
      email: 'miguel.ferreira@email.pt',
      phone: '+351934567890',
      passwordHash: workerHash,
      accountType: 'worker',
      isVerified: true,
      workerProfile: {
        create: {
          fullName: 'Miguel Ferreira',
          slug: 'miguel-ferreira',
          headline: 'Caldereiro Sénior | EN 14015 + AWS D1.1 | 12 anos em calderaria pesada',
          bio: 'Caldereiro com 12 anos de experiência em estruturas metálicas, reservatórios e caldeiras industriais. Experiência sólida em oil & gas e energia renovável. Capacidade de liderança de equipas de até 8 pessoas. Certificado por TÜV SÜD e DNV.',
          locationCity: 'Lisboa',
          locationCountry: 'PT',
          nationality: 'PT',
          birthYear: 1986,
          primarySpecialty: 'boilermaker',
          secondarySpecialties: ['electrode_welder', 'structural_fitter'],
          yearsExperience: 12,
          availabilityStatus: 'available',
          availableFrom: daysFromNow(14),
          preferredContractType: 'both',
          desiredHourlyRateMin: 19,
          desiredHourlyRateMax: 26,
          willingToRelocate: true,
          preferredLocations: ['PT-Lisboa', 'PT-Setúbal', 'PT-Aveiro'],
          hasOwnTools: true,
          equipmentList: ['Ferramentas de traçagem e marcação', 'Calços e grampos de calderaria', 'Maciço de alinhamento'],
          reviewCount: 0,
        },
      },
    },
    include: { workerProfile: true },
  })

  const joaoProfile = joaoUser.workerProfile!
  const anaProfile = anaUser.workerProfile!
  const miguelProfile = miguelUser.workerProfile!

  // ── 5. Certificações ─────────────────────────────────────────────────────────
  console.log('  📜 A criar certificações...')

  await prisma.workerCertification.createMany({
    data: [
      // João Silva
      {
        workerId: joaoProfile.id,
        standard: 'EN ISO 9606-1',
        processCode: '141',
        materialGroup: 'FM1',
        position: 'PA,PB,PC,PF',
        issuedBy: 'ISQ — Instituto de Soldadura e Qualidade',
        issueDate: new Date('2022-03-15'),
        expiryDate: new Date('2025-03-15'),
        isVerified: true,
      },
      {
        workerId: joaoProfile.id,
        standard: 'ASME IX',
        processCode: 'GTAW',
        materialGroup: 'P-No.1',
        issuedBy: 'Bureau Veritas Portugal',
        issueDate: new Date('2023-01-10'),
        expiryDate: new Date('2025-01-10'),
        isVerified: true,
      },
      // Ana Costa
      {
        workerId: anaProfile.id,
        standard: 'EN 13480-3',
        processCode: '141',
        materialGroup: 'W03',
        position: 'PA,PB',
        issuedBy: 'SGS Portugal',
        issueDate: new Date('2023-06-01'),
        expiryDate: new Date('2026-06-01'),
        isVerified: true,
      },
      // Miguel Ferreira
      {
        workerId: miguelProfile.id,
        standard: 'EN 14015',
        issuedBy: 'TÜV SÜD Portugal',
        issueDate: new Date('2021-08-20'),
        expiryDate: new Date('2024-08-20'),
        isVerified: true,
      },
      {
        workerId: miguelProfile.id,
        standard: 'AWS D1.1',
        processCode: 'SMAW',
        issuedBy: 'DNV GL Portugal',
        issueDate: new Date('2022-11-05'),
        expiryDate: new Date('2024-11-05'),
        isVerified: false,
      },
    ],
  })

  // ── 6. Empresas ──────────────────────────────────────────────────────────────
  console.log('  🏭 A criar empresas...')

  const inoxferUser = await prisma.user.create({
    data: {
      email: 'rh@inoxfer.pt',
      phone: '+351265123456',
      passwordHash: companyHash,
      accountType: 'company',
      isVerified: true,
      companyProfile: {
        create: {
          companyName: 'INOXFER Lda',
          slug: 'inoxfer',
          bio: 'Empresa especializada em montagem e manutenção de instalações industriais no setor petroquímico e oil & gas. Presente em Portugal e Espanha desde 2008. Parceiros de confiança da GALP, Repsol e Bondalti.',
          taxId: 'PT512345678',
          taxIdVerified: true,
          foundedYear: 2008,
          employeeCountRange: 'range_51_200',
          companyType: 'subcontractor',
          sectors: ['oil_gas', 'petrochemical'],
          locationCity: 'Sines',
          locationCountry: 'PT',
          locationAddress: 'Zona Industrial de Sines, Lote 14',
          website: 'https://www.inoxfer.pt',
          currentProjectsSummary: 'Manutenção preventiva na Refinaria de Sines (GALP) e construção de nova unidade de armazenamento de produto acabado.',
          reviewCount: 1,
          scoreAvg: 4.75,
        },
      },
    },
    include: { companyProfile: true },
  })

  const petrometalUser = await prisma.user.create({
    data: {
      email: 'recrutamento@petrometal.pt',
      phone: '+351234789456',
      passwordHash: companyHash,
      accountType: 'company',
      isVerified: true,
      companyProfile: {
        create: {
          companyName: 'PetroMetal SA',
          slug: 'petrometal',
          bio: 'Empresa de calderaria e estruturas metálicas para os setores de energia e farmacêutico. Certificada ASME U-Stamp e ISO 3834-2. Trabalhamos com os maiores EPCs do país em projetos de fabricação e montagem.',
          taxId: 'PT598765432',
          taxIdVerified: true,
          foundedYear: 2001,
          employeeCountRange: 'range_11_50',
          companyType: 'subcontractor',
          sectors: ['energy', 'pharma'],
          locationCity: 'Aveiro',
          locationCountry: 'PT',
          locationAddress: 'Parque Industrial de Aveiro, Via 3',
          website: 'https://www.petrometal.pt',
          currentProjectsSummary: 'Fabricação de permutadores de calor para projeto de biomassa e caldeiras para indústria farmacêutica em Aveiro.',
          reviewCount: 0,
        },
      },
    },
    include: { companyProfile: true },
  })

  const inoxferProfile = inoxferUser.companyProfile!
  const petrometalProfile = petrometalUser.companyProfile!

  // ── 7. Job Postings ──────────────────────────────────────────────────────────
  console.log('  📋 A criar vagas...')

  const jobTig = await prisma.jobPosting.create({
    data: {
      companyId: inoxferProfile.id,
      title: 'Soldador TIG – Refinaria de Sines',
      slug: 'soldador-tig-refinaria-sines',
      description: 'Procuramos Soldador TIG experiente para integrar equipa de manutenção na Refinaria de Sines. Trabalho em tubagens de processo em aço inoxidável e carbono. Qualificação EN ISO 9606-1 processo 141 obrigatória. RT 100% exigido. Equipa de 4 soldadores, trabalho por turnos diurnos.',
      specialtyRequired: 'tig_welder',
      specialtiesAccepted: ['mig_mag_welder'],
      requiredCertifications: [{ standard: 'EN ISO 9606-1', processCode: '141', materialGroup: 'FM1' }],
      minYearsExperience: 5,
      ownToolsRequired: false,
      hourlyRateMin: 20,
      hourlyRateMax: 25,
      currency: 'EUR',
      rateIncludesTax: false,
      subsidenceDaily: 12,
      housingIncluded: true,
      housingQuality: 'single_room',
      transportIncluded: true,
      projectName: 'Manutenção Preventiva Refinaria Sines 2024',
      workLocationCity: 'Sines',
      workLocationCountry: 'PT',
      startDate: daysAgo(80),
      estimatedDurationWeeks: 10,
      shiftPattern: 'day',
      materialTypes: ['carbon_steel', 'stainless'],
      status: 'filled',
      isFeatured: true,
      publishedAt: daysAgo(90),
      expiresAt: daysFromNow(30),
      viewCount: 187,
      applicationCount: 8,
    },
  })

  const jobTubagens = await prisma.jobPosting.create({
    data: {
      companyId: inoxferProfile.id,
      title: 'Montador de Tubagens – Complexo Petroquímico Sines',
      slug: 'montador-tubagens-petroquimico-sines',
      description: 'INOXFER recruta Montador de Tubagens qualificado para projeto de expansão no complexo petroquímico de Sines. Trabalho em tubagens de alta pressão, aço inoxidável e duplex. Certificação EN 13480-3 obrigatória. Possibilidade de extensão do contrato.',
      specialtyRequired: 'pipe_fitter',
      specialtiesAccepted: ['structural_fitter'],
      requiredCertifications: [{ standard: 'EN 13480-3' }],
      minYearsExperience: 3,
      ownToolsRequired: false,
      hourlyRateMin: 18,
      hourlyRateMax: 22,
      currency: 'EUR',
      rateIncludesTax: false,
      subsidenceDaily: 20,
      housingIncluded: false,
      transportIncluded: false,
      projectName: 'Expansão Unidade Petroquímica Sines 2024',
      workLocationCity: 'Sines',
      workLocationCountry: 'PT',
      startDate: daysAgo(21),
      estimatedDurationWeeks: 12,
      shiftPattern: 'rotating',
      materialTypes: ['stainless', 'duplex'],
      status: 'published',
      publishedAt: daysAgo(30),
      expiresAt: daysFromNow(60),
      viewCount: 64,
      applicationCount: 1,
    },
  })

  const jobCaldereiro = await prisma.jobPosting.create({
    data: {
      companyId: petrometalProfile.id,
      title: 'Caldereiro Sénior – Aveiro',
      slug: 'caldereiro-senior-aveiro',
      description: 'PetroMetal SA procura Caldereiro Sénior para fabricação de permutadores de calor em aço carbono e inox 304/316. Projeto de 8 semanas em Aveiro com possibilidade de renovação. Perfil de liderança de equipa valorizado. Equipamento de última geração disponível.',
      specialtyRequired: 'boilermaker',
      specialtiesAccepted: ['electrode_welder', 'structural_fitter'],
      requiredCertifications: [{ standard: 'EN 14015' }],
      minYearsExperience: 8,
      ownToolsRequired: false,
      hourlyRateMin: 19,
      hourlyRateMax: 24,
      currency: 'EUR',
      rateIncludesTax: false,
      subsidenceDaily: 15,
      housingIncluded: false,
      transportIncluded: true,
      projectName: 'Permutadores Biomassa Aveiro 2024',
      workLocationCity: 'Aveiro',
      workLocationCountry: 'PT',
      startDate: daysFromNow(14),
      estimatedDurationWeeks: 8,
      shiftPattern: 'day',
      materialTypes: ['carbon_steel', 'stainless'],
      status: 'published',
      publishedAt: daysAgo(14),
      expiresAt: daysFromNow(76),
      viewCount: 38,
      applicationCount: 1,
    },
  })

  // ── 8. Candidaturas ──────────────────────────────────────────────────────────
  console.log('  📩 A criar candidaturas...')

  // João candidatou-se à vaga TIG (vaga preenchida, match criado)
  const appJoao = await prisma.jobApplication.create({
    data: {
      jobId: jobTig.id,
      workerId: joaoProfile.id,
      coverNote: 'Soldador TIG com certificação EN ISO 9606-1 processo 141 e ASME IX. 8 anos de experiência em refinarias. Aprovação 100% RT. Disponível para começar de imediato em Sines.',
      proposedRate: 22,
      status: 'matched',
      appliedAt: daysAgo(88),
    },
  })

  // Ana candidatou-se à vaga de tubagens (já tem match ativo)
  const appAna = await prisma.jobApplication.create({
    data: {
      jobId: jobTubagens.id,
      workerId: anaProfile.id,
      coverNote: 'Tenho certificação EN 13480-3 válida até junho de 2026 e experiência em tubagens de alta pressão em aço inoxidável e ligas especiais. Disponível para começar de imediato.',
      proposedRate: 20,
      status: 'matched',
      appliedAt: daysAgo(28),
    },
  })

  // Miguel candidatou-se ao caldereiro (pendente)
  const appMiguel = await prisma.jobApplication.create({
    data: {
      jobId: jobCaldereiro.id,
      workerId: miguelProfile.id,
      coverNote: `12 anos de experiência em calderaria pesada, incluindo fabricação de permutadores de calor e caldeiras. Certificação EN 14015 e AWS D1.1. Tenho liderado equipas de até 8 pessoas. Disponível a partir de ${daysFromNow(14).toLocaleDateString('pt-PT')}.`,
      proposedRate: 22,
      status: 'pending',
      appliedAt: daysAgo(10),
    },
  })

  void appMiguel // usado para candidatura pendente, não gera match

  // ── 9. Matches ───────────────────────────────────────────────────────────────
  console.log('  🤝 A criar matches...')

  const match1CompletedAt = daysAgo(45)
  const match1ReviewWindow = new Date(match1CompletedAt.getTime() + 30 * 24 * 60 * 60 * 1000)

  const match1 = await prisma.match.create({
    data: {
      jobId: jobTig.id,
      applicationId: appJoao.id,
      companyId: inoxferProfile.id,
      workerId: joaoProfile.id,
      confirmedHourlyRate: 22,
      currency: 'EUR',
      workLocationCity: 'Sines',
      workLocationCountry: 'PT',
      startDate: daysAgo(115),
      endDate: daysAgo(45),
      actualEndDate: daysAgo(45),
      housingIncluded: true,
      status: 'completed',
      confirmedAt: daysAgo(118),
      completedAt: match1CompletedAt,
      companyCanReviewUntil: match1ReviewWindow,
      workerCanReviewUntil: match1ReviewWindow,
    },
  })

  const match2 = await prisma.match.create({
    data: {
      jobId: jobTubagens.id,
      applicationId: appAna.id,
      companyId: inoxferProfile.id,
      workerId: anaProfile.id,
      confirmedHourlyRate: 20,
      currency: 'EUR',
      workLocationCity: 'Sines',
      workLocationCountry: 'PT',
      startDate: daysAgo(21),
      housingIncluded: false,
      status: 'active',
      confirmedAt: daysAgo(23),
      companyCanReviewUntil: null,
      workerCanReviewUntil: null,
    },
  })

  // ── 10. Reviews (Match 1 — ambas publicadas) ──────────────────────────────────
  console.log('  ⭐ A criar avaliações...')

  const reviewSubmittedAt = daysAgo(44)

  await prisma.review.createMany({
    data: [
      // Empresa → João Silva
      {
        matchId: match1.id,
        reviewerUserId: inoxferUser.id,
        revieweeUserId: joaoUser.id,
        reviewerType: 'company',
        scoreAttendance: 5,
        scoreTechnicalQuality: 5,
        scoreSafetyCompliance: 4,
        scoreAttitudeTeamwork: 4,
        overallScore: 4.50,
        writtenReview: 'Excelente soldador TIG. Passe de raiz impecável em inox AISI 316L, zero defeitos no RT. Pontualidade exemplar durante as 10 semanas. Postura profissional e boa integração na equipa. Recomendamos sem reservas.',
        isVisible: true,
        status: 'published',
        submittedAt: reviewSubmittedAt,
      },
      // João Silva → INOXFER
      {
        matchId: match1.id,
        reviewerUserId: joaoUser.id,
        revieweeUserId: inoxferUser.id,
        reviewerType: 'worker',
        scorePaymentPunctuality: 5,
        scoreRateCompliance: 5,
        scoreSafetyConditions: 4,
        scoreHousingAllowances: 5,
        overallScore: 4.75,
        writtenReview: 'Empresa séria e muito profissional. Pagamento sempre a tempo e no valor exato acordado. Alojamento single room de boa qualidade em Sines. Condições de segurança razoáveis, mas poderiam ter mais EPIs disponíveis. No geral, uma excelente empresa para trabalhar.',
        isVisible: true,
        status: 'published',
        submittedAt: reviewSubmittedAt,
      },
    ],
  })

  // ── 11. Posts ────────────────────────────────────────────────────────────────
  console.log('  📰 A criar posts...')

  await prisma.post.create({
    data: {
      authorUserId: joaoUser.id,
      authorType: 'worker',
      contentText: '✅ Projeto concluído na Refinaria de Sines para a INOXFER!\n\n10 semanas de trabalho TIG em tubagens de processo em inox AISI 316L. Resultado final: aprovação 100% em RT (Radiografia Industrial). Orgulhoso deste trabalho e de toda a equipa.\n\nDisponível para novos projetos a partir de setembro. Contacto via mensagem direta.\n\n#Soldadura #TIG #Refinaria #Sines #Inox #Metalomecânica #ISO9606',
      postType: 'portfolio_work',
      visibility: 'public',
      likeCount: 12,
      media: [],
      createdAt: daysAgo(44),
    },
  })

  await prisma.post.create({
    data: {
      authorUserId: inoxferUser.id,
      authorType: 'company',
      contentText: '🔧 A INOXFER está a recrutar Montadores de Tubagens para Sines!\n\nProjeto no Complexo Petroquímico, 12 semanas, início imediato.\n✔ 18–22€/h + subsídio diário de 20€\n✔ Certificação EN 13480-3 obrigatória\n✔ Experiência em alta pressão e duplex valorizada\n\nCandidatura direta na plataforma MetalClean. Resposta garantida em 48h.\n\n#Emprego #Tubagens #Sines #Petroquímica #Metalomecânica #INOXFER',
      postType: 'job_update',
      visibility: 'public',
      likeCount: 5,
      media: [],
      createdAt: daysAgo(29),
    },
  })

  // ── 12. Conversa + Mensagens ─────────────────────────────────────────────────
  console.log('  💬 A criar conversa e mensagens...')

  // Ordenação canónica: participantAId < participantBId (sort lexicográfico de UUIDs)
  const [participantAId, participantBId] = [joaoUser.id, inoxferUser.id].sort()
  const lastMsgAt = daysAgo(3)

  const conversation = await prisma.conversation.create({
    data: {
      participantAId,
      participantBId,
      lastMessageAt: lastMsgAt,
      lastMessagePreview: 'Manutenção de permutadores em aço carbono. 8 semanas em Sines, mesmas condições do contrato anterior.',
      createdAt: daysAgo(5),
    },
  })

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderId: inoxferUser.id,
        content: 'Olá João! Excelente trabalho nas últimas semanas na refinaria. Toda a equipa ficou muito satisfeita. Teríamos interesse em contar contigo para um novo projeto em outubro. Tens disponibilidade?',
        isRead: true,
        readAt: daysAgo(4),
        createdAt: daysAgo(5),
      },
      {
        conversationId: conversation.id,
        senderId: joaoUser.id,
        content: 'Olá! Obrigado pelo feedback, foi um prazer trabalhar com a equipa da INOXFER. Sim, estou disponível a partir de 1 de setembro. Que tipo de projeto é e qual a duração prevista?',
        isRead: true,
        readAt: daysAgo(4),
        createdAt: daysAgo(4),
      },
      {
        conversationId: conversation.id,
        senderId: inoxferUser.id,
        content: 'Manutenção de permutadores em aço carbono. 8 semanas em Sines, mesmas condições do contrato anterior. Posso enviar a proposta formal pela plataforma se tiveres interesse.',
        isRead: false,
        createdAt: lastMsgAt,
      },
    ],
  })

  // ── 13. Notificações ──────────────────────────────────────────────────────────
  console.log('  🔔 A criar notificações...')

  await prisma.notification.createMany({
    data: [
      {
        userId: joaoUser.id,
        type: 'review_received',
        title: 'Nova avaliação publicada',
        body: 'A INOXFER Lda avaliou-te com 4.5/5 — "Excelente soldador TIG. Passe de raiz impecável..."',
        data: { entityType: 'review', matchId: match1.id },
        isRead: true,
        readAt: daysAgo(43),
        createdAt: daysAgo(44),
      },
      {
        userId: anaUser.id,
        type: 'match_confirmed',
        title: 'Contrato ativo com INOXFER',
        body: 'O teu contrato de trabalho com INOXFER Lda está ativo. Boa sorte no projeto em Sines!',
        data: { entityType: 'match', matchId: match2.id },
        isRead: true,
        readAt: daysAgo(22),
        createdAt: daysAgo(23),
      },
      {
        userId: miguelUser.id,
        type: 'application_sent',
        title: 'Candidatura enviada',
        body: 'A tua candidatura para "Caldereiro Sénior – Aveiro" foi recebida pela PetroMetal SA.',
        data: { entityType: 'application', jobId: jobCaldereiro.id },
        isRead: false,
        createdAt: daysAgo(10),
      },
      {
        userId: inoxferUser.id,
        type: 'new_application',
        title: 'Nova candidatura recebida',
        body: 'Ana Costa candidatou-se a "Montador de Tubagens – Complexo Petroquímico Sines". Pipe Fitter · 5 anos · EN 13480-3.',
        data: { entityType: 'application', jobId: jobTubagens.id },
        isRead: true,
        readAt: daysAgo(27),
        createdAt: daysAgo(28),
      },
      {
        userId: petrometalUser.id,
        type: 'new_application',
        title: 'Nova candidatura recebida',
        body: 'Miguel Ferreira candidatou-se a "Caldereiro Sénior – Aveiro". Boilermaker · 12 anos · EN 14015.',
        data: { entityType: 'application', jobId: jobCaldereiro.id },
        isRead: false,
        createdAt: daysAgo(10),
      },
    ],
  })

  console.log('\n  ✓ Todos os dados criados com sucesso')

  // ── 14. Sync Meilisearch ──────────────────────────────────────────────────────
  console.log('\n  🔍 A sincronizar Meilisearch...')

  try {
    const workers = await prisma.workerProfile.findMany({
      include: { certifications: true },
    })

    await meili.index(WORKERS_INDEX).addDocuments(
      workers.map((w) => ({
        id: w.id,
        fullName: w.fullName,
        slug: w.slug,
        headline: w.headline,
        bio: w.bio,
        avatarUrl: w.avatarUrl,
        primarySpecialty: w.primarySpecialty,
        secondarySpecialties: w.secondarySpecialties,
        locationCity: w.locationCity,
        locationCountry: w.locationCountry,
        availabilityStatus: w.availabilityStatus,
        yearsExperience: w.yearsExperience,
        scoreAvg: w.scoreAvg ? Number(w.scoreAvg) : null,
        reviewCount: w.reviewCount,
        hasOwnTools: w.hasOwnTools,
        certificationStandards: w.certifications.map((c) => c.standard),
      }))
    )

    const jobs = await prisma.jobPosting.findMany({
      where: { status: 'published' },
      include: { company: true },
    })

    await meili.index(JOBS_INDEX).addDocuments(
      jobs.map((j) => ({
        id: j.id,
        title: j.title,
        slug: j.slug,
        description: j.description,
        projectName: j.projectName,
        specialtyRequired: j.specialtyRequired,
        workLocationCity: j.workLocationCity,
        workLocationCountry: j.workLocationCountry,
        hourlyRateMin: Number(j.hourlyRateMin),
        hourlyRateMax: j.hourlyRateMax ? Number(j.hourlyRateMax) : null,
        housingIncluded: j.housingIncluded,
        transportIncluded: j.transportIncluded,
        shiftPattern: j.shiftPattern,
        materialTypes: j.materialTypes,
        status: j.status,
        isFeatured: j.isFeatured,
        publishedAt: j.publishedAt,
        viewCount: j.viewCount,
        companyName: j.company.companyName,
        companySlug: j.company.slug,
        companyLogoUrl: j.company.logoUrl,
        companyScoreAvg: j.company.scoreAvg ? Number(j.company.scoreAvg) : null,
      }))
    )

    console.log(`  ✓ ${workers.length} workers e ${jobs.length} vagas indexados`)
  } catch {
    console.warn('  ⚠  Meilisearch não disponível — pesquisa desativada (inicia com docker compose up -d)')
  }

  // ── Resumo ───────────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              🎉  Seed MetalClean concluído!                      ║
╠══════════════════════════════════════════════════════════════════╣
║  👷  joao.silva@email.pt        / Worker123!                     ║
║      TIG welder · Setúbal · score 4.5/5 · 1 review              ║
║  👷  ana.costa@email.pt         / Worker123!                     ║
║      Pipe fitter · Porto · contrato ativo em Sines               ║
║  👷  miguel.ferreira@email.pt   / Worker123!                     ║
║      Caldereiro · Lisboa · candidatura pendente                  ║
╠══════════════════════════════════════════════════════════════════╣
║  🏭  rh@inoxfer.pt              / Company123!                    ║
║      INOXFER Lda · Sines · score 4.75/5 · 1 review              ║
║  🏭  recrutamento@petrometal.pt / Company123!                    ║
║      PetroMetal SA · Aveiro · sem reviews                        ║
╠══════════════════════════════════════════════════════════════════╣
║  🔧  admin@metalclean.pt        / Admin123!                      ║
╚══════════════════════════════════════════════════════════════════╝

  Vagas criadas : 3 (1 preenchida, 2 publicadas)
  Matches       : 2 (1 concluído, 1 ativo)
  Reviews       : 2 (ambas publicadas — blind review demo)
  Posts         : 2 no feed
  Mensagens     : 3 na conversa João ↔ INOXFER
`)
}

main()
  .catch((e) => {
    console.error('\n❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
