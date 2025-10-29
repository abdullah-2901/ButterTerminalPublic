import React, { useEffect, useContext, useCallback, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import NewWalletNavbar from './NewWalletNavbar';
import scatterBg from '../assets/scatterBg.png';
import InnerMain6 from './Main/InnerMain6/InnerMain6';
import Disclaimer from './Disclaimer';
import ButterTerminalContext from './ButterTerminalContext';

const NewAccount = () => {
    const { butterWalletCredentials, butterWalletSol } = useContext(ButterTerminalContext);
    
    // Local state for tab management
    const [activeTab, setActiveTab] = useState('account');
    
    const location = useLocation();
    const navigate = useNavigate();

    // Effect to initialize the correct tab based on URL
    useEffect(() => {
        if (location.pathname.includes('/wallet-funds')) {
            const params = new URLSearchParams(location.search);
            const mode = params.get('mode');
            setActiveTab(mode === 'withdraw' ? 'withdraw' : 'deposit');
        } else if (location.pathname.includes('/credentials')) {
            setActiveTab('account');
        }
    }, [location.pathname, location.search]);

    // Enhanced tab click handler
    const handleTabClick = useCallback((tab) => {
        setActiveTab(tab);
        
        let path = '/account/credentials';
        if (tab === 'deposit' || tab === 'withdraw') {
            // Add the mode parameter to differentiate between deposit and withdraw
            path = `/account/wallet-funds${tab === 'withdraw' ? '?mode=withdraw' : ''}`;
        }
        
        navigate(path);
    }, [navigate]);

    // NavItem component for tabs
    const NavItem = ({ children, tab }) => {
        const isActive = activeTab === tab;
        
        return (
            <button
                className={`font-amaranth text-2xl md:text-3xl leading-tight w-full text-left px-8
                    ${isActive ? 'text-[#F8F8AE]' : 'text-[#D4D4D4]'}
                    transition-colors duration-200 hover:text-[#F8F8AE]`}
                onClick={() => handleTabClick(tab)}
            >
                {children}
            </button>
        );
    };

    const backgroundStyle = {
        backgroundImage: `url(${scatterBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        height: '100%',
    };

    return (
        <div className='bg-walletBg min-h-screen relative' style={backgroundStyle}>
            <NewWalletNavbar />
            <div className='text-center flex flex-col items-center mb-[5rem]'>
                <div className='flex flex-col md:flex-row self-start w-full h-[450px]'>
                    <aside className='md:w-1/4 lg:w-1/5 mb-8 md:mb-0 bg-[#67676780] pt-[60px]'>
                        <nav className='flex flex-col gap-8 md:gap-[80px]'>
                            <NavItem tab="account">
                                Account
                            </NavItem>
                            <NavItem tab="deposit">
                                Deposit
                            </NavItem>
                            <NavItem tab="withdraw">
                                Withdraw
                            </NavItem>
                        </nav>
                    </aside>

                    <main className='md:w-3/4 self-center lg:w-4/5 pl-0 md:pl-[6rem] md:pt-[70px]'>
                        <Outlet context={{ activeTab }} />
                    </main>
                </div>

                <div className='mt-[30rem]'>
                    <Disclaimer />
                </div>
                <div className='mt-[5rem]'>
                    <InnerMain6 />
                </div>
            </div>
        </div>
    );
};

export default NewAccount;