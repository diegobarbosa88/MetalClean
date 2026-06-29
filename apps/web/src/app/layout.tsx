import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: { default: 'MetalClean', template: '%s | MetalClean' },
  description:
    'A plataforma de emprego e rede social para profissionais da metalomecânica. Soldadores, caldeireiros e tubistas — encontra trabalho com transparência.',
  keywords: ['soldador', 'caldeireiro', 'tubista', 'metalomecânica', 'emprego', 'subcontratação'],
  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    siteName: 'MetalClean',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
