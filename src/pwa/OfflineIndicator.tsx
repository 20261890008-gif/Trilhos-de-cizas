import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-[#101013] border border-zinc-600 px-3.5 py-2 text-xs font-mono-tabular text-zinc-200 pointer-events-none">
      <WifiOff className="w-3.5 h-3.5 text-zinc-300" />
      <span>Modo Offline — Cache ativo</span>
    </div>
  );
}
