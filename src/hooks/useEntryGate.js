import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function useEntryGate() {
  const [shouldRedirect, setShouldRedirect] = useState(null);
  const { user, token, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // wait for auth context to load
    
    const entered = localStorage.getItem('inkforge_entered_app') === 'true';
    if (user || token || entered) {
      setShouldRedirect(true);
    } else {
      setShouldRedirect(false);
    }
  }, [user, token, loading]);

  return { shouldRedirect };
}
