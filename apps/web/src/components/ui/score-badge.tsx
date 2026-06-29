import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number | null
  reviewCount?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function scoreColor(score: number | null) {
  if (!score) return 'text-metal-400'
  if (score >= 4.5) return 'text-green-400'
  if (score >= 3.5) return 'text-yellow-400'
  if (score >= 2.5) return 'text-orange-400'
  return 'text-red-400'
}

export function ScoreBadge({ score, reviewCount, size = 'md', className }: ScoreBadgeProps) {
  const sizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }

  if (!score) {
    return (
      <span className={cn('text-metal-500', sizes[size], className)}>
        Sem avaliações
      </span>
    )
  }

  return (
    <span className={cn('flex items-center gap-1', sizes[size], className)}>
      <span className="text-yellow-400">★</span>
      <span className={cn('font-semibold', scoreColor(score))}>{score.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-metal-500">({reviewCount})</span>
      )}
    </span>
  )
}
