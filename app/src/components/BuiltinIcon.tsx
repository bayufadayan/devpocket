import type { ReactNode } from 'react'

const shapes: Record<string, ReactNode> = {
  CodeXml: <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" /></>,
  SquareTerminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3m6 0h4" /></>,
  Lightbulb: <><path d="M9 18h6m-5 3h4m-3-6a6 6 0 1 1 2 0v3h-4z" /></>,
  Database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  Package: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8m-9 5v9m-4-17 9 5" /></>,
  BookOpen: <><path d="M12 7v14m0-14C10 5 7 4 3 5v14c4-1 7 0 9 2m0-14c2-2 5-3 9-2v14c-4-1-7 0-9 2" /></>,
  Wrench: <><path d="M14.5 6.5a5 5 0 0 0-6.8 6.8L3 18a2.1 2.1 0 0 0 3 3l4.7-4.7a5 5 0 0 0 6.8-6.8L14 13l-3-3 3.5-3.5Z" /></>,
  Layers3: <><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></>,
  Rocket: <><path d="M4.5 16.5c-1.5 1.3-2 4-2 4s2.7-.5 4-2m-2-2 4 4m1-4c5-1 9-5 11-13-8 2-12 6-13 11l-2 2 4 4 2-2Z" /><circle cx="15" cy="9" r="1.5" /></>,
  Cloud: <><path d="M7 18h10a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.2 9 4.5 4.5 0 0 0 7 18Z" /></>,
  Server: <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01m4-9h6m-6 9h6" /></>,
  Workflow: <><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><path d="M9 6h3a3 3 0 0 1 3 3v6m-6-9v9a3 3 0 0 0 3 3h3" /></>,
  ShieldCheck: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  Braces: <><path d="M8 4H6a2 2 0 0 0-2 2v3a3 3 0 0 1-2 3 3 3 0 0 1 2 3v3a2 2 0 0 0 2 2h2m8-16h2a2 2 0 0 1 2 2v3a3 3 0 0 0 2 3 3 3 0 0 0-2 3v3a2 2 0 0 1-2 2h-2m-4-14-2 12" /></>,
  Cpu: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 9h6v6H9zM9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4" /></>,
  Image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></>,
}

export function BuiltinIcon({ name, size }: { name: string; size: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</svg>
}
