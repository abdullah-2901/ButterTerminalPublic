import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import toast, { Toaster } from 'react-hot-toast';
import previousarrow from '../assets/previousarrow.png';
import copy from '../assets/copy.png';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { copyHandler } from '../Controller/NewWalletTrimData';
import ButterTerminalContext from '../components/ButterTerminalContext';

const CreateWalletCard = () => {
    // Navigation and state hooks
    const navigate = useNavigate();
    const { publicKey } = useWallet();
    
    // Get context values instead of using Redux
    const { 
        butterWalletCredentials, 
        createNewButterWallet, 
        calculateSolBalance,
        butterWalletSol
    } = useContext(ButterTerminalContext);

    // Local state for UI handling
    const [isCreating, setIsCreating] = useState(false);
    const [isCopiedForPublic, setIsCopiedForPublic] = useState(false);
    const [isCopiedForSecret, setIsCopiedForSecret] = useState(false); // New state for secret key copy status
    const [isSecretVisible, setIsSecretVisible] = useState(false);

    // Effect to calculate SOL balance when wallet is connected
    useEffect(() => {
        if (publicKey) {
            const fetchSol = async () => {
                await calculateSolBalance(publicKey);
            };
            fetchSol();
        }
    }, [publicKey, calculateSolBalance]);

    // Toggle visibility of secret key
    const toggleSecretVisibility = () => setIsSecretVisible(!isSecretVisible);
    
    // Create new ButterWallet
    const createButterWallet = async () => {
        // Check if wallet already exists
        if (butterWalletCredentials?.secretKey) {
            toast.success('You have already created a new wallet');
            setTimeout(() => {
                navigate('/wallet-created');
            }, 1000);
            return;
        }

        setIsCreating(true);

        try {
            const success = await createNewButterWallet(publicKey.toString());

            if (success) {
                await calculateSolBalance(publicKey.toString());
                toast.success('ButterWallet Created Successfully');
                
                setTimeout(() => {
                    navigate('/wallet-created');
                }, 800);
            } else {
                throw new Error('Failed to create ButterWallet');
            }
        } catch (error) {
            console.error('ButterWallet creation error:', error);
            toast.error(error.message || 'Failed to create wallet');
        } finally {
            setIsCreating(false);
        }
    };

    // Enhanced copy function to handle both public and secret keys
    const copyKeys = (key) => {
        try {
            const copyResp = copyHandler(butterWalletCredentials, key);
            if (copyResp) {
                if (key === 'public') {
                    setIsCopiedForPublic(true);
                    setTimeout(() => setIsCopiedForPublic(false), 1500);
                } else if (key === 'secret') {
                    setIsCopiedForSecret(true);
                    setTimeout(() => setIsCopiedForSecret(false), 1500);
                }
            }
        } catch (error) {
            console.error('Error copying:', error);
            toast.error('Failed to copy key');
        }
    };

    // Helper component for rendering the copy button
    const CopyButton = ({ isCopied, onClick }) => (
        isCopied ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-clipboard2-check w-[30px] h-[30px] text-yellowButtonBg" viewBox="0 0 16 16">
                <path d="M9.5 0a.5.5 0 0 1 .5.5.5.5 0 0 0 .5.5.5.5 0 0 1 .5.5V2a.5.5 0 0 1-.5.5h-5A.5.5 0 0 1 5 2v-.5a.5.5 0 0 1 .5-.5.5.5 0 0 0 .5-.5.5.5 0 0 1 .5-.5z" />
                <path d="M3 2.5a.5.5 0 0 1 .5-.5H4a.5.5 0 0 0 0-1h-.5A1.5 1.5 0 0 0 2 2.5v12A1.5 1.5 0 0 0 3.5 16h9a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 12.5 1H12a.5.5 0 0 0 0 1h.5a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5z" />
                <path d="M10.854 7.854a.5.5 0 0 0-.708-.708L7.5 9.793 6.354 8.646a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0z" />
            </svg>
        ) : (
            <img src={copy} alt="Copy" className='w-[36px] h-[36px] hover:cursor-pointer' onClick={onClick} />
        )
    );

    return (
        <div className='bg-[#616060] rounded-3xl flex flex-col items-center justify-center w-[950px] h-[634px] p-8 relative'>
            <Toaster />
            {/* Back Arrow Button */}
            <div className='absolute top-8 left-8 bg-[#EEAB00] w-[60px] h-[60px] rounded-full flex items-center justify-center cursor-pointer' 
                 onClick={() => navigate('/')}>
                <img src={previousarrow} alt="Previous" className='w-[21.67px] h-[16.67px]' />
            </div>
            {
                butterWalletCredentials ?
                    <div className='flex flex-col justify-center items-center gap-[40px] mt-[60px]'>
                        {/* Public Key Section */}
                        <div className='flex flex-col justify-center items-center gap-[40px] font-cabin text-walletparaText text-[24px] text-center'>
                            <p className='text-[32px]'>Your wallet public key:</p>
                            <div className='flex items-center gap-2 w-[758px] px-4 py-1 bg-[#717171] rounded-xl'>
                                <span className='font-bold w-[758px] text-center break-all whitespace-normal overflow-ellipsis'>
                                    {butterWalletCredentials?.publickey}
                                </span>
                                <CopyButton 
                                    isCopied={isCopiedForPublic}
                                    onClick={() => copyKeys('public')}
                                />
                            </div>
                        </div>

                        {/* Secret Key Section */}
                        <div className='flex flex-col justify-center items-center gap-[40px] font-cabin text-walletparaText text-[24px] text-center'>
                            <p className='text-[32px]'>Your wallet secretKey:</p>
                            <div className='flex items-center gap-2 w-[758px] px-4 py-1 bg-[#717171] rounded-xl'>
                                <span className={`font-bold w-[758px] text-center break-all whitespace-normal overflow-ellipsis ${
                                    !isSecretVisible ? 'blur-sm' : ''
                                }`}>
                                    {butterWalletCredentials?.secretkey}
                                </span>
                                <div className="flex items-center gap-2">
                                    <VisibilityToggle 
                                        isVisible={isSecretVisible} 
                                        onClick={toggleSecretVisibility} 
                                    />
                                    <CopyButton 
                                        isCopied={isCopiedForSecret}
                                        onClick={() => copyKeys('secret')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <button 
                            type="button" 
                            className="flex items-center justify-center mt-2 bg-yellowButtonBg rounded-full w-[396px] h-[64px] font-amaranth font-bold text-[32px] text-[#282B29]"
                            onClick={() => navigate('/deposit-funds')}>
                            Deposit Funds
                        </button>
                    </div>
                    :
                    <div className='flex flex-col justify-center items-center gap-[40px] mt-[60px]'>
                        <h1 className='font-amaranth text-customLightBrownText text-[36px] tracking-[1.5px] text-center'>
                            Wallet Connected Successfully!
                        </h1>
                        <div className='font-cabin text-walletparaText text-[24px] text-center'>
                            <p>You are connected with</p>
                            <p className='font-bold'>{publicKey?.toString()}</p>
                        </div>

                        <p className='text-cabin text-[24px] text-white font-bold'>
                            Your Balance: <span className='text-parrotText'>{butterWalletSol}</span> SOL
                        </p>
                        <p className='text-cabin text-[24px] text-walletparaText text-center tracking-[1px]'>
                            Click button below to create a <span className='text-customLightBrownText'>ButterWallet</span> and claim a key.
                        </p>
                        {
                            !butterWalletCredentials &&
                            <button
                                type="button"
                                className={`flex items-center justify-center mt-2 bg-yellowButtonBg rounded-full w-[396px] h-[64px] font-amaranth font-bold 
                                    text-[32px] text-[#282B29] transition-all duration-300 ${isCreating ? 'opacity-50 cursor-not-allowed' : 
                                    'hover:bg-yellow-400'}`}
                                onClick={createButterWallet}
                                disabled={isCreating}
                            >
                                {isCreating ? 'Creating...' : 'NEXT'}
                            </button>
                        }
                    </div>
            }
        </div>
    );
};

const VisibilityToggle = ({ isVisible, onClick }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[24px] h-[24px] text-yellowButtonBg cursor-pointer"
      onClick={onClick}
    >
      {isVisible ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
);

export default CreateWalletCard;