import { prisma } from '../../lib/prisma.js'
import { stripe, PREMIUM_PLAN } from '../../lib/stripe.js'
import { config } from '../../config.js'

export class BillingService {
  async getStatus(userId: string) {
    const company = await prisma.companyProfile.findUnique({
      where: { userId },
      select: { subscriptionStatus: true, subscriptionExpiresAt: true, stripeCustomerId: true },
    })
    if (!company) throw { statusCode: 404, message: 'Empresa não encontrada.' }
    return {
      plan: company.subscriptionStatus,
      expiresAt: company.subscriptionExpiresAt,
      isPremium: company.subscriptionStatus === 'premium',
      features: PREMIUM_PLAN.features,
    }
  }

  async createCheckoutSession(userId: string, returnUrl: string) {
    if (!stripe) throw { statusCode: 503, message: 'Pagamentos não configurados.' }

    const company = await prisma.companyProfile.findUnique({
      where: { userId },
      select: { id: true, companyName: true, stripeCustomerId: true },
    })
    if (!company) throw { statusCode: 404, message: 'Empresa não encontrada.' }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (!user) throw { statusCode: 404, message: 'Utilizador não encontrado.' }

    // Obter ou criar customer no Stripe
    let customerId = company.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: company.companyName,
        metadata: { companyId: company.id, userId },
      })
      customerId = customer.id
      await prisma.companyProfile.update({
        where: { userId },
        data: { stripeCustomerId: customerId },
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: config.stripe.premiumPriceId, quantity: 1 }],
      success_url: `${returnUrl}?success=true`,
      cancel_url: `${returnUrl}?cancelled=true`,
      metadata: { userId, companyId: company.id },
    })

    return { url: session.url, sessionId: session.id }
  }

  async createPortalSession(userId: string, returnUrl: string) {
    if (!stripe) throw { statusCode: 503, message: 'Pagamentos não configurados.' }

    const company = await prisma.companyProfile.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    })
    if (!company?.stripeCustomerId) throw { statusCode: 400, message: 'Sem subscrição ativa.' }

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: returnUrl,
    })
    return { url: session.url }
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!stripe) throw { statusCode: 503, message: 'Pagamentos não configurados.' }

    let event: import('stripe').Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret)
    } catch {
      throw { statusCode: 400, message: 'Assinatura do webhook inválida.' }
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as import('stripe').Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const status = sub.status === 'active' ? 'premium' : 'free'
        const expiresAt = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

        await prisma.companyProfile.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: status, subscriptionExpiresAt: expiresAt },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as import('stripe').Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        await prisma.companyProfile.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: 'free', subscriptionExpiresAt: null },
        })
        break
      }
    }

    return { received: true }
  }
}
