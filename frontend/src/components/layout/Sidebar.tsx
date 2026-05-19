import React from 'react'
import { Radio, AlertTriangle, Fingerprint } from 'lucide-react'
import { useTarangStore } from '../../store/tarangStore'
import type { Panel } from '../../store/types'

export default function Sidebar() {
  const { activePanel, setActivePanel, nodes } = useTarangStore()

  const connectedCount = nodes.filter(n => n.status === 'connected').length
  const totalCount = nodes.length > 0 ? nodes.length : 3

  // Bottom color dot based on system health
  let healthColor = 'bg-threat-high'
  if (connectedCount === totalCount) {
    healthColor = 'bg-threat-low animate-pulse'
  } else if (connectedCount > 0) {
    healthColor = 'bg-threat-medium'
  }

  const items = [
    { id: 'spectrum' as Panel, label: 'Spectrum Monitor', icon: Radio },
    { id: 'anomalies' as Panel, label: 'Anomaly Feed', icon: AlertTriangle },
    { id: 'vault' as Panel, label: 'Fingerprint Vault', icon: Fingerprint }
  ]

  return (
    <aside className="fixed top-12 left-0 w-12 bg-surface border-r border-border h-[calc(100vh-80px)] flex flex-col items-center py-4 z-40 select-none">
      
      {/* Center Nav Panel Buttons */}
      <div className="flex-1 flex flex-col gap-2 w-full">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activePanel === item.id

          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`group relative w-full h-12 flex items-center justify-center transition-all ${
                isActive 
                  ? 'text-accent border-l-2 border-accent bg-accent/5' 
                  : 'text-muted hover:text-secondary hover:bg-elevated/40 border-l-2 border-transparent'
              }`}
            >
              <Icon size={18} />
              
              {/* Tooltip on right hover */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-elevated border border-border rounded shadow-lg text-xxs font-medium text-primary tracking-wide whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                {item.label}
              </div>
            </button>
          )
        })}
      </div>

      {/* BOTTOM: Global Status Dot */}
      <div className="absolute bottom-4 flex items-center justify-center group w-full">
        <div className={`h-2.5 w-2.5 rounded-full ${healthColor}`} />
        
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-elevated border border-border rounded shadow-lg text-xxs font-mono text-secondary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
          SYSTEM HEALTH: {connectedCount}/{totalCount} NODES ONLINE
        </div>
      </div>

    </aside>
  )
}
