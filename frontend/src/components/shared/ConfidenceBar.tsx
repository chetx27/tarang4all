import React, { useEffect, useState } from 'react'

interface ConfidenceBarProps {
  value: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animate?: boolean
}

export default function ConfidenceBar({ 
  value, 
  size = 'md', 
  showLabel = true, 
  animate = true 
}: ConfidenceBarProps) {
  const [width, setWidth] = useState(0)
  const [flash, setFlash] = useState(false)

  const valNum = Math.min(100, Math.max(0, value))

  useEffect(() => {
    if (!animate) {
      setWidth(valNum)
      return
    }
    const timer = setTimeout(() => {
      setWidth(valNum)
    }, 50)
    return () => clearTimeout(timer)
  }, [valNum, animate])

  // Trigger flash animation on value update
  useEffect(() => {
    setFlash(true)
    const timer = setTimeout(() => setFlash(false), 300)
    return () => clearTimeout(timer)
  }, [valNum])

  // Sizes classes
  const sizeClasses = {
    sm: 'h-0.5',
    md: 'h-1',
    lg: 'h-1.5'
  }

  // Fill color based on score thresholds
  let fillColor = 'bg-muted'
  let textColor = 'text-muted'

  if (valNum >= 85) {
    fillColor = 'bg-threat-low'
    textColor = 'text-threat-low'
  } else if (valNum >= 60) {
    fillColor = 'bg-accent'
    textColor = 'text-accent'
  } else if (valNum >= 30) {
    fillColor = 'bg-threat-medium'
    textColor = 'text-threat-medium'
  }

  return (
    <div className="w-full flex flex-col gap-1 select-none">
      
      {/* Track bar */}
      <div className={`w-full bg-border rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div 
          className={`h-full rounded-full transition-all duration-600 ease-[cubic-bezier(0.4,0,0.2,1)] ${fillColor} ${
            flash ? 'brightness-150' : 'brightness-100'
          }`}
          style={{ width: `${width}%` }}
        />
      </div>

      {/* Label score */}
      {showLabel && (
        <div className="flex justify-end mt-0.5">
          <span className={`font-mono text-[10px] font-semibold tracking-wider ${textColor}`}>
            {valNum.toFixed(1)}% CONFIDENCE
          </span>
        </div>
      )}

    </div>
  )
}
