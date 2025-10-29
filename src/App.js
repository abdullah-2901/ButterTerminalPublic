//App.js
// Import React and core dependencies
import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';

// Import asset icons
import web_icon from './assets/icons/web.svg';
import telegram_icon from './assets/icons/telegram_icon.svg';
import twitter_icon from './assets/icons/twitter_icon.svg';
import solscan_icon from './assets/icons/solscan.svg';


// Import styles
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import('@solana/wallet-adapter-react-ui/styles.css');

// Import custom components
import DashboardContent from './components/DashboardContent';
import { ButterTerminalContextProvider } from './components/ButterTerminalContext';
import ButterWalletPage from './components/ButterWallet';
import Deposit from './components/Deposit';
import AccountNewPage from './components/AccountNewPage';
import ErrorPage from './components/ErrorPage';
import AccountCreation from './components/AccountCreation';
import AccountFundsPage from './components/AccountFundsPage';
import TokenDetailPage from './components/TokenDetailPage';





// Main App component with routing
const App = () => {
    // const [showBuySellPopup, setShowBuySellPopup] = useState(false);

    return (
        <Provider store={store}>
            <ButterTerminalContextProvider>
                <Router>
                    <Routes>
                        <Route path="/" element={<DashboardContent />} />
                        <Route path="/butter-wallet" element={<ButterWalletPage />} />
                        <Route path="/wallet-created" element={<ButterWalletPage />} />
                        <Route path="/deposit-funds" element={<Deposit />} />
                        <Route path="/account" element={<AccountNewPage />} errorElement={<ErrorPage />}>
                            <Route index element={<Navigate to="/account/credentials" replace />} />
                            <Route path="credentials" element={<AccountCreation />} />
                            <Route path="wallet-funds" element={<AccountFundsPage />} />
                        </Route>
                        <Route path="/new-wallet-balance" element={<ButterWalletPage />} />
                        <Route 
                            path="/token/:tokenAddress" 
                            element={
                                <TokenDetailPage 
                                    solscan_icon={solscan_icon}
                                    web_icon={web_icon}
                                    telegram_icon={telegram_icon}
                                    twitter_icon={twitter_icon}
                                    // setShowBuySellPopup={setShowBuySellPopup}
                                    connected={false} // Add this
                                    updateChartStatus={() => {}} // Add this
                                    getPriceChange={() => {}} // Add this
                                />
                            } 
                        />
                        <Route path="*" element={
                            <div className="flex items-center justify-center min-h-screen">
                                <h1 className="text-2xl">Page not found</h1>
                            </div>
                        } />
                    </Routes>
                </Router>
            </ButterTerminalContextProvider>
        </Provider>
    );
};


export default App;