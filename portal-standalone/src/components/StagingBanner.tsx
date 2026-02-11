import { AlertTriangle } from 'lucide-react';

const StagingBanner = () => {
  const isStaging = import.meta.env.VITE_APP_ENV === 'staging';
  
  if (!isStaging) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-amber-950 px-4 py-2 text-center font-bold text-sm flex items-center justify-center gap-2 shadow-md">
      <AlertTriangle className="w-4 h-4" />
      STAGING ENVIRONMENT - Not for production use
      <AlertTriangle className="w-4 h-4" />
    </div>
  );
};

export default StagingBanner;
