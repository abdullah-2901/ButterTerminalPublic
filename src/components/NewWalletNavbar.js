import React, { memo, useCallback, useEffect, useState, useContext } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';
import ButterTerminalContext from './ButterTerminalContext';
// Telegram auth now handled by buttertrade.online - import removed

// Define the menu items for the navigation
const MENU_ITEMS = [];

// Define routes that should show the menu items
const MENU_ROUTES = [
   
    '/account/credentials',
    '/account/wallet-funds'
];

const NewWalletNavbar = () => {
    // Hooks for navigation and location
    const navigate = useNavigate();
    const location = useLocation();
    const { publicKey } = useWallet();
    const { butterWalletCredentials, getWallet } = useContext(ButterTerminalContext);

    // Local state management for wallet and account details
    const [walletDetails, setWalletDetails] = useState(null);
    const [accountDetails, setAccountDetails] = useState({
        solBalance: 0,
        butterBalance: 0
    });
    const [isLoading, setIsLoading] = useState(false);
    const [telegramUser, setTelegramUser] = useState(null);
    const AUTH_APP_DOMAIN = 'https://buttertrade.online';

    const onConnectTelegram = async () => {
        try {
            // Check if already linked (via butterWalletCredentials from context)
            if (butterWalletCredentials?.telegram_id != null) {
                return;
            }
            // Redirect to auth app on buttertrade.online
            const returnUrl = encodeURIComponent(`${window.location.origin}${window.location.pathname}`);
            const authUrl = `${AUTH_APP_DOMAIN}/?returnUrl=${returnUrl}`;
            window.location.href = authUrl;
        } catch (e) {
            toast.error(e.message || 'Telegram connect failed');
        }
    };

    // Function to fetch butter wallet details
    const fetchButterWallet = useCallback(async (address) => {
        try {
            const response = await axios.get('https://trd.buttertrade.xyz/api/walletsinfo', {
                params: { publicKey: address.toString() }
            });

            if (response.data.success && Array.isArray(response.data.data)) {
                if (response.data.data.length > 0) {
                    const wd = response.data.data[0];
                    setWalletDetails(wd);
                    // Apply telegram_id from walletsinfo if present
                    const tgid = wd?.telegram_id;
                    if (tgid) {
                        const isNumeric = /^\d+$/.test(String(tgid));
                        const userObj = isNumeric
                            ? { id: String(tgid), username: '' }
                            : { id: '', username: String(String(tgid).replace(/^@/, '')) };
                        setTelegramUser(userObj);
                    }
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error fetching butter wallet:', error);
            return false;
        }
    }, []);

    // Function to fetch account details
    const getAccountDetails = useCallback(async (address) => {
        if (!address) {
            setAccountDetails({ solBalance: 0, butterBalance: 0 });
            setWalletDetails(null);
            return;
        }

        setIsLoading(true);
        try {
            // First, try to get butter wallet details
            const hasButterWallet = await fetchButterWallet(address);

            // Then get account details
            const resp = await axios.post('https://trd.buttertrade.xyz/api/account-detail', {
                pubKeyString: address
            });

            if (resp.data.success) {
                setAccountDetails({
                    solBalance: resp.data.SOL,
                    butterBalance: resp.data.ButterBalance
                });
            } else {
                throw new Error('Failed to fetch account details');
            }
        } catch (error) {
            console.error('Error fetching account details:', error);
            toast.error('Error fetching account details');
            setAccountDetails({ solBalance: 0, butterBalance: 0 });
        } finally {
            setIsLoading(false);
        }
    }, [fetchButterWallet]);

    // Effect to fetch data when wallet changes
    useEffect(() => {
        if (publicKey) {
            getAccountDetails(publicKey.toString());
        } else {
            getAccountDetails(null);
        }
    }, [publicKey, getAccountDetails]);

    // Handle Telegram auth callback from buttertrade.online
    useEffect(() => {
        const handleTelegramAuthCallback = async () => {
            // Check if we're coming from the auth app - check for telegramData in URL params
            const urlParams = new URLSearchParams(window.location.search);
            const telegramData = urlParams.get('telegramData');
            const isAuthCallback = urlParams.get('telegramAuth') === 'true' || telegramData !== null;

            if (isAuthCallback && telegramData) {
                try {
                    const user = JSON.parse(decodeURIComponent(telegramData));
                    setTelegramUser(user);

                    // Save telegram_id to backend immediately
                    const telegramIdToSave = user?.username || String(user?.id || '');
                    
                    if (telegramIdToSave) {
                        // Function to save telegram_id
                        const saveTelegramId = async (userPublicKey) => {
                            try {
                                const body = new URLSearchParams();
                                body.set('userpublickey', userPublicKey.toString());
                                body.set('telegram_id', telegramIdToSave);
                                
                                await axios.post('https://trd.buttertrade.xyz/api/save-telegram', body);
                                
                                toast.success('Telegram linked successfully');
                                
                                // Refresh wallet data to get updated telegram_id
                                if (publicKey && getWallet) {
                                    await getWallet(publicKey.toString());
                                }
                                return true;
                            } catch (err) {
                                console.error('Failed to save Telegram:', err?.response?.data || err.message);
                                toast.error('Failed to save Telegram. Please try again.');
                                return false;
                            }
                        };

                        // Check if butterWalletCredentials is already available
                        const userPublicKey = butterWalletCredentials?.userpublickey;
                        
                        if (userPublicKey) {
                            // Credentials are available, save immediately
                            await saveTelegramId(userPublicKey);
                        } else {
                            // Credentials not available yet, wait for them (page reloads and API takes time)
                            // Store telegramData in sessionStorage so we can save it later
                            sessionStorage.setItem('pendingTelegramAuth', JSON.stringify({
                                telegramId: telegramIdToSave,
                                userData: user
                            }));
                            
                            // Clean up URL parameters but keep waiting for credentials
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    }
                } catch (err) {
                    console.error('Failed to process Telegram auth callback:', err);
                }
            }
        };

        handleTelegramAuthCallback();
    }, [publicKey, butterWalletCredentials, getWallet]);

    // Handle pending Telegram auth when butterWalletCredentials becomes available
    useEffect(() => {
        const handlePendingTelegramAuth = async () => {
            const pendingAuth = sessionStorage.getItem('pendingTelegramAuth');
            
            if (pendingAuth && butterWalletCredentials?.userpublickey) {
                // Clear sessionStorage immediately to prevent multiple saves
                sessionStorage.removeItem('pendingTelegramAuth');
                
                try {
                    const { telegramId, userData } = JSON.parse(pendingAuth);
                    const userPublicKey = butterWalletCredentials.userpublickey;
                    
                    const body = new URLSearchParams();
                    body.set('userpublickey', userPublicKey.toString());
                    body.set('telegram_id', telegramId);
                    
                    await axios.post('https://trd.buttertrade.xyz/api/save-telegram', body);
                    
                    // Update telegram user state
                    setTelegramUser(userData);
                    
                    toast.success('Telegram linked successfully');
                    
                    // Refresh wallet data to get updated telegram_id
                    if (publicKey && getWallet) {
                        await getWallet(publicKey.toString());
                    }
                } catch (err) {
                    console.error('Failed to save pending Telegram auth:', err);
                    // Restore pending auth if save failed so user can retry
                    sessionStorage.setItem('pendingTelegramAuth', pendingAuth);
                }
            }
        };

        handlePendingTelegramAuth();
    }, [butterWalletCredentials, publicKey, getWallet]);

    // Hydrate telegram from backend initial-state when wallet connects
    useEffect(() => {
        const fetchTelegram = async () => {
            try {
                if (!publicKey) return;
                const resp = await axios.post('https://trd.buttertrade.xyz/api/initial-state', {
                    publicKey: publicKey.toString()
                }, { headers: { 'Content-Type': 'application/json' } });
                const tgid = resp?.data?.data?.telegram_id ?? resp?.data?.telegram_id ?? null;
                if (tgid) {
                    const isNumeric = /^\d+$/.test(String(tgid));
                    const userObj = isNumeric
                        ? { id: String(tgid), username: '' }
                        : { id: '', username: String(String(tgid).replace(/^@/, '')) };
                    setTelegramUser(userObj);
                }
            } catch (err) {
                // silent
            }
        };
        fetchTelegram();
    }, [publicKey]);

    // Handle account button click
    const handleAccountClick = () => {
        if (!walletDetails) {
            toast('Connect your ButterWallet', {
                icon: 'ℹ',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                }
            });
            return;
        }
        navigate('/account');
    };

    // Check if current route should show menu
    const shouldShowMenu = MENU_ROUTES.includes(location.pathname);

    return (
        <nav className='sticky top-0 left-0 right-0 z-50 flex justify-between items-center px-[48px] py-[30px] bg-[#343735] h-[72px]'>
            <Toaster />
            
            {shouldShowMenu ? (
                // Menu items section
                <div className='flex justify-center items-center w-[366.95px] gap-[32px] text-[#F3F3F3] font-cabin text-[18px] tracking-[1px]'>
                    {MENU_ITEMS.map((title, index) => (
                        <NavLink
                            to={``}
                            className={`${title === 'About' ? 'text-[#F8F8AE]' : ''}`}
                            key={index}
                        >
                            {title}
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                className='inline-block ml-1' 
                                fill="currentColor" 
                                width="16" 
                                height="16"
                            >
                                <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
                            </svg>
                        </NavLink>
                    ))}
                </div>
            ) : (
                // Logo/title section
                <h1 
                    className='font-amaranth font-bold text-[36px] text-[#F8F8AE] tracking-[1px] cursor-pointer' 
                    onClick={() => navigate('/')}
                >
                    ButterFactory
                </h1>
            )}

            {/* Action buttons section */}
            <div className='flex justify-center gap-4 items-center'>
                {butterWalletCredentials && (
                    <button
                        className='rounded bg-[#EEAB00] text-black p-2.5 hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
                        onClick={onConnectTelegram}
                        title="Connect Telegram"
                        disabled={Boolean(butterWalletCredentials?.telegram_id != null)}
                    >
                        {(() => {
                            const tgid = butterWalletCredentials?.telegram_id;
                            if (tgid) {
                                const isNumeric = /^\d+$/.test(String(tgid));
                                return isNumeric ? `ID: ${tgid}` : `@${String(tgid).replace(/^@/, '')}`;
                            }
                            if (telegramUser?.username) return `@${telegramUser.username}`;
                            if (telegramUser?.id) return `ID: ${telegramUser.id}`;
                            return 'Connect Telegram';
                        })()}
                    </button>
                )}
                <button
                    className={`font-amaranth font-bold text-[20px] text-[#282B29] bg-[#EEAB00] rounded-full w-[130px] h-[40px] transition-opacity ${
                        isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                    }`}
                    onClick={handleAccountClick}
                    disabled={isLoading}
                >
                    Account
                </button>
                <WalletMultiButton />
            </div>
        </nav>
    );
};

export default memo(NewWalletNavbar);