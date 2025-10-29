import React, { memo, useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

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

    // Local state management for wallet and account details
    const [walletDetails, setWalletDetails] = useState(null);
    const [accountDetails, setAccountDetails] = useState({
        solBalance: 0,
        butterBalance: 0
    });
    const [isLoading, setIsLoading] = useState(false);

    // Function to fetch butter wallet details
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.example.com';
    const fetchButterWallet = useCallback(async (address) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/walletsinfo`, {
                params: { publicKey: address.toString() }
            });

            if (response.data.success && Array.isArray(response.data.data)) {
                if (response.data.data.length > 0) {
                    setWalletDetails(response.data.data[0]);
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
            const resp = await axios.post(`${API_BASE_URL}/api/account-detail`, {
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