import { loadStripe } from '@stripe/stripe-js';

/*
 * Stripe.js, loaded once per publishable key. The key comes from the API
 * (DT Pay's own keys), never from the bundle, so staging can run on test
 * keys while production runs live.
 */
const cache = new Map();

export function stripeFor(publishableKey) {
    if (!publishableKey) return null;
    if (!cache.has(publishableKey)) cache.set(publishableKey, loadStripe(publishableKey));
    return cache.get(publishableKey);
}
