import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-metal-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-metal-800 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight">
              Metal<span className="text-orange-500">Clean</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/jobs"
              className="text-sm text-metal-300 transition-colors hover:text-white"
            >
              Ofertas de Trabalho
            </Link>
            <Link
              href="/login"
              className="text-sm text-metal-300 transition-colors hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Registar
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 inline-block rounded-full bg-orange-500/10 px-4 py-1 text-sm font-medium text-orange-400 ring-1 ring-orange-500/20">
            Transparência total no setor da metalomecânica
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            O mercado onde os{' '}
            <span className="text-orange-500">melhores profissionais</span>{' '}
            encontram as{' '}
            <span className="text-orange-500">melhores empresas</span>
          </h1>
          <p className="mb-10 text-lg text-metal-300 md:text-xl">
            Soldadores TIG/MIG-MAG, caldeireiros, tubistas — encontra trabalho com total
            transparência. Salários explícitos, avaliações reais e um sistema que protege os bons
            profissionais das más empresas, e vice-versa.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register?type=worker"
              className="rounded-lg bg-orange-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-orange-600"
            >
              Sou Trabalhador
            </Link>
            <Link
              href="/register?type=company"
              className="rounded-lg border border-metal-600 bg-metal-800 px-8 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-metal-700"
            >
              Sou Empresa
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-metal-800 bg-metal-900 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            O que torna o MetalClean diferente
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: '⚡',
                title: 'Salários Transparentes',
                desc: 'Cada oferta de trabalho mostra o valor/hora exato, ajudas de custo, alojamento e duração. Sem surpresas.',
              },
              {
                icon: '🔒',
                title: 'Avaliações Vinculadas a Contrato',
                desc: 'Só se avalia quem realmente trabalhou em conjunto. Sistema de avaliação cega que elimina represálias.',
              },
              {
                icon: '🛠️',
                title: 'Portfólio Técnico',
                desc: 'Partilha fotos de passes de soldadura, raios-X aprovados e montagens. Mostra o teu trabalho real.',
              },
              {
                icon: '📋',
                title: 'Certificações Verificadas',
                desc: 'EN ISO 9606-1, ASME IX e outras normas. Certificações com data de validade, visíveis para os recrutadores.',
              },
              {
                icon: '💬',
                title: 'Chat Direto',
                desc: 'Contacto direto entre empresa e trabalhador. Negociação rápida sem intermediários.',
              },
              {
                icon: '⭐',
                title: 'Reputação Real',
                desc: 'Scores por critério: pontualidade, qualidade técnica, segurança. Para trabalhadores E empresas.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-metal-700 bg-metal-800 p-6"
              >
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-metal-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-metal-800 px-6 py-8 text-center text-sm text-metal-500">
        <p>© {new Date().getFullYear()} MetalClean. Todos os direitos reservados.</p>
        <p className="mt-1">
          <Link href="/privacy" className="hover:text-metal-300">Privacidade</Link>
          {' · '}
          <Link href="/terms" className="hover:text-metal-300">Termos</Link>
          {' · '}
          <Link href="/contact" className="hover:text-metal-300">Contacto</Link>
        </p>
      </footer>
    </main>
  )
}
