import type { InquiryStatus } from '@/lib/api'

const labels: Record<InquiryStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

const styles: Record<InquiryStatus, string> = {
  pending: 'bg-[#F5E7C3] text-[#725C25]',
  accepted: 'bg-sage/55 text-[#4D5134]',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-[#EEE6DF] text-[#756960]',
}

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span className={'inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ' + styles[status]}>
      {labels[status]}
    </span>
  )
}
