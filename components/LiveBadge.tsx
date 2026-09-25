'use client'

// Small connection indicator for realtime dashboard pages.
// Green pulsing dot when Supabase realtime is subscribed; a static grey
// dot otherwise (data still loads on open, it just won't push updates).
export default function LiveBadge({ live }: { live: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
      title={live ? 'Updating live as new data syncs from your app' : 'Not connected — refresh to see the latest'}
    >
      {live ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22A06B] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22A06B]" />
          </span>
          <span className="text-[#22A06B]">Live</span>
        </>
      ) : (
        <>
          <span className="inline-flex rounded-full h-2 w-2 bg-gray-300" />
          <span className="text-gray-400">Offline</span>
        </>
      )}
    </span>
  )
}
