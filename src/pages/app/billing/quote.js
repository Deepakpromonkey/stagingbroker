// ════════════ FORMATTERS + FEE ENGINE — ported verbatim ════════════

// cents → "$1,234.00"
export const $ = (c) =>
  '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// cents → compact "$1.2k" / "$1.92M"
export const $k = (c) =>
  '$' + (c / 100000 >= 1000 ? (c / 100000000).toFixed(2) + 'M' : (c / 100000).toFixed(1) + 'k');

// fee engine — single source of truth
export function quote(amountCents, funding, delivery, tier = 'sub') {
  const platRate = tier === 'sub' ? 0.012 : 0.02; // subscribed 1.2% · pay-per-use 2.0%
  const platformFee = Math.round(amountCents * platRate);
  const fundingFee = funding === 'card' ? Math.round(amountCents * 0.029) : 0; // card 2.9% to payer
  const instantFee = delivery === 'instant' ? Math.round(amountCents * 0.01) : 0; // instant payout 1% to carrier
  const payerTotal = amountCents + fundingFee + (tier === 'guest' ? platformFee : 0); // guest fee on top, payer-borne
  const carrierNet = amountCents - (tier === 'sub' ? platformFee : 0) - instantFee; // subscribed fee netted from payout
  const eta = delivery === 'instant' ? 'Minutes after release (debit card)' : 'Next ACH batch · 6:00 PM CT';
  return { platformFee, fundingFee, instantFee, payerTotal, carrierNet, eta, platRate };
}

// ════════════ STATE MACHINE LABELS ════════════
export const STATES = {
  DRAFT: ['t-gray', 'Draft'],
  FUNDING_PENDING: ['t-blue', 'Funding pending'],
  FUNDED_HELD: ['t-amber', 'Funded · in hold'],
  CLEARED: ['t-amber', 'Cleared · in hold'],
  POD_VERIFIED: ['t-teal', 'POD verified'],
  RELEASED: ['t-blue', 'Released'],
  PAID_OUT: ['t-green', 'Paid out'],
  DISPUTED: ['t-red', 'Disputed'],
  REFUNDED: ['t-gray', 'Refunded'],
  AWAITING_CLAIM: ['t-purple', 'Awaiting carrier claim'],
  RETURNED: ['t-red', 'ACH returned'],
  HELD: ['t-red', 'Manual hold'],
};

export const RAIL_STEPS = ['FUNDING_PENDING', 'FUNDED_HELD', 'MANUAL_HOLD', 'CLEARED', 'POD_VERIFIED', 'RELEASED', 'CANCELLED'];
export const RAIL_LBL = {
  FUNDING_PENDING: 'Funded by payer',
  FUNDED_HELD: 'In payment hold',
  MANUAL_HOLD: 'Manual hold / Disputed',
  CLEARED: 'Funds cleared',
  POD_VERIFIED: 'POD verified',
  RELEASED: 'Released to carrier',
  CANCELLED: 'Transaction cancelled',
};
