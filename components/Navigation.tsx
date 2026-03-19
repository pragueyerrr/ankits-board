'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, LayoutDashboard, FileText, User, Terminal } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { href: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/jobs',         label: 'Jobs',         icon: Briefcase },
  { href: '/applications', label: 'Applications', icon: FileText },
  { href: '/profile',      label: 'My CV',        icon: User },
  { href: '/click-me',     label: 'Click Me!',    icon: Terminal },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 0 rgba(244,63,94,0.1), 0 2px 8px rgba(0,0,0,0.6)',
      }}
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-14 items-center justify-between">

          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ background: 'var(--red-dim)', border: '1px solid rgba(244,63,94,0.3)' }}>
              <Terminal className="w-4 h-4" style={{ color: 'var(--red)' }} />
            </div>
            <span className="font-semibold" style={{ color: 'var(--red)' }}>Ankit&apos;s Board</span>
            <span className="text-xs px-1.5 py-0.5 rounded font-medium hidden sm:block"
              style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              ~ Dubai
            </span>
          </Link>

          <nav className="flex items-center gap-0.5">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-brand-900 text-brand-300'
                    : 'hover:bg-[#1f2335]'
                )}
                style={pathname !== href ? { color: 'var(--text-secondary)' } : {}}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
