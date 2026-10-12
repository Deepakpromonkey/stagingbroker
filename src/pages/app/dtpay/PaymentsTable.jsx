import { useNavigate } from 'react-router-dom';
import { date } from './format';
import { Amount, DataTable, Empty, StatusBadge } from './ui';

/* Payments in the app's table style. Click a row to open the payment. */
export default function PaymentsTable({ rows, loading, empty }) {
    const navigate = useNavigate();

    const columns = [
        { key: 'ref', label: 'Reference', render: (p) => <span className='font-bold text-[#003178]'>{p.reference}</span> },
        {
            key: 'carrier', label: 'Carrier', render: (p) => (
                <>
                    <div className='font-semibold'>{p.carrier.name || 'Carrier'}</div>
                    <div className='mt-0.5 text-[11.5px] text-[#8a94a6]'>DOT {p.carrier.dot}</div>
                </>
            ),
        },
        {
            key: 'load', label: 'Load', render: (p) => (
                <>
                    <div>{p.load_number || '—'}</div>
                    {(p.origin || p.destination) && <div className='mt-0.5 text-[11.5px] text-[#8a94a6]'>{p.origin || '?'} to {p.destination || '?'}</div>}
                </>
            ),
        },
        { key: 'method', label: 'Paid with', render: (p) => <span className='text-[#475569]'>{p.method_label || '—'}</span> },
        { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status} onHold={p.on_hold} refundRequested={p.refund_requested} /> },
        { key: 'amount', label: 'Amount', align: 'right', render: (p) => <Amount value={p.amount.formatted} className='font-bold text-[#0f172a]' /> },
        { key: 'date', label: 'Created', align: 'right', render: (p) => <span className='whitespace-nowrap text-[#6b7280]'>{date(p.created_at)}</span> },
    ];

    return (
        <DataTable
            columns={columns}
            rows={rows || []}
            loading={loading}
            onRowClick={(p) => navigate(`/dt-pay/transactions/view/${p.id}`)}
            empty={empty || <Empty title='No payments here'>Try another filter.</Empty>}
            minWidth={880}
        />
    );
}
