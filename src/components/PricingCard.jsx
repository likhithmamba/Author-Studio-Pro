import React, { useState } from 'react';
import { HiOutlineCheck } from 'react-icons/hi2';

export default function PricingCard({ tier, price, description, features, recommended, isStudio, urgency }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (tier.toLowerCase() === 'free') {
      window.dispatchEvent(new CustomEvent('openAuthModal'));
      return;
    }

    setLoading(true);
    try {
      const order = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tier.toLowerCase(), amount: price * 100 })
      });
      const data = await order.json();
      if (!data.id) throw new Error("Order creation failed");

      const rzp = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: price * 100,
        currency: 'INR',
        name: 'Author Studio Pro',
        description: `${tier} Subscription`,
        order_id: data.id,
        handler: async (response) => {
          try {
            await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            });
            window.dispatchEvent(new CustomEvent('openAuthModal'));
          } catch (e) {
            console.error("Verification failed", e);
          }
        }
      });
      rzp.open();
    } catch (e) {
      console.error(e);
      // Fallback
      window.dispatchEvent(new CustomEvent('openAuthModal'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`pricing-card ${recommended ? 'recommended' : ''} ${isStudio ? 'studio' : ''}`}>
      {recommended && <div className="pricing-badge">RECOMMENDED</div>}
      <div className="pricing-header">
        <h3>{tier}</h3>
        <div className="pricing-price">
          {price === 0 ? 'Free' : `₹${price}`}
          {price > 0 && <span>/month</span>}
        </div>
        <p className="pricing-desc">{description}</p>
      </div>
      <ul className="pricing-features">
        {features.map((f, i) => (
          <li key={i}>
            <HiOutlineCheck className="pricing-check" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {urgency && <div className="pricing-urgency" style={{fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, fontStyle: 'italic', textAlign: 'center', lineHeight: 1.4}}>{urgency}</div>}
      <button 
        className={`pricing-btn ${recommended ? 'primary' : 'secondary'}`} 
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? 'Processing...' : (price === 0 ? 'Start Free' : 'Upgrade Now')}
      </button>
    </div>
  );
}
