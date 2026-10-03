import Link from 'next/link'
import { ArrowRight, MapPinned, MessageCircle, ShieldCheck, Users } from 'lucide-react'
import { Brand } from '@/components/brand'

const platformAreas = [
  { title: 'Search by location', description: 'Browse the live accommodation catalogue around Islamabad and Rawalpindi.', icon: MapPinned },
  { title: 'Review safety details', description: 'See the information available for a property before starting a conversation.', icon: ShieldCheck },
  { title: 'Keep contact private', description: 'Use listing-based messaging with contact details filtered by Humdum.', icon: MessageCircle },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream text-[#443A34]">
      <header className="border-b border-[#E5DBD1] bg-cream/95">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand />
          <nav aria-label="Account navigation" className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold text-[#62564E] transition hover:bg-white">Log in</Link>
            <Link href="/signup" className="inline-flex min-h-10 items-center rounded-full bg-peach px-4 text-sm font-bold text-[#49362A] shadow-sm transition hover:brightness-[1.02]">Create account</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#DDD2C7] bg-white px-3 py-1.5 text-xs font-bold text-[#62564E]">
              <ShieldCheck className="size-4 text-[#77734E]" /> Accommodation tools designed for women
            </p>
            <h1 className="mt-6 max-w-3xl font-heading text-5xl leading-[1.02] text-[#40362F] sm:text-6xl lg:text-7xl">Find a safer place to settle in.</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#6F635B] sm:text-lg">Humdum brings property information, safety checks, and privacy-conscious communication into one place for women moving within Islamabad and Rawalpindi.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/listings" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-peach to-peach-deep px-6 text-sm font-bold text-[#49362A] shadow-[0_8px_20px_rgba(231,151,150,0.22)]">Explore listings <ArrowRight className="size-4" /></Link>
              <Link href="/login?next=/landlord/dashboard" className="inline-flex min-h-12 items-center rounded-full border border-[#D8CEC4] bg-white px-6 text-sm font-bold text-[#5F534B]">Landlord sign in</Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-[#E3D9CF] bg-white p-6 shadow-[0_22px_55px_rgba(88,67,52,0.10)] sm:p-8">
            <div aria-hidden="true" className="absolute -right-16 -top-20 size-64 rounded-full bg-blush/60 blur-3xl" />
            <div aria-hidden="true" className="absolute -bottom-20 -left-12 size-56 rounded-full bg-sage/40 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#81756D]">Humdum platform</p>
              <h2 className="mt-3 font-heading text-3xl text-[#40362F]">A clearer path from search to conversation.</h2>
              <div className="mt-7 space-y-3">
                {platformAreas.map(({ title, description, icon: Icon }) => (
                  <article key={title} className="flex gap-4 rounded-2xl border border-[#E7DED6] bg-cream/70 p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sage/50 text-[#555139]"><Icon className="size-5" /></span>
                    <div><h3 className="text-sm font-bold text-[#443A34]">{title}</h3><p className="mt-1 text-xs leading-5 text-[#756960]">{description}</p></div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E5DBD1] bg-white/65">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 md:grid-cols-3">
            <Value title="Live accommodation search" copy="Results come from Humdum's listings service, with location and radius filtering." />
            <Value title="Account-based access" copy="Tenant, landlord, and administrator areas use the shared Supabase session foundation." />
            <Value title="Family safety tools" copy="Authenticated tenants can maintain guardian details and record safety check-ins." />
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-[#756960] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Brand className="text-lg" />
        <div className="flex flex-wrap gap-4">
          <Link href="/listings" className="font-semibold hover:text-[#443A34]">Listings</Link>
          <Link href="/messages" className="font-semibold hover:text-[#443A34]">Messages</Link>
          <Link href="/profile/family" className="inline-flex items-center gap-1 font-semibold hover:text-[#443A34]"><Users className="size-3.5" /> Family safety</Link>
        </div>
      </footer>
    </div>
  )
}

function Value({ title, copy }: { title: string; copy: string }) {
  return <article className="rounded-2xl border border-[#E7DED6] bg-white p-5"><h2 className="font-heading text-xl text-[#40362F]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#756960]">{copy}</p></article>
}
