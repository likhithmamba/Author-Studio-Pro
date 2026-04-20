import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineKey, HiOutlineCpuChip, HiOutlineChartBar, HiXMark } from 'react-icons/hi2';

export default function OnboardingOverlay({ onClose, onOpenSettings }) {
    const [step, setStep] = useState(1);

    const handleNext = () => setStep(s => Math.min(s + 1, 3));
    const handleSkip = () => {
        localStorage.setItem('asp_onboarded', 'true');
        onClose();
    };
    
    const finish = () => {
        localStorage.setItem('asp_onboarded', 'true');
        onClose();
    };

    return (
        <motion.div 
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div style={{
                background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
                width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                position: 'relative'
            }}>
                <button onClick={handleSkip} style={{
                    position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
                    color: '#6b6560', cursor: 'pointer'
                }} title="Skip">
                    <HiXMark size={20} />
                </button>

                <div style={{ padding: '32px 32px 0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    {step === 1 && (
                        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                            <div style={{ margin: '0 auto 16px', background: 'rgba(201, 145, 90, 0.1)', color: '#c9915a', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <HiOutlineKey size={28} />
                            </div>
                            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#e8e0d5' }}>Connect Your Engine</h2>
                            <p style={{ color: '#bbb', fontSize: '13px', lineHeight: 1.5 }}>
                                Author Studio Pro uses your own AI models. You'll need to set your free OpenRouter API key to unlock structural analysis.
                            </p>
                        </motion.div>
                    )}
                    {step === 2 && (
                        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                            <div style={{ margin: '0 auto 16px', background: 'rgba(155, 126, 200, 0.1)', color: '#9B7EC8', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <HiOutlineCpuChip size={28} />
                            </div>
                            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#e8e0d5' }}>Control Your Depth</h2>
                            <p style={{ color: '#bbb', fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>
                                Not all tasks need expensive intelligence.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', background: '#111', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#e8e0d5' }}><strong>Normal:</strong> Fast, cheap structural checks.</div>
                                <div style={{ fontSize: '12px', color: '#e8e0d5' }}><strong>Depth:</strong> Deep narrative synthesis.</div>
                                <div style={{ fontSize: '12px', color: '#e8e0d5' }}><strong>Extended:</strong> Max reasoning context.</div>
                            </div>
                            <p style={{ color: '#bbb', fontSize: '12px', marginTop: '16px' }}>We recommend starting with <strong>Normal</strong>.</p>
                        </motion.div>
                    )}
                    {step === 3 && (
                        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                            <div style={{ margin: '0 auto 16px', background: 'rgba(90, 173, 127, 0.1)', color: '#5AAD7F', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <HiOutlineChartBar size={28} />
                            </div>
                            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#e8e0d5' }}>Analyze Your Structure</h2>
                            <p style={{ color: '#bbb', fontSize: '13px', lineHeight: 1.5 }}>
                                Add a chapter to the Editor, and immediately click the <strong>Analyze</strong> tab in the sidebar to surface your first structural meta-signals into the canvas.
                            </p>
                        </motion.div>
                    )}
                </div>

                <div style={{ padding: '24px 32px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[1,2,3].map(i => (
                            <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: step === i ? '#c9915a' : '#333' }} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {step === 1 && (
                            <button onClick={() => { onOpenSettings(); handleNext(); }} style={{ background: 'transparent', border: '1px solid #444', color: '#e8e0d5', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                Set Key Now
                            </button>
                        )}
                        <button onClick={step === 3 ? finish : handleNext} style={{ background: '#c9915a', color: '#000', border: 'none', padding: '8px 24px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                            {step === 3 ? "Let's Go!" : "Next"}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
