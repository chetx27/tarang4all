import React from 'react'

interface BadgeProps {
  variant: 
    | 'city'
    | 'threat-low'
    | 'threat-medium'
    | 'threat-high'
    | 'signal-burst'
    | 'signal-hopping'
    | 'signal-unlicensed'
    | 'signal-licensed'
    | 'high_confidence'
    | 'live'
  label: string
}

export default function Badge({ variant, label }: BadgeProps) {
  let classes = 'rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono font-medium whitespace-nowrap '

  switch (variant) {
    case 'city':
      classes += 'border-border text-secondary'
      break
    case 'threat-low':
      classes += 'border-threat-low/40 text-threat-low'
      break
    case 'threat-medium':
      classes += 'border-threat-medium/40 text-threat-medium'
      break
    case 'threat-high':
      classes += 'border-threat-high/40 text-threat-high animate-pulse'
      break
    case 'signal-burst':
      classes += 'border-signal-burst/40 text-signal-burst'
      break
    case 'signal-hopping':
      classes += 'border-signal-hopping/40 text-signal-hopping'
      break
    case 'signal-unlicensed':
      classes += 'border-signal-unlicensed/40 text-signal-unlicensed'
      break
    case 'signal-licensed':
      classes += 'border-signal-licensed/40 text-signal-licensed'
      break
    case 'high_confidence':
      classes += 'bg-accent/10 border-accent/40 text-accent'
      break
    case 'live':
      classes += 'border-threat-low/40 text-threat-low flex items-center gap-1.5'
      break
  }

  return (
    <span className={classes}>
      {variant === 'live' && (
        <span className="h-1.5 w-1.5 rounded-full bg-threat-low pulse-dot" />
      )}
      {label}
    </span>
  )
}
