import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root')!)
const showDesignSystem = import.meta.env.DEV && new URLSearchParams(window.location.search).has('design-system')

const entry = showDesignSystem
  ? import('./examples/component-gallery')
  : import('./App')

entry.then(({ default: Entry }) => {
  root.render(
    <StrictMode>
      <Entry />
    </StrictMode>,
  )
})
