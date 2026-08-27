import { useEffect, useState } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import CloseIcon from '@mui/icons-material/Close';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';

import { apiFetch } from '../../../lib/api';
import { toast } from '../../../components/ui/Toaster';

import { formatDate } from './format';
import { btnGhost, btnDanger } from './components';

/*
| Cancelling a subscription.
|
| Two things are asked and both matter. When it should end — the default is the
| close of the period the customer has already paid for, because ending it
| early forfeits days they have been charged for and Stripe refunds nothing
| either way. And why — passed to Stripe as cancellation feedback, so churn
| shows up in Stripe's own reporting rather than only in our logs.
|
| The reason is optional. Making it mandatory to leave is a dark pattern, and
| it produces worse data than asking politely.
*/
function CancelSubscriptionDialog({ open, onClose, subscription, reasons = [], allowImmediate, onCancelled }) {

    const [timing, setTiming] = useState('period_end');
    const [reason, setReason] = useState('');
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // A dialog reopened after a cancelled attempt should not still be holding
    // the previous answers.
    useEffect(() => {
        if (!open) return;

        setTiming('period_end');
        setReason('');
        setComment('');
        setSubmitting(false);
    }, [open]);

    const periodEnd = subscription?.current_period_ends_at;

    const handleSubmit = () => {
        setSubmitting(true);

        apiFetch('/billing/subscription/cancel', {
            method: 'POST',
            body: JSON.stringify({
                immediately: timing === 'immediately',
                reason: reason || null,
                comment: comment.trim() || null,
            }),
        })
            .then((response) => {
                toast.success({
                    title: 'Subscription cancelled',
                    message: response?.message || 'Your subscription has been cancelled.',
                });

                onCancelled?.(response?.data?.subscription);
                onClose?.();
            })
            .catch((error) => {
                toast.error({
                    title: 'Could not cancel',
                    message: error?.message || 'Please try again, or contact support.',
                });
            })
            .finally(() => setSubmitting(false));
    };

    return (
        <Dialog
            open={open}
            maxWidth="sm"
            fullWidth
            onClose={submitting ? undefined : onClose}
            slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden' } } }}
        >
            <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <WarningAmberOutlined sx={{ fontSize: 19 }} />
                </div>

                <div className="flex-1">
                    <h3 className="text-[16px] font-black text-gray-900">Cancel your subscription</h3>
                    <p className="text-[12.5px] text-gray-500 mt-0.5 leading-relaxed">
                        You can cancel at any time. Nothing is deleted — your loads, carriers and
                        documents stay exactly as they are.
                    </p>
                </div>

                <IconButton size="small" onClick={onClose} disabled={submitting}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </div>

            <DialogContent sx={{ px: 3, py: 3, backgroundColor: '#F8FAFC' }}>

                {/* ── When ─────────────────────────────────────────── */}

                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                    When should it end?
                </div>

                <label
                    className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition mb-2.5 ${
                        timing === 'period_end'
                            ? 'border-[#0052CC] bg-blue-50/50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                    <input
                        type="radio"
                        name="cancel-timing"
                        checked={timing === 'period_end'}
                        onChange={() => setTiming('period_end')}
                        className="mt-[3px] accent-[#0052CC]"
                    />
                    <div>
                        <div className="text-[13px] font-bold text-gray-900">
                            At the end of this billing period
                        </div>
                        <div className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
                            {periodEnd
                                ? `You keep full access until ${formatDate(periodEnd)} and are not charged again.`
                                : 'You keep full access for the rest of the period you have paid for.'}
                        </div>
                    </div>
                </label>

                {allowImmediate && (
                    <label
                        className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                            timing === 'immediately'
                                ? 'border-[#0052CC] bg-blue-50/50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                        <input
                            type="radio"
                            name="cancel-timing"
                            checked={timing === 'immediately'}
                            onChange={() => setTiming('immediately')}
                            className="mt-[3px] accent-[#0052CC]"
                        />
                        <div>
                            <div className="text-[13px] font-bold text-gray-900">Immediately</div>
                            <div className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
                                Access ends now. The rest of this period is not refunded.
                            </div>
                        </div>
                    </label>
                )}

                {/* ── Why ──────────────────────────────────────────── */}

                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-5 mb-2">
                    Why are you leaving? <span className="font-normal normal-case tracking-normal">(optional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {reasons.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setReason(reason === item.key ? '' : item.key)}
                            className={`text-left rounded-lg border px-3 py-2.5 text-[12.5px] transition ${
                                reason === item.key
                                    ? 'border-[#0052CC] bg-blue-50/50 text-gray-900 font-semibold'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Anything else you want us to know?"
                    className="w-full mt-3 px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] text-gray-800 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0052CC] placeholder:text-gray-400"
                />

            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2.5, gap: 1 }}>
                <button type="button" className={btnGhost} onClick={onClose} disabled={submitting}>
                    Keep my subscription
                </button>

                <button type="button" className={btnDanger} onClick={handleSubmit} disabled={submitting}>
                    {submitting && <CircularProgress size={13} sx={{ color: '#DC2626' }} />}
                    {timing === 'immediately' ? 'Cancel now' : 'Confirm cancellation'}
                </button>
            </DialogActions>
        </Dialog>
    );
}

export default CancelSubscriptionDialog;
