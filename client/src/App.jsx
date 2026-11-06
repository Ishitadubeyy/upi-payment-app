import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { api, setAuthToken } from './services/api';
import {
  AppFrame,
  DemoProvider,
  HomePage,
  InsightsPage,
  LoginPage,
  ProfilePage,
  ReceivePage,
  RegisterPage,
  ScanPage,
  SendMoneyPage,
  TransactionDetailsPage,
  TransactionHistoryPage,
} from './pages/PayFlowPages.jsx';
import './App.css';

function AppRoutes() {
  const [apiState, setApiState] = useState('checking');

  useEffect(() => {
    const token = window.localStorage.getItem('payflow-demo-token');
    if (token) setAuthToken(token);
    api.get('/health')
      .then(() => setApiState('connected'))
      .catch(() => setApiState('offline'));
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/app/home" replace />} />
        <Route element={<AppFrame apiState={apiState} />}>
          <Route path="/app/home" element={<HomePage />} />
          <Route path="/app/send" element={<SendMoneyPage />} />
          <Route path="/app/receive" element={<ReceivePage />} />
          <Route path="/app/scan" element={<ScanPage />} />
          <Route path="/app/history" element={<TransactionHistoryPage />} />
          <Route path="/app/transactions/:id" element={<TransactionDetailsPage />} />
          <Route path="/app/insights" element={<InsightsPage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>
      <Toaster position="top-center" toastOptions={{ duration: 2800 }} />
    </>
  );
}

export default function App() {
  return (
    <DemoProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </DemoProvider>
  );
}
