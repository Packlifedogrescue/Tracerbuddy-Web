import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export function useRealtime(tables: string[], onUpdate: () => void) {
  const cbRef = useRef(onUpdate)
  cbRef.current = onUpdate

  const [live, setLive] = useState(false)

  useEffect(() => {
    const channels = tables.map(table =>
      supabase
        .channel(`rt-${table}-${Math.random()}`)
        .on('postgres_changes' as any, { event: '*', schema: 'public', table }, () => cbRef.current())
        .subscribe(status => { if (status === 'SUBSCRIBED') setLive(true) })
    )
    return () => { channels.forEach(c => supabase.removeChannel(c)) }
  }, [])

  return live
}
