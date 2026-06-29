import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'

import { prisma } from '../../lib/prisma.js'
import { createUniqueSlug } from '../../lib/slugify.js'
import type {
  LoginInput,
  RefreshTokenInput,
  RegisterCompanyInput,
  RegisterWorkerInput,
} from '@metalclean/validators/auth'

const SALT_ROUNDS = 12

export class AuthService {
  constructor(private readonly fastify: FastifyInstance) {}

  async registerWorker(input: RegisterWorkerInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } })
    if (existing) {
      throw { statusCode: 409, message: 'Este email já está registado.' }
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash,
        accountType: 'worker',
        workerProfile: {
          create: {
            fullName: input.fullName,
            slug: createUniqueSlug(input.fullName),
            primarySpecialty: input.primarySpecialty,
          },
        },
      },
      include: { workerProfile: true },
    })

    const tokens = await this.generateTokens(user.id, user.accountType)
    return { user: this.sanitizeUser(user), tokens }
  }

  async registerCompany(input: RegisterCompanyInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } })
    if (existing) {
      throw { statusCode: 409, message: 'Este email já está registado.' }
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash,
        accountType: 'company',
        companyProfile: {
          create: {
            companyName: input.companyName,
            slug: createUniqueSlug(input.companyName),
            taxId: input.taxId,
            locationCity: input.locationCity,
            locationCountry: input.locationCountry ?? 'PT',
          },
        },
      },
      include: { companyProfile: true },
    })

    const tokens = await this.generateTokens(user.id, user.accountType)
    return { user: this.sanitizeUser(user), tokens }
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } })

    if (!user || !user.isActive || user.deletedAt) {
      throw { statusCode: 401, message: 'Credenciais inválidas.' }
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash)
    if (!passwordValid) {
      throw { statusCode: 401, message: 'Credenciais inválidas.' }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const tokens = await this.generateTokens(user.id, user.accountType)
    return { user: this.sanitizeUser(user), tokens }
  }

  async refreshTokens(input: RefreshTokenInput) {
    let payload: { sub: string; type: string }
    try {
      payload = this.fastify.jwt.verify<{ sub: string; type: string }>(
        input.refreshToken,
        { key: this.fastify.config.jwt.refreshSecret }
      )
    } catch {
      throw { statusCode: 401, message: 'Refresh token inválido ou expirado.' }
    }

    if (payload.type !== 'refresh') {
      throw { statusCode: 401, message: 'Token inválido.' }
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.isActive || user.deletedAt) {
      throw { statusCode: 401, message: 'Utilizador não encontrado.' }
    }

    return this.generateTokens(user.id, user.accountType)
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workerProfile: { include: { certifications: true } },
        companyProfile: true,
      },
    })

    if (!user || user.deletedAt) {
      throw { statusCode: 404, message: 'Utilizador não encontrado.' }
    }

    return this.sanitizeUser(user)
  }

  private async generateTokens(userId: string, accountType: string) {
    const accessToken = this.fastify.jwt.sign(
      { sub: userId, accountType, type: 'access' },
      { expiresIn: '15m' }
    )

    const refreshToken = this.fastify.jwt.sign(
      { sub: userId, type: 'refresh' },
      { key: this.fastify.config.jwt.refreshSecret, expiresIn: '30d' }
    )

    return { accessToken, refreshToken, expiresIn: 900 }
  }

  private sanitizeUser(user: { id: string; email: string; phone: string | null; accountType: string; isVerified: boolean; isActive: boolean; lastLoginAt: Date | null; createdAt: Date; updatedAt: Date; [key: string]: unknown }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, verificationToken, ...safe } = user as typeof user & { passwordHash: string; verificationToken: string | null }
    return safe
  }
}
