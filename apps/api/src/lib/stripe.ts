import Stripe from 'stripe'
import { config } from '../config.js'

export const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, { apiVersion: '2024-11-20.acacia' })
  : null

export const PREMIUM_PLAN = {
  name: 'MetalClean Premium',
  features: [
    'Vagas em destaque (featured)',
    'Candidatos ilimitados',
    'Analytics avançados',
    'Verificação de NIF prioritária',
    'Suporte prioritário',
  ],
}
