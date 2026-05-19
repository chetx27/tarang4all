import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTarangStore } from './store/tarangStore'
import { useSocket } from './hooks/useSocket'

import TopBar from './components/layout/TopBar'
import Sidebar from './components/layout/Sidebar'
import StatusBar from './components/layout/StatusBar'

import SpectrumPanel from './components/panels/SpectrumPanel'
import AnomalyFeed from './components/panels/AnomalyFeed'
import FingerprintVault from './components/panels/FingerprintVault'

export default function App() {
  const { activePanel } = useTarangStore()
  
  // Connect socket and handle incoming live telemetry stream
  useSocket()

  // Panel renderer map
  const renderActivePanel = () => {
    switch (activePanel) {
      case 'spectrum':
        return <SpectrumPanel />
      case 'anomalies':
        return <AnomalyFeed />
      case 'vault':
        return <FingerprintVault />
      default:
        return <SpectrumPanel />
    }
  }

  return (
    <div className="relative min-h-screen bg-canvas text-primary overflow-hidden font-sans select-none">
      
      {/* 1. TOPBAR & CONTROL PANEL HEADER */}
      <TopBar />

      {/* 2. SIDEBAR NAVIGATION */}
      <Sidebar />

      {/* 3. MAIN COGNITIVE WORKSPACE AREA */}
      <main className="absolute inset-0 pt-12 pl-12 pb-8 overflow-hidden bg-canvas z-30">
        <div className="w-full h-full relative">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="w-full h-full"
            >
              {renderActivePanel()}
            </motion.div>
          </AnimatePresence>

        </div>
      </main>

      {/* 4. METRICS STATS BAR */}
      <StatusBar />

    </div>
  )
}
