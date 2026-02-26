export default function StatusBadge({ status }) {
    const config = {
        DRAFT: 'badge badge-draft',
        SENT: 'badge badge-sent',
        ACCEPTED: 'badge badge-accepted',
        REJECTED: 'badge badge-rejected',
        INVOICED: 'badge badge-invoiced',
        COMPLETED: 'badge badge-accepted',
        PENDING: 'badge badge-pending',
        PARTIAL: 'badge badge-partial',
        PAID: 'badge badge-paid',
    };

    return (
        <span className={config[status] || 'badge badge-draft'}>
            {status === 'SENT' && <span className="pulse-dot" />}
            {status}
        </span>
    );
}
