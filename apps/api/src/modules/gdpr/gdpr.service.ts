import { prisma } from '../../lib/prisma.js'

export class GdprService {
  async requestExport(userId: string) {
    const existing = await prisma.gdprRequest.findFirst({
      where: { userId, requestType: 'export', status: { in: ['pending', 'processing'] } },
    })
    if (existing) {
      throw { statusCode: 409, message: 'Já tens um pedido de exportação em curso.' }
    }

    const request = await prisma.gdprRequest.create({
      data: { userId, requestType: 'export', status: 'pending' },
    })

    // Gerar exportação imediata (em produção seria um job BullMQ)
    const exportData = await this.generateExport(userId)
    const downloadUrl = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`

    await prisma.gdprRequest.update({
      where: { id: request.id },
      data: { status: 'completed', processedAt: new Date(), downloadUrl },
    })

    return { requestId: request.id, status: 'completed', data: exportData }
  }

  private async generateExport(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workerProfile: {
          include: { certifications: true },
        },
        companyProfile: true,
        postsAuthored: { where: { deletedAt: null } },
        reviewsGiven: true,
        reviewsReceived: { where: { status: 'published' } },
        notifications: { take: 100, orderBy: { createdAt: 'desc' } },
        gdprRequests: true,
      },
    })

    if (!user) throw { statusCode: 404, message: 'Utilizador não encontrado.' }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      include: {
        messages: {
          where: { senderId: userId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 500,
        },
      },
    })

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        accountType: user.accountType,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      profile: user.workerProfile ?? user.companyProfile,
      posts: user.postsAuthored,
      reviewsGiven: user.reviewsGiven,
      reviewsReceived: user.reviewsReceived,
      messagesSent: conversations.flatMap((c) => c.messages),
      notifications: user.notifications,
      gdprRequests: user.gdprRequests,
    }
  }

  async requestDeletion(userId: string, reason?: string) {
    const existing = await prisma.gdprRequest.findFirst({
      where: { userId, requestType: 'deletion', status: { in: ['pending', 'processing'] } },
    })
    if (existing) {
      throw { statusCode: 409, message: 'Já tens um pedido de eliminação em curso.' }
    }

    const request = await prisma.gdprRequest.create({
      data: { userId, requestType: 'deletion', status: 'pending', notes: reason },
    })

    // Agendar anonimização (soft-delete imediato + anonimização dos PII num job BullMQ)
    // Por agora, soft-delete e agendamento manual
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false },
    })

    await prisma.gdprRequest.update({
      where: { id: request.id },
      data: { status: 'processing', processedAt: new Date() },
    })

    return {
      requestId: request.id,
      message: 'Pedido de eliminação recebido. A tua conta foi desativada e os teus dados serão anonimizados em 30 dias.',
    }
  }

  async getRequests(userId: string) {
    return prisma.gdprRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async anonymizeUser(userId: string) {
    // Anonimiza PII preservando scores e histórico agregado (legítimo interesse)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { email: `deleted_${userId}@redacted.invalid`, phone: null, passwordHash: 'DELETED' },
      }),
      prisma.workerProfile.updateMany({
        where: { userId },
        data: {
          fullName: '[Conta Eliminada]',
          headline: null,
          bio: null,
          avatarUrl: null,
          coverUrl: null,
        },
      }),
      prisma.companyProfile.updateMany({
        where: { userId },
        data: {
          companyName: '[Empresa Eliminada]',
          bio: null,
          logoUrl: null,
          coverUrl: null,
          taxId: null,
          website: null,
          linkedinUrl: null,
        },
      }),
    ])
  }
}
