import React from 'react';

export default function QuickCaptureInbox({ open, onClose }) {
    if (!open) return null;

    return (
        <>
            <div style={{
                position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0)'
            }} onClick={onClose} />
            <div style={{
                position: 'fixed', right: 0, top: 0, height: '100vh', width: '360px',
                background: '#1a1a1a', borderLeft: '1px solid #2a2a2a', zIndex: 200,
                boxShadow: '-8px 0 24px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column'
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px', borderBottom: '1px solid #2a2a2a'
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontFamily: '"Cormorant Garamond", serif', color: '#e8e0d5' }}>
                        Inbox
                    </h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button style={{ background: 'none', border: 'none', color: '#c9915a', cursor: 'pointer', fontSize: '12px' }}>
                            Mark all read
                        </button>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b6560', cursor: 'pointer' }}>
                            ✕
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, padding: '16px', color: '#6b6560', textAlign: 'center', fontSize: '14px', marginTop: '40px' }}>
                    Nothing in your inbox right now.
                </div>
            </div>
        </>
    );
}
