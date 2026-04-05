import { useEffect } from 'react';

export function useKeyboardShortcuts({
  onQuickCapture,
  onGlobalSearch,
  onTabSwitch,
  panelOpen,
  setPanelOpen,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + Shift + N -> Quick Capture
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (onQuickCapture) onQuickCapture();
        else window.dispatchEvent(new Event('openQuickCapture'));
        return;
      }
      
      // Cmd/Ctrl + Shift + F -> Global Search
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (onGlobalSearch) onGlobalSearch();
        else window.dispatchEvent(new Event('openGlobalSearch'));
        return;
      }

      // Cmd/Ctrl + 1-5 -> Tabs
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const tabMap = {
          '1': 'ideas',
          '2': 'whatif',
          '3': 'threads',
          '4': 'branches',
          '5': 'graveyard'
        };

        if (tabMap[e.key]) {
          e.preventDefault();
          if (!panelOpen) {
            setPanelOpen(true);
          }
          // Slight delay to ensure panel opens before switching if needed
          setTimeout(() => onTabSwitch(tabMap[e.key]), 0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onQuickCapture, onGlobalSearch, onTabSwitch, panelOpen, setPanelOpen]);
}
