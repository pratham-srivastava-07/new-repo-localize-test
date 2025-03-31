const { t } = useTranslation();
  // const { t } = useTranslation();
// const { t } = useTranslation();

// import { useTranslation } from 'react-i18next';
import { useTranslation } from 'react-i18next';
import { I18nextProvider } from 'react-i18next';
import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import i18n from './i18n.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
  <I18nextProvider i18n={i18n}>
       {/* <App/> */}
  <Suspense>
         {/* <MainPage /> */}
  <App/>
  </Suspense>
  </I18nextProvider>
  </StrictMode>,
)
