import React from 'react';

interface ModuleTileProps {
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  locked?: boolean;
  lockedMessage?: string;
  stats?: string;
  onClick: () => void;
}

const ModuleTile: React.FC<ModuleTileProps> = ({
  title,
  description,
  icon,
  enabled,
  locked = false,
  lockedMessage = 'Coming Soon',
  stats,
  onClick
}) => {
  const isAccessible = enabled && !locked;

  return (
    <div
      onClick={isAccessible ? onClick : undefined}
      className={`
        relative bg-white rounded-2xl shadow-lg border-2 p-6
        transition-all duration-300 flex flex-col
        ${isAccessible 
          ? 'border-blue-200 hover:border-blue-500 hover:shadow-xl cursor-pointer hover:-translate-y-1' 
          : 'border-gray-200 opacity-60 cursor-not-allowed'
        }
      `}
    >
      {!isAccessible && (
        <div className="absolute top-4 right-4">
          <span className="text-2xl">🔒</span>
        </div>
      )}

      <div className={`text-5xl mb-4 ${!isAccessible ? 'grayscale' : ''}`}>
        {icon}
      </div>

      <h3 className={`text-xl font-bold mb-2 ${isAccessible ? 'text-gray-900' : 'text-gray-500'}`}>
        {title}
      </h3>

      <p className={`text-sm mb-4 flex-1 ${isAccessible ? 'text-gray-600' : 'text-gray-400'}`}>
        {description}
      </p>

      {isAccessible && stats && (
        <div className="text-sm font-semibold text-blue-600 mb-4">
          {stats}
        </div>
      )}

      {!isAccessible && (
        <div className="text-sm font-semibold text-gray-400 mb-4">
          {lockedMessage}
        </div>
      )}

      <div className="pt-4 border-t border-gray-100">
        {isAccessible ? (
          <div className="flex items-center justify-between">
            <span className="text-blue-600 font-semibold">Launch</span>
            <span className="text-blue-600">→</span>
          </div>
        ) : (
          <span className="text-gray-400 font-semibold">
            Request Access
          </span>
        )}
      </div>
    </div>
  );
};

export default ModuleTile;
