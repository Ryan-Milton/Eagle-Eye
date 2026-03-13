import { useEffect } from 'react'
import { useRadioStore } from '@/stores/radio-store'
import { parseRadioFeeds } from '@/lib/radio-client'

const POLL_INTERVAL = 600_000 // 10 minutes

export function useRadioInit() {
  const setFeeds = useRadioStore(s => s.setFeeds)
  const setErrors = useRadioStore(s => s.setErrors)

  useEffect(() => {
    async function fetchRadio() {
      try {
        const res = await fetch('/api/radio/feeds')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const feeds = parseRadioFeeds(data)
        setFeeds(feeds)
      } catch (err) {
        setErrors([(err as Error).message])
        console.warn('[Radio] Fetch failed:', (err as Error).message)
      }
    }

    fetchRadio()
    const interval = setInterval(fetchRadio, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [setFeeds, setErrors])
}
