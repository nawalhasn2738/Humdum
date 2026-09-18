import Link from 'next/link'
import {
  ArrowLeft,
  Ban,
  BellRing,
  Clock3,
  Home,
  Map,
  MessageCircle,
  Search,
  ShieldCheck,
  Users,
  UserRoundCheck,
  WalletCards,
} from 'lucide-react'

const gallery = [
  {
    src: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85',
    alt: 'Warm, bright shared living room at Margalla View Residency',
  },
  {
    src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=85',
    alt: 'Comfortable furnished bedroom',
  },
  {
    src: 'https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=900&q=85',
    alt: 'Secure apartment building exterior',
  },
]

const metrics = [
  { label: 'Lighting & CCTV coverage', score: 95 },
  { label: 'Guardian response time', score: 89 },
  { label: 'Neighborhood safety data', score: 90 },
]

const compliance = [
  'CDA verified',
  'Police NOC filed',
  'Landlord ID verified',
  'Female-only building',
]

const rules = [
  {
    icon: Clock3,
    text: 'Curfew: gates lock at 10:00 PM, guest sign-in required after 6 PM',
  },
  {
    icon: Users,
    text: 'Visitors: female guests only, front-desk log required',
  },
  {
    icon: Ban,
    text: 'No smoking or overnight male guests',
  },
  {
    icon: WalletCards,
    text: 'Deposit: PKR 30,000, refundable on 30-day notice',
  },
]

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-1.5 font-heading text-xl font-semibold text-[#3E332D]">
      <span aria-hidden="true" className="size-6 rounded-lg bg-gradient-to-br from-terracotta to-peach" />
      Humdum
    </Link>
  )
}

export default function ListingDetailPage() {
  return (
    <div className="min-h-screen bg-cream text-[#443A34]">
      <header className="sticky top-0 z-30 border-b border-[#E5DBD1] bg-cream/95 backdrop-blur">
        <div className="flex min-h-16 items-center gap-4 px-4 sm:px-6">
          <div className="w-auto shrink-0 lg:w-[220px]">
            <Brand />
          </div>

          <label className="relative mx-auto hidden w-full max-w-lg md:block">
            <span className="sr-only">Search listings by location</span>
            <Search aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#81756C]" />
            <input
              type="search"
              placeholder="Search F-7, Bahria Town, G-9..."
              className="h-10 w-full rounded-full border border-[#DDD2C7] bg-[#F6EDE4] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#83776E] focus:border-terracotta focus:bg-white focus:ring-3 focus:ring-blush/40"
            />
          </label>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full border border-[#DDD2C7] bg-[#F5ECE3] px-3 py-1 text-xs font-bold text-[#6C6058] sm:inline">
              Tenant
            </span>
            <Link
              href="/profile"
              aria-label="Open profile"
              className="grid size-9 place-items-center rounded-full bg-peach font-heading text-sm font-bold text-[#4B3B2D]"
            >
              A
            </Link>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-[#E5DBD1] px-4 py-3 lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
          <nav aria-label="Dashboard navigation" className="flex gap-2 overflow-x-auto lg:flex-col">
            <Link
              href="/listings"
              aria-current="page"
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl bg-white px-4 text-sm font-bold text-[#40362F] shadow-[0_6px_18px_rgba(87,64,50,0.06)]"
            >
              <Map className="size-4 text-[#77734E]" />
              Listings &amp; map
            </Link>
            <Link
              href="/messages"
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-[#756960] transition hover:bg-white/70 hover:text-[#40362F]"
            >
              <MessageCircle className="size-4 text-[#999268]" />
              Messages
            </Link>
            <Link
              href="/profile/family"
              className="flex min-h-11 shrink-0 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-[#756960] transition hover:bg-white/70 hover:text-[#40362F]"
            >
              <Users className="size-4 text-[#999268]" />
              Family safety
            </Link>
          </nav>
        </aside>

        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1080px]">
            <Link
              href="/listings"
              className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#756960] transition hover:text-terracotta"
            >
              <ArrowLeft className="size-4" />
              Back to listings
            </Link>

            <section aria-label="Property photo gallery" className="mt-3 grid h-[310px] grid-cols-[1.55fr_0.8fr] grid-rows-2 gap-2 overflow-hidden rounded-2xl bg-peach p-1.5 sm:h-[390px]">
              {gallery.map((image, index) => (
                <div key={image.src} className={'relative overflow-hidden ' + (index === 0 ? 'row-span-2' : '')}>
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="size-full object-cover"
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#8E5E45]/20 via-transparent to-blush/10" />
                </div>
              ))}
            </section>

            <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start">
              <div className="min-w-0">
                <section>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="font-heading text-3xl leading-tight text-[#40362F] sm:text-4xl">
                        Margalla View Residency
                      </h1>
                      <p className="mt-2 text-sm leading-6 text-[#7A6E65]">
                        F-7/2, Islamabad · Shared room in a 4-bedroom apartment
                      </p>
                    </div>
                    <span className="rounded-full bg-blush px-3 py-1.5 text-xs font-bold text-[#714A48]">
                      Female-only
                    </span>
                  </div>
                </section>

                <section className="mt-7 rounded-2xl border border-[#E4DAD0] bg-white p-5 shadow-[0_10px_28px_rgba(88,67,52,0.06)] sm:p-6">
                  <div className="grid gap-6 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
                    <div className="grid aspect-square place-items-center rounded-full bg-cream ring-8 ring-blush/35">
                      <div className="text-center">
                        <strong className="font-heading text-4xl leading-none text-[#40362F]">91</strong>
                        <p className="mt-1 text-[9px] font-bold uppercase text-[#73675F]">Safety index</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {metrics.map((metric) => (
                        <div key={metric.label}>
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold">
                            <span>{metric.label}</span>
                            <span>{metric.score}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#EEE5DC]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-sage to-[#88845D]"
                              style={{ width: metric.score + '%' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="mt-6">
                  <h2 className="sr-only">Compliance audit</h2>
                  <div className="flex flex-wrap gap-2">
                    {compliance.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 rounded-full border border-[#DDD2C7] bg-[#F6EDE4] px-3 py-1.5 text-xs font-bold text-[#5D5149]"
                      >
                        <ShieldCheck className="size-3.5 text-[#77734E]" />
                        {item}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="mt-7 pb-12">
                  <h2 className="font-heading text-2xl text-[#40362F]">House rules &amp; curfew</h2>
                  <div className="mt-3 divide-y divide-[#E3D9CF] border-y border-[#E3D9CF]">
                    {rules.map(({ icon: Icon, text }) => (
                      <div key={text} className="flex min-h-12 items-center gap-3 py-2 text-sm text-[#62564E]">
                        <Icon className="size-4 shrink-0 text-[#77734E]" />
                        <p>{text}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="rounded-2xl border border-[#E3D9CF] bg-white p-5 shadow-[0_14px_34px_rgba(88,67,52,0.09)] lg:sticky lg:top-24">
                <p className="font-heading text-3xl text-[#40362F]">
                  PKR 32,000<span className="font-body text-sm text-[#756960]">/month</span>
                </p>
                <p className="mt-3 text-sm text-[#756960]">
                  Deposit: PKR 30,000 · Bills not included
                </p>

                <button
                  type="button"
                  className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-peach to-peach-deep px-5 text-sm font-bold text-[#49362A] shadow-[0_7px_18px_rgba(231,151,150,0.24)] transition hover:brightness-[1.02]"
                >
                  Request to book
                </button>
                <Link
                  href="/messages"
                  className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#E0D6CC] bg-white px-5 text-sm font-bold text-[#493E37] transition hover:bg-cream"
                >
                  <MessageCircle className="size-4" />
                  Message landlord (masked)
                </Link>

                <div className="mt-5 flex items-center gap-3 rounded-xl bg-sage/35 p-3 text-xs text-[#5E5940]">
                  <UserRoundCheck className="size-5 shrink-0" />
                  <p>Landlord identity and property documents reviewed by Humdum.</p>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
