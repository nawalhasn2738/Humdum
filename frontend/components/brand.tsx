import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex w-fit items-center gap-1.5 font-heading text-xl font-semibold text-[#3E332D]', className)}>
      <span aria-hidden="true" className="size-6 rounded-lg bg-gradient-to-br from-terracotta to-peach" />
      Humdum
    </Link>
  )
}
