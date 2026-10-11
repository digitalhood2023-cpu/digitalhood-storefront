import { Link, useLocation } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export default function DigitalHoodAIShortcut() {
  const { pathname } = useLocation()
  if (/^\/(?:assistant|checkout|cart|account|order-complete)(?:\/|$)/.test(pathname)) return null
  return <Link
    to="/assistant"
    aria-label="Open DigitalHood AI shopping assistant"
    className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-12 items-center gap-2.5 rounded-full border border-amber-200 bg-amber-400 px-3.5 font-bold text-slate-950 shadow-lg  transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 sm:right-6 lg:bottom-6 lg:px-5"
  >
    <Sparkles className="h-5 w-5" aria-hidden="true" />
    <span className="hidden sm:inline">DigitalHood AI</span>
    <span className="text-xs sm:hidden">AI</span>
  </Link>
}
