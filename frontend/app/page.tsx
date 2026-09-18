import Link from 'next/link'
import {
  BellRing,
  Check,
  ChevronDown,
  LockKeyhole,
  Search,
  ShieldCheck,
} from 'lucide-react'

const features = [
  {
    title: 'Verified landlords, always',
    description:
      'Every host completes CNIC verification and a background check before a listing goes live.',
    icon: Check,
    iconClass: 'bg-blush text-[#7A4B49]',
  },
  {
    title: 'Curfews & guardian alerts',
    description:
      'Set house curfews upfront and let a family member get an automatic check-in notification.',
    icon: BellRing,
    iconClass: 'bg-peach text-[#805C32]',
  },
  {
    title: 'A composite safety score',
    description:
      'Lighting, CCTV coverage, and neighborhood data roll into one number you can trust.',
    icon: LockKeyhole,
    iconClass: 'bg-sage text-[#58543B]',
  },
]

const neighborhoods = [
  {
    name: 'F-7, Islamabad',
    href: '/?location=F-7',
    className: 'from-terracotta via-blush to-sage',
  },
  {
    name: 'Bahria Town, Rawalpindi',
    href: '/?location=Bahria+Town',
    className: 'from-peach via-peach-deep to-terracotta',
  },
  {
    name: 'Satellite Town, Rawalpindi',
    href: '/?location=Satellite+Town',
    className: 'from-sage via-[#E5BE95] to-peach-deep',
  },
]

function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-1.5 font-heading text-xl font-semibold text-[#3E332D]">
      <span
        aria-hidden="true"
        className="size-5 rounded-md bg-gradient-to-br from-terracotta to-peach"
      />
      Humdum
    </Link>
  )
}

function SearchForm() {
  return (
    <form
      action="/"
      method="get"
      className="grid overflow-hidden rounded-2xl border border-[#E7DED5] bg-white p-1.5 shadow-[0_10px_28px_rgba(94,73,55,0.08)] sm:grid-cols-[1.25fr_1fr_1fr_auto] sm:rounded-full"
    >
      <label className="relative flex min-w-0 items-center border-b border-[#EEE5DD] sm:border-b-0 sm:border-r">
        <span className="sr-only">Location</span>
        <select
          name="location"
          defaultValue=""
          className="h-11 w-full appearance-none bg-transparent px-4 pr-9 text-xs text-[#655A52] outline-none"
        >
          <option value="" disabled>Where to? F-7, E-11...</option>
          <option value="F-7">F-7, Islamabad</option>
          <option value="E-11">E-11, Islamabad</option>
          <option value="Bahria Town">Bahria Town</option>
          <option value="Satellite Town">Satellite Town</option>
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 size-3.5 text-[#8C8178]" />
      </label>

      <label className="relative flex min-w-0 items-center border-b border-[#EEE5DD] sm:border-b-0 sm:border-r">
        <span className="sr-only">Move-in date</span>
        <select
          name="moveIn"
          defaultValue=""
          className="h-11 w-full appearance-none bg-transparent px-4 pr-9 text-xs text-[#514740] outline-none"
        >
          <option value="" disabled>Move-in date</option>
          <option value="immediately">Immediately</option>
          <option value="two-weeks">Within 2 weeks</option>
          <option value="one-month">Within a month</option>
          <option value="flexible">I am flexible</option>
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 size-3.5 text-[#8C8178]" />
      </label>

      <label className="relative flex min-w-0 items-center">
        <span className="sr-only">Monthly budget</span>
        <select
          name="budget"
          defaultValue=""
          className="h-11 w-full appearance-none bg-transparent px-4 pr-9 text-xs text-[#514740] outline-none"
        >
          <option value="" disabled>Budget (PKR)</option>
          <option value="15000">Up to 15,000</option>
          <option value="25000">Up to 25,000</option>
          <option value="40000">Up to 40,000</option>
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 size-3.5 text-[#8C8178]" />
      </label>

      <button
        type="submit"
        className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-peach-deep px-5 text-xs font-bold text-[#49362A] shadow-[0_5px_14px_rgba(231,151,150,0.28)] transition hover:bg-peach sm:mt-0"
      >
        <Search aria-hidden="true" className="size-3.5" />
        Search homes
      </button>
    </form>
  )
}

export default function Page() {
  return (
    <div className="min-h-screen bg-cream text-[#443A34]">
      <header className="border-b border-[#EDE4DC]/70">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:min-h-20 lg:px-8">
          <Logo />
          <nav aria-label="Primary navigation" className="hidden items-center gap-7 text-xs font-semibold text-[#675D56] md:flex">
            <a href="#neighborhoods" className="transition hover:text-terracotta">Neighborhoods</a>
            <a href="#safety" className="transition hover:text-terracotta">Safety</a>
            <Link href="/login" className="transition hover:text-terracotta">Log in</Link>
          </nav>
          <Link
            href="/signup"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-peach-deep px-5 text-xs font-bold text-[#49362A] shadow-[0_6px_16px_rgba(231,151,150,0.25)] transition hover:bg-peach"
          >
            Get started
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-7 pt-10 sm:pt-16 lg:px-8 lg:pb-9 lg:pt-20">
          <div className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <h1 className="max-w-xl font-heading text-3xl leading-[1.1] text-[#3D332D] sm:text-4xl lg:text-[2.65rem]">
                A home in Islamabad that feels like it was made for you.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-6 text-[#776B63] sm:text-base sm:leading-7">
                Humdum is a rental platform built for women and students - every listing is safety-audited,
                every landlord verified, and every host family knows you&apos;re looked after.
              </p>
              <div className="mt-7 lg:-mr-12">
                <SearchForm />
              </div>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-[#6B6058] sm:text-xs">
                <span><strong className="text-[#453B35]">420+</strong> verified listings</span>
                <span><strong className="text-[#453B35]">96%</strong> guardian check-in rate</span>
                <span><strong className="text-[#453B35]">24/7</strong> masked support</span>
              </div>
            </div>

            <div className="relative min-h-[315px] overflow-hidden rounded-2xl bg-gradient-to-br from-blush via-peach to-[#E5C982] p-5 shadow-[0_18px_45px_rgba(132,91,63,0.12)] sm:min-h-[360px] sm:p-7">
              <div className="max-w-[270px] rounded-2xl bg-white p-5 shadow-[0_12px_24px_rgba(95,66,52,0.18)]">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xl font-bold leading-none text-[#3E352F]">91</p>
                    <p className="mt-1 text-[8px] font-bold uppercase text-[#746A63]">Safe</p>
                  </div>
                  <div className="border-l border-[#EEE5DD] pl-4">
                    <p className="text-xs font-bold text-[#413832]">Margalla View Residency</p>
                    <p className="mt-1 text-[10px] text-[#847971]">F-7/2, Islamabad</p>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-6 right-5 flex max-w-[245px] items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[10px] shadow-[0_10px_24px_rgba(95,66,52,0.2)] sm:bottom-7 sm:right-7">
                <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0 text-[#746F50]" />
                <span className="font-bold text-[#443B35]">Guardian check-in</span>
                <span className="text-[#8A7F77]">Confirmed 9:40 PM</span>
              </div>
            </div>
          </div>
        </section>

        <section id="safety" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-7 lg:px-8 lg:py-9">
          <div className="grid overflow-hidden rounded-2xl border border-[#E7DED5] bg-white shadow-[0_12px_30px_rgba(92,70,54,0.07)] md:grid-cols-3">
            {features.map(({ title, description, icon: Icon, iconClass }, index) => (
              <article
                key={title}
                className={index === 0 ? 'p-6 sm:p-7' : 'border-t border-[#E7DED5] p-6 sm:p-7 md:border-l md:border-t-0'}
              >
                <span className={'grid size-9 place-items-center rounded-full ' + iconClass}>
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <h2 className="mt-4 font-heading text-lg text-[#4B4039]">{title}</h2>
                <p className="mt-2 text-xs leading-5 text-[#786D65]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="neighborhoods" className="mx-auto max-w-6xl scroll-mt-6 px-5 pb-16 pt-10 sm:pb-20 sm:pt-14 lg:px-8">
          <h2 className="font-heading text-2xl text-[#453B35] sm:text-3xl">Popular neighborhoods</h2>
          <p className="mt-3 text-xs text-[#7A6F67] sm:text-sm">
            Islamabad and Rawalpindi areas students and working women choose most.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {neighborhoods.map((neighborhood) => (
              <Link
                key={neighborhood.name}
                href={neighborhood.href}
                className={'group relative flex aspect-[2.8/1] items-end overflow-hidden rounded-2xl bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg md:aspect-[2.35/1] ' + neighborhood.className}
              >
                <span aria-hidden="true" className="absolute inset-0 bg-white/5 transition group-hover:bg-transparent" />
                <span className="relative text-xs font-bold text-white drop-shadow-sm sm:text-sm">{neighborhood.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E7DED5]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-7 text-center sm:flex-row sm:text-left lg:px-8">
          <Logo />
          <p className="text-[11px] text-[#7A6F67]">
            &copy; 2026 Humdum. Built for safer student living in Islamabad &amp; Rawalpindi.
          </p>
        </div>
      </footer>
    </div>
  )
}
