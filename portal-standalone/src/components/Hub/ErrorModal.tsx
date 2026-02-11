import React from 'react';
import { AlertCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ErrorDetails, getErrorSeverity } from '../../lib/coursebuilder/errorHandler';

interface ErrorModalProps {
  error: ErrorDetails;
  onClose: () => void;
  onRetry?: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ error, onClose, onRetry }) => {
  const severity = getErrorSeverity(error);

  const getSeverityIcon = () => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-12 h-12 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-yellow-600" />;
      default:
        return <Info className="w-12 h-12 text-blue-600" />;
    }
  };

  const getSeverityColors = () => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          headerBg: 'bg-red-100',
          text: 'text-red-900'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          headerBg: 'bg-yellow-100',
          text: 'text-yellow-900'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          headerBg: 'bg-blue-100',
          text: 'text-blue-900'
        };
    }
  };

  const colors = getSeverityColors();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className={`${colors.headerBg} ${colors.border} border-b-2 p-6 rounded-t-2xl`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {getSeverityIcon()}
              <div>
                <h2 className={`text-2xl font-bold ${colors.text}`}>{error.title}</h2>
                <p className={`${colors.text} mt-1`}>{error.message}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error.suggestions && error.suggestions.length > 0 && (
            <div className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4`}>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                How to Fix This
              </h3>
              <ul className="space-y-2">
                {error.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error.recoveryActions && error.recoveryActions.length > 0 && (
            <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Recovery Options</h3>
              <div className="space-y-2">
                {error.recoveryActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left text-sm font-medium text-gray-700"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error.technicalDetails && (
            <details className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4">
              <summary className="font-bold text-gray-900 cursor-pointer">
                Technical Details
              </summary>
              <pre className="mt-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                {error.technicalDetails}
              </pre>
            </details>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-2xl flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
          >
            Close
          </button>
          {onRetry && (
            <button
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
