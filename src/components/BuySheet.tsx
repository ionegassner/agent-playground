// Adapted from dopaminebuy BuySheet.tsx (MIT). Preserves the purchase-sheet
// interaction and animated phases; the server now commits and verifies orders.
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Item, Purchase } from '../lib/contracts';
import { formatCash } from '../lib/format';
import { Icon } from './Icon';
type Phase = 'idle' | 'charging' | 'success' | 'error';
export function BuySheet({
  item,
  onClose,
  onBuy,
}: {
  item: Item;
  onClose: () => void;
  onBuy: (purchase: Purchase) => Promise<string | undefined>;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [extras, setExtras] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const submission = useRef<string | null>(null);
  useEffect(() => {
    const modal = dialog.current;
    modal?.showModal();
    return () => modal?.close();
  }, []);
  const total = item.price * quantity + item.shipping + (extras ? 8 : 0);
  async function handleBuy(event: React.FormEvent) {
    event.preventDefault();
    setPhase('charging');
    setError(null);
    submission.current ??= crypto.randomUUID();
    try {
      const message = await onBuy({
        submissionId: submission.current,
        itemId: item.id,
        quantity,
        extras,
      });
      if (message) {
        setError(message);
        setPhase('error');
        submission.current = null;
      } else setPhase('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      setPhase('error');
    }
  }
  const busy = phase === 'charging' || phase === 'success';
  const change = () => {
    submission.current = null;
    if (phase === 'error') {
      setPhase('idle');
      setError(null);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="purchase-dialog"
      aria-labelledby="checkout-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      >
        <div className="sheet-header">
          <span className="eyebrow">OFFLINE / CHECKOUT</span>
          <button
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close checkout"
          >
            <Icon name="close" />
          </button>
        </div>
        <h2 id="checkout-title">Almost out of here.</h2>
        <p className="muted">One last check. All money and orders are fictional.</p>
        <div className="checkout-product">
          <img src={item.image} alt="" />
          <div>
            <span className="eyebrow">{item.brand}</span>
            <h3>{item.name}</h3>
            <span>{formatCash(item.price)} + delivery</span>
          </div>
        </div>
        <form onSubmit={handleBuy}>
          <fieldset disabled={busy} className="checkout-fields">
            <legend>Your order</legend>
            <label className="quantity-label">
              Quantity
              <select
                value={quantity}
                onChange={(e) => {
                  setQuantity(Number(e.target.value));
                  change();
                }}
              >
                <option value="1">1 pair</option>
                <option value="2">2 pairs</option>
                <option value="3">3 pairs</option>
              </select>
            </label>
            <label className="extra-option">
              <input
                type="checkbox"
                checked={extras}
                onChange={(e) => {
                  setExtras(e.target.checked);
                  change();
                }}
              />
              <span>
                <strong>Make it a gift</strong>
                <small>A little ribbon. A little extra.</small>
              </span>
              <b>+$8</b>
            </label>
          </fieldset>
          <div className="order-summary">
            <Row label={`Headphones × ${quantity}`} value={formatCash(item.price * quantity)} />
            <Row label="Standard delivery" value={formatCash(item.shipping)} />
            {extras && <Row label="Gift wrap" value="$8" />}
            <Row label="Total" value={formatCash(total)} bold />
          </div>
          {error && (
            <p className="error-message" role="alert">
              <Icon name="info" size={18} />
              {error}
            </p>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="button dark full"
            disabled={busy}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={phase}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {phase === 'charging'
                  ? 'Verifying order…'
                  : phase === 'success'
                    ? 'Order confirmed'
                    : phase === 'error'
                      ? 'Try checkout again'
                      : `Place order · ${formatCash(total)}`}
              </motion.span>
            </AnimatePresence>
            <Icon name="arrow" />
          </motion.button>
        </form>
        <p className="checkout-note">
          <Icon name="shield" size={14} /> No card, no payment, no delivery. Just a challenge.
        </p>
      </motion.div>
    </dialog>
  );
}
function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`summary-row ${bold ? 'total' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
