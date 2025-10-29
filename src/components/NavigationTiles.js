import React from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';

const NavigationTiles = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user_wallet_detail } = useSelector(state => state.UserNewWalletInfo);

    const tabs = [
        { name: 'home', path: '/' },
        { name: 'create ButterWallet', path: '/wallet-app' },
        { name: 'secret info', path: '/wallet-created' },
        { name: 'wallet', path: '/deposit-funds' }
    ];

    const navigationHandler = (tab) => {
        if (tab === '/wallet-created' || tab === '/deposit-funds') {
            if (user_wallet_detail === null) {
                toast('Create Butter wallet!', {
                    icon: '⚠',
                    style: {
                        borderRadius: '10px',
                        background: '#333',
                        color: '#fff',
                    },
                });
                return;
            }
        }
        navigate(tab);
    };

    const buttonStyle = (path) => `
        font-singlet font-bold text-[16px] text-[#000000] rounded-full 
        h-[30px] bg-[#EEAB00] transition-all duration-300 ease-in-out
        ${location.pathname === path ? 
            'border-2 border-black shadow-md transform scale-105' : 
            'hover:bg-[#FFD700] hover:shadow-sm'
        }
    `;

    return (
        <div className='flex justify-start gap-3'>
            {tabs.map((tab) => (
                <button
                    key={tab.name}
                    className={buttonStyle(tab.path)}
                    style={{ width: tab.name === 'create ButterWallet' ? '180px' : '100px' }}
                    onClick={() => navigationHandler(tab.path)}
                >
                    {tab.name}
                </button>
            ))}
        </div>
    );
};

export default NavigationTiles;