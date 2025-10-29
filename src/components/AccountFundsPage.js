import React, { useEffect, useMemo, useContext } from 'react';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import DepositTab from './DepositTab';
import WithdrawTab from './WithdrawTab';
import { truncatePublicKey } from '../Controller/NewWalletTrimData';
import ButterTerminalContext from './ButterTerminalContext';

/**
 * AccountFundsPage Component
 * This component manages the funds page interface, handling both deposit and withdraw
 * operations for the Butter wallet system. It maintains synchronization between
 * URL parameters and the interface state.
 */
const AccountFundsPage = () => {
    // Get necessary context and state
    const { connected, publicKey } = useWallet();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { activeTab } = useOutletContext();

    // Get wallet context for balances and credentials
    const { 
        butterWalletCredentials,
        butterWalletSol,
        butterWalletSolBalance,
        updateAllBalances
    } = useContext(ButterTerminalContext);

    // Determine the current mode from URL parameters and context
    const mode = searchParams.get('mode');
    const isWithdrawMode = mode === 'withdraw' || activeTab === 'withdraw';

    // Effect to update balances periodically
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

    // Handle tab switching
    const handleTabSwitch = (isWithdraw) => {
        const newPath = `/account/wallet-funds${isWithdraw ? '?mode=withdraw' : ''}`;
        navigate(newPath);
    };

    // Memoize the wallet information display
    const walletInfoContent = useMemo(() => (
        <div className='flex flex-col justify-between items-start gap-2 text-[#E1E1E1] text-[24px] font-cabin w-[883px] h-[128px]'>
            <p>
                Wallet ID: {butterWalletCredentials?.publickey ? 
                    truncatePublicKey(butterWalletCredentials.publickey, 8) : 
                    'Not Connected'}
            </p>
            <p>
                Your Wallet Balance: 
                <span className="text-[#57ED39]">
                    {connected && publicKey ? 
                        ` ${butterWalletSol?.toFixed(8) || '0.00000000'}` : 
                        ' Please connect your wallet'}
                </span> SOL
            </p>
            <p>
                Butter Wallet Balance: 
                <span className="text-[#57ED39]">
                    {butterWalletCredentials ? 
                        ` ${butterWalletSolBalance?.toFixed(8) || '0.00000000'}` : 
                        ' 0.00000000'}
                </span> SOL
            </p>
        </div>
    ), [butterWalletCredentials, butterWalletSol, butterWalletSolBalance, connected, publicKey]);

    // Memoize the main content based on the active mode
    const content = useMemo(() => {
        const props = {
            onTransactionComplete: () => {
                // Update balances after transaction
                if (publicKey && butterWalletCredentials?.publickey) {
                    updateAllBalances(publicKey.toString(), butterWalletCredentials.publickey);
                }
            }
        };

        return isWithdrawMode ? <WithdrawTab {...props} /> : <DepositTab {...props} />;
    }, [isWithdrawMode, publicKey, butterWalletCredentials, updateAllBalances]);

    // Show connection prompt if wallet is not connected
    if (!connected || !publicKey) {
        return (
            <div className="w-[950px] h-[393px] overflow-hidden">
                <div className="flex flex-col items-center justify-center h-full">
                    <h2 className="text-2xl text-[#E1E1E1] mb-4">
                        Please connect your Solana wallet to access deposit and withdrawal features
                    </h2>
                </div>
            </div>
        );
    }

    // Main render
    return (
        <div>
            <div className="w-[950px] h-[393px] overflow-hidden">
                <Toaster position="top-center" />
                
                {/* Tab navigation */}
                <div className="flex">
                    <button
                        className={`flex-1 py-3 text-center font-bold h-[76px] font-amaranth text-[32px] 
                            ${!isWithdrawMode ? 'bg-[#EABB42] text-[#343735]' : 'bg-[#4A4A4A] text-[#D4D4D4]'}
                            transition-colors duration-200`}
                        onClick={() => handleTabSwitch(false)}
                    >
                        Deposit
                    </button>
                    <button
                        className={`flex-1 py-3 text-center font-bold h-[76px] font-amaranth text-[32px] 
                            ${isWithdrawMode ? 'bg-[#EABB42] text-[#343735]' : 'bg-[#4A4A4A] text-[#D4D4D4]'}
                            transition-colors duration-200`}
                        onClick={() => handleTabSwitch(true)}
                    >
                        Withdraw
                    </button>
                </div>
                
                {/* Main content area */}
                <div className="py-8 px-1 flex flex-col justify-center gap-8">
                    {walletInfoContent}
                    {content}
                </div>
            </div>
        </div>
    );
};

export default AccountFundsPage;