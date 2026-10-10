import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/cyrillic-400.css';
import '@fontsource/nunito/cyrillic-600.css';
import '@fontsource/nunito/cyrillic-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/lora/cyrillic-600.css';
import '@fontsource/lora/latin-600.css';
import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
