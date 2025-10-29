//code 2
import React, { useContext, useEffect } from 'react';
import NewWalletNavbar from './NewWalletNavbar';
import scatterBg from '../assets/scatterBg.png';
import { useLocation } from 'react-router-dom';
import NavigationTiles from './NavigationTiles';
import ButterTerminalContext from './ButterTerminalContext';
import { useWallet } from '@solana/wallet-adapter-react';

const NewButterWallet = ({ children }) => {
    // Get location for path-based rendering
    const location = useLocation();
    
    // Get wallet connection
    const { publicKey } = useWallet();
    
    // Get context values
    const { butterWalletCredentials, getWallet } = useContext(ButterTerminalContext);

    // Effect to fetch wallet info when publicKey changes
    useEffect(() => {
        const fetchWalletInfo = async () => {
            if (publicKey) {
                await getWallet(publicKey.toString());
            }
        };

        fetchWalletInfo();
    }, [publicKey, getWallet]);

    // Background configuration
    const showScatterBackground = ['/', '/strategy'].includes(location.pathname);
    const showCircleStructure = ['/wallet-app', '/wallet-created', '/new-wallet-balance'].includes(location.pathname);

    const backgroundStyle = showScatterBackground ? {
        backgroundImage: `url(${scatterBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        height: '100%',
    } : {};

    return (
        <div className='bg-[#1E1E1E] min-h-svh relative' style={backgroundStyle}>
            {/* <NewWalletNavbar /> */}

            {/* Main Butter Wallet Created Card */}
            <div className='flex flex-col items-center justify-center py-8 gap-[10px] mt-[90px]'>
                <div className='flex flex-col items-center justify-center mb-[80px]'>
                    {butterWalletCredentials && location.pathname === '/wallet-app' &&
                        <h1 className='text-center text-[32px] text-walletparaText font-cabin tracking-[2px]'>
                            You already have a Butter wallet created!
                        </h1>
                    }
                    {!butterWalletCredentials && location.pathname === '/wallet-app' &&
                        <h1 className='text-center text-[32px] text-walletparaText font-cabin tracking-[2px]'>
                            It appears you don't have a Butter Wallet created. You will need to <br /> generate a new wallet to proceed.
                        </h1>
                    }
                    {butterWalletCredentials && location.pathname === '/wallet-created' &&
                        <h1 className='text-center text-[32px] text-walletparaText font-cabin tracking-[2px]'>
                            Nearly there. Please save your private key in a safe place and do not <br /> share it with anyone. You can access this information in the Account <br /> section.
                        </h1>
                    }
                    {butterWalletCredentials && location.pathname === '/new-wallet-balance' &&
                        <h1 className='text-center text-[32px] text-walletparaText font-cabin tracking-[2px]'>
                            You will need to fund your Butter Wallet to subscribe to a strategy
                        </h1>
                    }
                </div>

                {/* Circle structure */}
                {showCircleStructure && (
                    <div className="flex items-center gap-1 justify-center mb-8">
                        <div className={`w-[66.75px] h-[66.75px] rounded-full ${true ? 'bg-yellow-400' : 'bg-[#D9D9D9]'}`}></div>
                        <div className={`w-[82px] h-2 ${location.pathname !== '/wallet-app' ? 'bg-yellow-400' : 'bg-[#D9D9D9]'}`}></div>
                        <div className={`w-[66.75px] h-[66.75px] rounded-full ${location.pathname !== '/wallet-app' ? 'bg-yellow-400' : 'bg-[#D9D9D9]'}`}>
                        </div>
                        <div className={`w-[82px] h-2 ${location.pathname === '/new-wallet-balance' ? 'bg-yellow-400' : 'bg-[#D9D9D9]'}`}></div>
                        <div className={`w-[66.75px] h-[66.75px] rounded-full ${location.pathname === '/new-wallet-balance' ? 'bg-yellow-400' : 'bg-[#D9D9D9]'}`}>
                        </div>
                    </div>
                )}

                {children}
            </div>
        </div>
    );
};

export default NewButterWallet;