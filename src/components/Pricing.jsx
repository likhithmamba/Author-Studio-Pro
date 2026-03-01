import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { HiOutlineCheck, HiOutlineStar, HiOutlineCheckCircle, HiOutlineExclamationCircle } from 'react-icons/hi2'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createOrder, verifyPayment } from '../api.js'
import AuthModal from './AuthModal'
import './Pricing.css'

const plans = [
    {
        name: 'Author',
        price: 'Free',
        period: '',
        description: 'Everything you need to format and analyse your first manuscript.',
        features: [
            '5 formatting templates',
            'Structural analysis (readability, pacing, style)',
            'Genre word count benchmarks',
            'Manual query package builder',
            'Submission knowledge base',
            '1 manuscript at a time',
        ],
        cta: 'Start Free',
        featured: false,
        color: 'var(--text-secondary)',
        planId: null, // free, no payment
    },
    {
        name: 'Studio',
        price: '$19',
        period: '/month',
        description: 'AI-powered analysis and query generation — what consultants charge $500+ for.',
        features: [
            'Everything in Author, plus:',
            'AI editorial assessment (3 strategic sections)',
            'AI query letter generation',
            'AI synopsis writer',
            'AI comp title suggestions',
            'Story intelligence extraction',
            'Unlimited manuscripts',
            'Priority support',
        ],
        cta: 'Start Free Trial',
        featured: true,
        color: 'var(--gold-primary)',
        planId: 'studio_monthly',
    },
    {
        name: 'Publisher',
        price: '$49',
        period: '/month',
        description: 'For agents, editors, and publishers processing multiple manuscripts.',
        features: [
            'Everything in Studio, plus:',
            'Batch processing (up to 50 manuscripts)',
            'Team access (5 seats)',
            'Custom template builder',
            'API access',
            'White-label reports',
            'Dedicated account manager',
            'SLA guarantee',
        ],
        cta: 'Contact Sales',
        featured: false,
        color: 'var(--accent-purple)',
        planId: 'publisher_monthly',
    },
]

// Load Razorpay script once
let razorpayScriptLoaded = false
function loadRazorpayScript() {
    if (razorpayScriptLoaded) return Promise.resolve()
    return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.onload = () => { razorpayScriptLoaded = true; resolve() }
        script.onerror = () => reject(new Error('Failed to load Razorpay'))
        document.body.appendChild(script)
    })
}

export default function Pricing() {
    const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 })
    const [paymentStatus, setPaymentStatus] = useState(null) // null | { type: 'success'|'error', message }
    const [processingPlan, setProcessingPlan] = useState(null)
    const [showAuth, setShowAuth] = useState(false)
    const { user, token, isSubscribed, refreshSubscription } = useAuth()

    const handlePayment = useCallback(async (plan) => {
        if (!plan.planId) return // free plan

        // Must be logged in to pay
        if (!user) {
            setShowAuth(true)
            return
        }

        setProcessingPlan(plan.name)
        setPaymentStatus(null)

        try {
            await loadRazorpayScript()

            // 1. Create order on backend
            const orderData = await createOrder(plan.planId, token)

            // 2. Open Razorpay checkout
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Author Studio Pro',
                description: orderData.plan_label,
                order_id: orderData.order_id,
                handler: async (response) => {
                    try {
                        // 3. Verify payment signature on backend
                        const result = await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        }, token)

                        setPaymentStatus({
                            type: 'success',
                            message: result.message || 'Payment successful! Your subscription is now active.',
                        })
                        refreshSubscription()
                    } catch (err) {
                        setPaymentStatus({
                            type: 'error',
                            message: err.detail || 'Payment verification failed. Please contact support.',
                        })
                    }
                    setProcessingPlan(null)
                },
                modal: {
                    ondismiss: () => {
                        setProcessingPlan(null)
                    },
                },
                prefill: {
                    email: user?.email || '',
                },
                theme: {
                    color: '#d4af37',
                    backdrop_color: 'rgba(0, 0, 0, 0.7)',
                },
            }

            const rzp = new window.Razorpay(options)
            rzp.on('payment.failed', (response) => {
                setPaymentStatus({
                    type: 'error',
                    message: response.error?.description || 'Payment failed. Please try again.',
                })
                setProcessingPlan(null)
            })
            rzp.open()

        } catch (err) {
            setPaymentStatus({
                type: 'error',
                message: err.detail || err.message || 'Could not initiate payment. Please try again.',
            })
            setProcessingPlan(null)
        }
    }, [user, token, refreshSubscription])

    return (
        <section id="pricing" className="pricing-section section">
            <div className="container">
                <motion.div
                    className="pricing-header"
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    ref={ref}
                >
                    <span className="section-label">✦ Pricing</span>
                    <h2 className="section-title">Invest in Your Writing Career</h2>
                    <p className="section-subtitle">
                        Professional manuscript services cost $500–$2,000 per project. Get the same intelligence for a fraction of the cost — or start completely free.
                    </p>
                </motion.div>

                {/* Payment status toast */}
                {paymentStatus && (
                    <motion.div
                        className={`pricing-toast ${paymentStatus.type}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {paymentStatus.type === 'success'
                            ? <HiOutlineCheckCircle />
                            : <HiOutlineExclamationCircle />
                        }
                        <span>{paymentStatus.message}</span>
                        <button onClick={() => setPaymentStatus(null)} className="pricing-toast-close">×</button>
                    </motion.div>
                )}

                <div className="pricing-grid">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            className={`pricing-card glass-card ${plan.featured ? 'pricing-featured' : ''}`}
                            initial={{ opacity: 0, y: 30 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: i * 0.12 }}
                            whileHover={{ y: -6 }}
                        >
                            {plan.featured && (
                                <div className="pricing-badge">
                                    <HiOutlineStar /> Most Popular
                                </div>
                            )}
                            <div className="pricing-plan-name" style={{ color: plan.color }}>{plan.name}</div>
                            <div className="pricing-price">
                                <span className="pricing-amount">{plan.price}</span>
                                {plan.period && <span className="pricing-period">{plan.period}</span>}
                            </div>
                            <p className="pricing-desc">{plan.description}</p>
                            <div className="pricing-features">
                                {plan.features.map((f, j) => (
                                    <div key={j} className="pricing-feature">
                                        <HiOutlineCheck className="pricing-check" style={{ color: plan.color }} />
                                        <span>{f}</span>
                                    </div>
                                ))}
                            </div>
                            {plan.price === 'Free' ? (
                                <Link to="/app" className="btn-secondary pricing-cta">
                                    {plan.cta}
                                </Link>
                            ) : plan.name === 'Publisher' ? (
                                <button className="btn-secondary pricing-cta">
                                    {plan.cta}
                                </button>
                            ) : (
                                <button
                                    className="btn-primary pricing-cta"
                                    onClick={() => handlePayment(plan)}
                                    disabled={processingPlan === plan.name || isSubscribed}
                                >
                                    {processingPlan === plan.name
                                        ? <><span className="pricing-spinner" /> Processing...</>
                                        : isSubscribed ? '✓ Subscribed' : plan.cta
                                    }
                                </button>
                            )}
                        </motion.div>
                    ))}
                </div>

                <motion.p
                    className="pricing-note"
                    initial={{ opacity: 0 }}
                    animate={inView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.5 }}
                >
                    All plans include end-to-end encryption, GDPR compliance, and zero data retention by default. Your manuscript never leaves your browser unless you explicitly enable AI features.
                </motion.p>
            </div>

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </section>
    )
}
