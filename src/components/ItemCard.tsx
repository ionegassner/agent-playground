// Adapted from dopaminebuy ItemCard.tsx (MIT). Changed styling, catalog contract,
// navigation and removed client economy, membership and wishlist behavior.
import { motion } from 'framer-motion';
import type { Item } from '../lib/contracts';
import { formatCash } from '../lib/format';
import { Icon } from './Icon';
export function ItemCard({
  item,
  index = 0,
  onOpen,
}: {
  item: Item;
  index?: number;
  onOpen: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.35 }}
      className="product-card"
    >
      <button
        className="product-link"
        onClick={() => onOpen(item.id)}
        aria-label={`Inspect ${item.name}`}
      >
        <div className="product-art">
          <img src={item.image} alt={`${item.color} ${item.fit} headphones`} />
          {item.badge && (
            <span className={`product-badge ${item.id === 'cloud' ? 'limited' : ''}`}>
              {item.badge}
            </span>
          )}
          {!item.available && <span className="sold-out">Sold out</span>}
          <span className="product-open">
            <Icon name="up" size={18} />
          </span>
        </div>
        <div className="product-copy">
          <span className="eyebrow">{item.brand}</span>
          <h3>{item.name}</h3>
          <div className="product-bottom">
            <strong>{formatCash(item.price)}</strong>
            <span>
              <Icon name="star" size={13} />
              {item.rating.toFixed(1)}
            </span>
          </div>
          <p>
            {item.fit === 'over-ear' ? 'Over-ear' : 'In-ear'} · {item.color}
          </p>
        </div>
      </button>
    </motion.div>
  );
}
