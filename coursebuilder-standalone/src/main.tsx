import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://bac2ada362e30b14ceab351082902813@o4510696793112576.ingest.us.sentry.io/4510696800714752",
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1,
  beforeSend(event) {
    event.tags = { ...event.tags, app: 'coursebuilder' };
    return event;
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
