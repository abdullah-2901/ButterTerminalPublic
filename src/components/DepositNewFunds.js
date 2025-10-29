import React, { useState, useContext,useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Toaster } from 'react-hot-toast';
import ButterTerminalContext from '../components/ButterTerminalContext'; // Adjust the path as needed
import DepositTab from './DepositTab';
import WithdrawTab from './WithdrawTab';
import { truncatePublicKey } from '../Controller/NewWalletTrimData';
import { useNavigate } from 'react-router-dom';
import InnerMain6 from './Main/InnerMain6/InnerMain6';

const DepositNewFunds = () => {
    // Replace Redux selectors with ButterTerminal context
    const { butterWalletCredentials, butterWalletSol,butterWalletSolBalance,updateAllBalances  } = useContext(ButterTerminalContext);
    
    const [activeTab, setActiveTab] = useState('deposit');
    const { connected, publicKey } = useWallet();
    const { connection } = useConnection();
    const navigate = useNavigate();
     useEffect(() => {
            if (!connected || !publicKey || !butterWalletCredentials?.publickey) {
                return;
            }
    
            // Initial balance update
            updateAllBalances(publicKey.toString(), butterWalletCredentials.publickey);
    
            // Set up polling interval for balance updates
            const intervalId = setInterval(() => {
                updateAllBalances(publicKey.toString(), butterWalletCredentials.publickey);
            }, 5000);
    
            // Cleanup on unmount
            return () => clearInterval(intervalId);
        }, [connected, publicKey, butterWalletCredentials, updateAllBalances]);
    

    return (
        <div className='flex flex-col justify-center items-center gap-[75px]'>
            <div className="w-[950px] h-[393px] bg-[#676767] rounded-[2rem] overflow-hidden">
                <Toaster position="top-center" />
                <div className="flex">
                    {['deposit', 'withdraw'].map((tab) => (
                        <button
                            key={tab}
                            className={`flex-1 py-3 text-center font-bold h-[76px] font-amaranth text-[32px] 
                            ${activeTab === tab
                                ? 'bg-[#EABB42] text-[#343735]'
                                : 'bg-[#4A4A4A] text-[#D4D4D4]'}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="py-10 px-10 flex flex-col justify-center gap-8">
                    <div className='flex flex-col justify-between text-[#E1E1E1] text-[24px] font-cabin w-[883px] h-[88px]'>
                        {/* Update the display to use butterWalletCredentials */}
                        <p>Wallet ID: {truncatePublicKey(butterWalletCredentials?.publickey, 8)}</p>
                        {/* Use the connected wallet's SOL balance from the wallet context */}
                        <p>Your Wallet Balance: <span className="text-[#57ED39]">
                            {publicKey ? (butterWalletSol?.toFixed(8) || '0.00000000') : '0.00000000'}
                        </span> SOL</p>
                        {/* Use the butter wallet's balance */}
                        <p>Butter Wallet Balance: <span className="text-[#57ED39]">
                            {butterWalletCredentials ? (butterWalletSolBalance?.toFixed(8) || '0.00000000') : '0.00000000'}
                        </span> SOL</p>
                    </div>
                    {activeTab === 'deposit' ? (
                        <DepositTab />
                    ) : (
                        <WithdrawTab />
                    )}
                </div>
            </div>
            <button 
                className='w-[396px] h-[64px] font-amaranth font-bold text-[32px] rounded-full bg-[#EEAB00] text-[#282B29]'
                onClick={() => navigate('/')}
            >
                Go to Home
            </button>

            <div>
                <InnerMain6 />
            </div>
        </div>
    );
};

export default DepositNewFunds;