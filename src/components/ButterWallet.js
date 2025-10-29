import React from 'react';
import NewButterWallet from './NewButterWallet';
import CreateWalletCard from './CreateWalletCard';
import { useSelector } from 'react-redux';
import { useWallet } from '@solana/wallet-adapter-react';
import InnerMain6 from './Main/InnerMain6/InnerMain6';

// Changed from butterWallet to ButterWallet
const ButterWallet = () => {
    const { publicKey } = useWallet();
    
    // We should add error handling for the Redux selector
    const { SOLBalance } = useSelector(state => state.UserDetail) || { SOLBalance: 0 };

    return (
        <div className='bg-[#1E1E1E] min-h-svh'>
            <NewButterWallet>
                <CreateWalletCard 
                    publicKey={publicKey} 
                    SOLBalance={SOLBalance} 
                />
                <div className='mt-[40px]'>
                    <InnerMain6 />
                </div>
            </NewButterWallet>
        </div>
    );
};

export default ButterWallet;