import { useState, useRef } from 'react'
import { TopBar }    from '@/components/panels/TopBar'
import { BottomBar } from '@/components/panels/BottomBar'
import { LeftPanel } from '@/components/panels/LeftPanel'
import { RightPanel } from '@/components/panels/RightPanel'
import { GlobeView } from '@/components/globe/GlobeView'
import type { NavView, Entity } from '@/types'

export default function App() {
  const sessionStart = useRef(Date.now()).current
  const [activeView, setActiveView] = useState<NavView>('Globe')
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <TopBar
        activeView={activeView}
        onViewChange={setActiveView}
        sessionStart={sessionStart}
      />
      <LeftPanel
        selectedId={selectedEntity?.id ?? null}
        onSelect={setSelectedEntity}
      />
      <GlobeView onEntityFocus={selectedEntity} />
      <RightPanel />
      <BottomBar sessionStart={sessionStart} />
    </div>
  )
}
