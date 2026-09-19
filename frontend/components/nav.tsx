'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, Menu, X, Heart, User, LogOut, LogIn } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'

export function Nav() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    router.push('/')
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border/70 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-sage">
            <span className="grid size-9 place-items-center rounded-xl bg-sage text-white">
              <Home className="size-5" />
            </span>
            humdum
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <Link className="text-sage hover:text-sage/80" href="/">Find a place</Link>
            <Link href="/#how" className="hover:text-foreground">How it works</Link>
            <Link href="/safety" className="hover:text-foreground">Safety</Link><Link href="/about" className="hover:text-foreground">About us</Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <Link href="/saved" className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-sage hover:bg-sage-light">
                  <Heart className="size-4" /> Saved
                </Link>
                {user.userType === 'seeker' && (
                  <Link href="/applications" className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-sage hover:bg-sage-light">
                    Applications
                  </Link>
                )}
                <Link href="/profile" className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-sage hover:bg-sage-light">
                  <User className="size-4" /> {user.name}
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 rounded-full bg-rose px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-dark">
                  <LogOut className="size-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-sage hover:bg-sage-light">
                  Log in
                </Link>
                <Link href="/list" className="rounded-full bg-rose px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-dark">
                  List your place
                </Link>
              </>
            )}
          </div>

          <button aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)} className="rounded-xl p-2 text-sage md:hidden">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-sage p-6 text-white md:hidden">
          <div className="flex items-center justify-between mb-12">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold" onClick={() => setMenuOpen(false)}>
              <span className="grid size-8 place-items-center rounded-lg bg-white text-sage">
                <Home className="size-4" />
              </span>
              humdum
            </Link>
            <button aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <X />
            </button>
          </div>
          <nav className="flex flex-col gap-7 text-lg font-medium mb-12">
            <Link href="/" onClick={() => setMenuOpen(false)}>Find a place</Link>
            <Link href="/#how" onClick={() => setMenuOpen(false)}>How it works</Link>
            <Link href="/safety" onClick={() => setMenuOpen(false)}>Safety</Link><Link href="/about" onClick={() => setMenuOpen(false)}>About us</Link><Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
          </nav>
          <div className="flex flex-col gap-3">
            {user ? (
              <>
                <Link href="/saved" className="rounded-full bg-white/20 px-4 py-3 text-center font-medium hover:bg-white/30" onClick={() => setMenuOpen(false)}>
                  Saved listings
                </Link>
                {user.userType === 'seeker' && (
                  <Link href="/applications" className="rounded-full bg-white/20 px-4 py-3 text-center font-medium hover:bg-white/30" onClick={() => setMenuOpen(false)}>
                    My applications
                  </Link>
                )}
                <Link href="/profile" className="rounded-full bg-white/20 px-4 py-3 text-center font-medium hover:bg-white/30" onClick={() => setMenuOpen(false)}>
                  My profile
                </Link>
                <button onClick={handleLogout} className="rounded-full bg-white/20 px-4 py-3 text-center font-medium hover:bg-white/30">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full bg-white/20 px-4 py-3 text-center font-medium hover:bg-white/30" onClick={() => setMenuOpen(false)}>
                  Log in
                </Link>
                <Link href="/list" className="rounded-full bg-white px-4 py-3 text-center font-semibold text-sage hover:bg-cream" onClick={() => setMenuOpen(false)}>
                  List your place
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
