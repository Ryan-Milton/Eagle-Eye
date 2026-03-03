import { useState, useEffect, useRef } from 'react'
import { FEED_TEMPLATES } from '@/data'
import { utcTimeString } from '@/lib/utils'
import type { FeedItem } from '@/types'

let idCounter = 0

function makeItem(template: typeof FEED_TEMPLATES[number]): FeedItem {
  return {
    ...template,
    id: `feed-${++idCounter}`,
    timestamp: utcTimeString(),
  }
}

export function useFeed(initialCount = 5) {
  const [items, setItems] = useState<FeedItem[]>(() =>
    Array.from({ length: initialCount }, (_, i) =>
      makeItem(FEED_TEMPLATES[i % FEED_TEMPLATES.length])
    )
  )
  const ptr = useRef(initialCount)

  useEffect(() => {
    function push() {
      const template = FEED_TEMPLATES[ptr.current++ % FEED_TEMPLATES.length]
      setItems(prev => [makeItem(template), ...prev].slice(0, 20))
    }
    // randomize interval between 5–9 seconds
    let id: ReturnType<typeof setTimeout>
    function schedule() {
      id = setTimeout(() => { push(); schedule() }, 5000 + Math.random() * 4000)
    }
    schedule()
    return () => clearTimeout(id)
  }, [])

  return items
}
