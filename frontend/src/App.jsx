import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import AgentsList from './pages/admin/AgentsList';
import AgentDetail from './pages/admin/AgentDetail';
import CountriesList from './pages/admin/CountriesList';
import RatesList from './pages/admin/RatesList';
import BalancesList from './pages/admin/BalancesList';
import AgentsGains from './pages/admin/GainAgent';
import PayementMethodList from './pages/admin/PaymentMethodsList';
import AuthorizedNumbersList from './pages/admin/AuthorizedNumbersList';
import TransactionsList from './pages/admin/TransactionsList';
import HistoryList from './pages/admin/HistoryList';
import AdminLayout from './components/ui/AdminLayout';
import ProtectedRoute from './components/ui/ProtectedRoute';


import AgentLogin from "./pages/Agents/AgentLogin";
import AgentDashboard from "./pages/Agents/AgentDashboard";
import TransactionList from "./pages/Agents/MyTransactions";
import TransactionDetails from "./pages/Agents/TransactionDetail";
import AgentRedirectedTransactions from "./pages/Agents/AgentRedirectedTransactions";
// import MyBalances from "./pages/agents/MyBalances";
// import AgentHistory from "./pages/Agents/History";
import AgentLayout from "./layouts/AgentLayout";
import ProtectedRouteAgent from "./components/ui/ProtectedRouteAgent";
// import NotFound from './pages/NotFound';


import PublicLayout from "./layouts/PublicLayout";
import HomePage from "./pages/HomePage";
import TransactionPage from "./components/public/TransactionForm";
import TransactionClientDetail from "./components/public/TransactionDetail"
import TrackingPage from "./components/public/TrackingForm";
import SupportPage from "./components/public/ServiceClient";
import CalculatorPage from "./components/public/ConversionCalculator";


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/login" element={<Login />} />

          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="agents" element={<AgentsList />} />
            <Route path="agents/:id" element={<AgentDetail />} />
            <Route path="countries" element={<CountriesList />} />
            <Route path="rates" element={<RatesList />} />
            <Route path="balances" element={<BalancesList />} />
            <Route path="agent-gains" element={<AgentsGains />} />
            <Route path="payements" element={<PayementMethodList />} />
            <Route path="numbers" element={<AuthorizedNumbersList />} />
            <Route path="transactions" element={<TransactionsList />} />
            <Route path="historiques" element={<HistoryList />} />
            {/* autres routes admin */}
          </Route>

          {/* <Route path="*" element={<NotFound />} /> */}

          <Route path="/agent/login" element={<AgentLogin />} />

            <Route
              path="/agent"
              element={
                <ProtectedRouteAgent>
                  <AgentLayout />
                </ProtectedRouteAgent>
              }
            >
              <Route path="dashboard" element={<AgentDashboard />} />
              <Route path="transactions" element={<TransactionList />} />
              <Route path="/agent/transactions/:id" element={<TransactionDetails />} />
              <Route path="redirected-transactions" element={<AgentRedirectedTransactions />} />
              {/* <Route path="balances" element={<MyBalances />} /> */}
              {/* <Route path="history" element={<AgentHistory />} /> */}
            </Route>

          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            
            <Route path="/transaction" element={<TransactionPage />} />
            <Route path="/transaction/:encryptedId" element={<TransactionClientDetail />} />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/calculator" element={<CalculatorPage />} />

          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}