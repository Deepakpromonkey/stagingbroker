import { Fragment, useCallback, useEffect, useState } from 'react';

import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';

import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import MailOutlineOutlined from '@mui/icons-material/MailOutlineOutlined';
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import TableViewOutlined from '@mui/icons-material/TableViewOutlined';

import { apiFetch, apiDownload } from '../../../lib/api';
import { toast } from '../../../components/ui/Toaster';

import { Card, thCls, tdCls } from '../DtPay/components/ui';

import { money, formatDate, formatPeriod, cardBrand } from './format';
import { StatusPill, btnGhost } from './components';

/*
| Every invoice ever raised against the account.
|
| The list is served from the API's local mirror of Stripe's invoices, so it
| loads at the speed of our own database and still reflects Stripe — the API
| tops the mirror up on read.
|
| A row opens to show what was actually billed — the line items come down with
| the list, so expanding one costs no request.
|
| Its actions: download is our own DollarTraq-branded PDF; email sends that same
| PDF out and asks Stripe to send its copy too; the arrow opens Stripe's hosted
| record, which is the one to quote in a chargeback. Export is the whole history
| as a CSV, for whoever closes the books.
*/
function BillingInvoices() {

    const [invoices, setInvoices] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [page, setPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Keyed by invoice uuid so two rows can be busy at once without one
    // spinner standing in for both.
    const [downloading, setDownloading] = useState({});
    const [emailing, setEmailing] = useState({});
    const [exporting, setExporting] = useState(false);

    // One row open at a time — the detail is tall enough that two expanded
    // rows push the rest of the table off the screen.
    const [expanded, setExpanded] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        setError('');

        apiFetch(`/billing/invoices?page=${page}`)
            .then((response) => {
                setInvoices(response?.data?.invoices || []);
                setPagination(response?.data?.pagination || null);
            })
            .catch((err) => setError(err?.message || 'We could not load your invoices.'))
            .finally(() => setLoading(false));
    }, [page]);

    useEffect(() => { load(); }, [load]);

    const download = (invoice) => {
        setDownloading((current) => ({ ...current, [invoice.uuid]: true }));

        // The API answers with the PDF itself, so this goes through apiDownload
        // rather than apiFetch — the response is a file, not JSON.
        apiDownload(
            `/billing/invoices/${invoice.uuid}/download`,
            `DollarTraq-Invoice-${invoice.number || invoice.uuid}.pdf`
        )
            .catch((err) => {
                toast.error({
                    title: 'Download failed',
                    message: err?.message || 'We could not build that invoice. Please try again.',
                });
            })
            .finally(() => {
                setDownloading((current) => ({ ...current, [invoice.uuid]: false }));
            });
    };

    /*
    | The whole history as a CSV. Separate from the PDF download because the
    | two answer different questions: the PDF is one invoice for a customer's
    | records, this is every invoice for whoever closes the books.
    */
    const exportCsv = () => {
        setExporting(true);

        apiDownload('/billing/invoices/export', 'DollarTraq-invoices.csv')
            .catch((err) => {
                toast.error({
                    title: 'Export failed',
                    message: err?.message || 'We could not build the export. Please try again.',
                });
            })
            .finally(() => setExporting(false));
    };

    const email = (invoice) => {
        setEmailing((current) => ({ ...current, [invoice.uuid]: true }));

        apiFetch(`/billing/invoices/${invoice.uuid}/email`, {
            method: 'POST',
            body: JSON.stringify({}),
        })
            .then((response) => {
                toast.success({
                    title: 'Invoice sent',
                    message: response?.message || 'The invoice is on its way.',
                });

                // `emailed_at` moves, and the row shows it.
                load();
            })
            .catch((err) => {
                toast.error({
                    title: 'Could not send',
                    message: err?.message || 'Please try again, or download the PDF instead.',
                });
            })
            .finally(() => {
                setEmailing((current) => ({ ...current, [invoice.uuid]: false }));
            });
    };

    const lastPage = pagination?.last_page || 1;

    return (
        <Card
            title="Invoice history"
            titleClass="text-gray-900"
            bodyClass="!p-0"
            tilleAction={
                <div className="flex items-center gap-3">
                    {pagination?.total > 0 && (
                        <span className="text-[11.5px] text-gray-400">
                            {pagination.total} invoice{pagination.total === 1 ? '' : 's'}
                        </span>
                    )}

                    {pagination?.total > 0 && (
                        <button className={btnGhost} onClick={exportCsv} disabled={exporting}>
                            {exporting
                                ? <CircularProgress size={13} />
                                : <TableViewOutlined sx={{ fontSize: 15 }} />}
                            Export CSV
                        </button>
                    )}
                </div>
            }
        >
            {loading ? (
                <div className="p-4">
                    {[0, 1, 2, 3, 4].map((row) => (
                        <Skeleton key={row} height={46} sx={{ transform: 'none', mb: 1, borderRadius: '8px' }} />
                    ))}
                </div>
            ) : error ? (
                <div className="px-4 py-10 text-center">
                    <div className="text-[13px] font-bold text-gray-900">{error}</div>
                    <button className={`${btnGhost} mt-4`} onClick={load}>Try again</button>
                </div>
            ) : invoices.length === 0 ? (
                <div className="px-4 py-14 text-center">
                    <ReceiptLongOutlined sx={{ fontSize: 34 }} className="text-gray-300" />
                    <div className="text-[13.5px] font-bold text-gray-900 mt-2">No invoices yet</div>
                    <p className="text-[12.5px] text-gray-500 mt-1 max-w-[380px] mx-auto leading-relaxed">
                        Your first invoice appears here as soon as a payment is taken. If you are on
                        a free trial, that is the day it ends.
                    </p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px]">
                            <thead>
                                <tr>
                                    <th className={thCls}>Invoice</th>
                                    <th className={thCls}>Date</th>
                                    <th className={thCls}>Service period</th>
                                    <th className={thCls}>Plan</th>
                                    <th className={`${thCls} text-right`}>Amount</th>
                                    <th className={thCls}>Status</th>
                                    <th className={`${thCls} text-right`}>&nbsp;</th>
                                </tr>
                            </thead>

                            <tbody>
                                {invoices.map((invoice) => (
                                    <Fragment key={invoice.uuid}>
                                    <tr
                                        onClick={() => setExpanded(
                                            expanded === invoice.uuid ? null : invoice.uuid
                                        )}
                                        className="cursor-pointer transition hover:bg-gray-50"
                                    >
                                        <td className={tdCls}>
                                            <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                                                <ExpandMoreOutlined
                                                    sx={{ fontSize: 16 }}
                                                    className={`text-gray-400 transition-transform ${
                                                        expanded === invoice.uuid ? 'rotate-180' : ''
                                                    }`}
                                                />
                                                {invoice.number || '—'}
                                            </div>
                                            {invoice.emailed_at && (
                                                <div className="text-[10.5px] text-gray-400 mt-0.5">
                                                    Emailed {formatDate(invoice.emailed_at)}
                                                </div>
                                            )}
                                        </td>

                                        <td className={`${tdCls} text-gray-600`}>
                                            {formatDate(invoice.issued_at)}
                                        </td>

                                        <td className={`${tdCls} text-gray-600`}>
                                            {formatPeriod(invoice.period_starts_at, invoice.period_ends_at)}
                                        </td>

                                        <td className={`${tdCls} text-gray-600`}>
                                            {invoice.plan_name || '—'}
                                        </td>

                                        <td className={`${tdCls} text-right font-semibold text-gray-900`}>
                                            {money(invoice.total, invoice.currency)}
                                        </td>

                                        <td className={tdCls}>
                                            <StatusPill
                                                status={invoice.is_overdue ? 'overdue' : invoice.status}
                                                size="sm"
                                            />
                                        </td>

                                        <td
                                            className={`${tdCls} text-right whitespace-nowrap`}
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            {/* The span is what Tooltip attaches its
                                                listeners to — a disabled button emits no
                                                events, and MUI warns about it. */}
                                            <Tooltip title="Download the DollarTraq invoice (PDF)" arrow>
                                                <span className="inline-block">
                                                    <button
                                                        onClick={() => download(invoice)}
                                                        disabled={downloading[invoice.uuid]}
                                                        className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-[#0052CC] disabled:opacity-50"
                                                    >
                                                        {downloading[invoice.uuid]
                                                            ? <CircularProgress size={13} />
                                                            : <DownloadOutlined sx={{ fontSize: 16 }} />}
                                                    </button>
                                                </span>
                                            </Tooltip>

                                            <Tooltip title="Email this invoice to the billing address" arrow>
                                                <span className="inline-block ml-1.5">
                                                    <button
                                                        onClick={() => email(invoice)}
                                                        disabled={emailing[invoice.uuid]}
                                                        className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 hover:text-[#0052CC] disabled:opacity-50"
                                                    >
                                                        {emailing[invoice.uuid]
                                                            ? <CircularProgress size={13} />
                                                            : <MailOutlineOutlined sx={{ fontSize: 16 }} />}
                                                    </button>
                                                </span>
                                            </Tooltip>

                                            {invoice.hosted_invoice_url && (
                                                <Tooltip title="Open Stripe's copy of this invoice" arrow>
                                                    <a
                                                        href={invoice.hosted_invoice_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg border border-gray-200 text-gray-600 ml-1.5 transition hover:bg-gray-50 hover:text-[#0052CC]"
                                                    >
                                                        <OpenInNewOutlined sx={{ fontSize: 15 }} />
                                                    </a>
                                                </Tooltip>
                                            )}
                                        </td>
                                    </tr>

                                    {/* What was actually billed. The lines come
                                        down with the list, so opening a row
                                        costs no request. */}
                                    {expanded === invoice.uuid && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-4 bg-gray-50 border-b border-gray-100">
                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                                                    <div className="lg:col-span-2">
                                                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                                                            What was billed
                                                        </div>

                                                        {invoice.lines?.length > 0 ? (
                                                            <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                                                                {invoice.lines.map((line, index) => (
                                                                    <div
                                                                        key={index}
                                                                        className="flex items-start justify-between gap-4 px-3.5 py-2.5"
                                                                    >
                                                                        <div>
                                                                            <div className="text-[12.5px] font-semibold text-gray-900">
                                                                                {line.description || 'Subscription'}
                                                                            </div>
                                                                            <div className="text-[11px] text-gray-500 mt-0.5">
                                                                                {formatPeriod(line.period_starts_at, line.period_ends_at)}
                                                                                {line.quantity > 1 && ` · ×${line.quantity}`}
                                                                                {line.proration && ' · prorated'}
                                                                            </div>
                                                                        </div>

                                                                        <div className="text-[12.5px] font-semibold text-gray-900 whitespace-nowrap">
                                                                            {money(line.amount, invoice.currency)}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-[12px] text-gray-500">
                                                                No line detail was recorded for this invoice.
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                                                            Totals
                                                        </div>

                                                        <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-2.5">
                                                            <div className="flex justify-between text-[12px] text-gray-600 py-1">
                                                                <span>Subtotal</span>
                                                                <span>{money(invoice.subtotal, invoice.currency)}</span>
                                                            </div>

                                                            {invoice.discount > 0 && (
                                                                <div className="flex justify-between text-[12px] text-gray-600 py-1">
                                                                    <span>Discount</span>
                                                                    <span>-{money(invoice.discount, invoice.currency)}</span>
                                                                </div>
                                                            )}

                                                            {invoice.tax > 0 && (
                                                                <div className="flex justify-between text-[12px] text-gray-600 py-1">
                                                                    <span>Tax</span>
                                                                    <span>{money(invoice.tax, invoice.currency)}</span>
                                                                </div>
                                                            )}

                                                            <div className="flex justify-between text-[13px] font-bold text-gray-900 py-1.5 mt-1 border-t border-gray-100">
                                                                <span>Total</span>
                                                                <span>{money(invoice.total, invoice.currency)}</span>
                                                            </div>

                                                            {invoice.is_paid ? (
                                                                <div className="text-[11px] text-green-700 mt-1.5">
                                                                    Paid {formatDate(invoice.paid_at)}
                                                                    {invoice.card_last4 &&
                                                                        ` · ${cardBrand(invoice.card_brand)} •••• ${invoice.card_last4}`}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[11px] text-amber-700 mt-1.5">
                                                                    {money(invoice.amount_due, invoice.currency)} outstanding
                                                                    {invoice.due_at && ` · due ${formatDate(invoice.due_at)}`}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {invoice.hosted_invoice_url && (
                                                            <a
                                                                href={invoice.hosted_invoice_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0052CC] mt-2.5 hover:underline"
                                                            >
                                                                <OpenInNewOutlined sx={{ fontSize: 13 }} />
                                                                Stripe&rsquo;s copy of this invoice
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {lastPage > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                            <span className="text-[11.5px] text-gray-500">
                                Page {pagination.current_page} of {lastPage}
                            </span>

                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                                    disabled={page <= 1}
                                    className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                                >
                                    <ChevronLeftIcon sx={{ fontSize: 18 }} />
                                </button>

                                <button
                                    onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                                    disabled={page >= lastPage}
                                    className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                                >
                                    <ChevronRightIcon sx={{ fontSize: 18 }} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}

export default BillingInvoices;
