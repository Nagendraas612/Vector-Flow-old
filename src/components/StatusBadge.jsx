// Plain words for payment and attendance states. The database values
// (PENDING_REVIEW, VERIFIED, and so on) are never shown raw.
const PAYMENT_LABELS = {
  NOT_REQUIRED: 'No payment needed',
  PENDING_REVIEW: 'Payment under review',
  VERIFIED: 'Payment verified',
  REJECTED: 'Payment needs attention',
}

const ATTENDANCE_LABELS = {
  UNMARKED: 'Attendance not marked yet',
  PRESENT: 'Present',
  ABSENT: 'Absent',
}

export default function StatusBadge({ paymentStatus, attendance, status }) {
  return (
    <span>
      <span className="badge">{PAYMENT_LABELS[paymentStatus] || paymentStatus}</span>{' '}
      <span className="badge">{ATTENDANCE_LABELS[attendance] || attendance}</span>{' '}
      {status === 'CANCELLED' ? <span className="badge">Cancelled</span> : null}
    </span>
  )
}
