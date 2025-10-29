import React, { useState, useCallback, useEffect, useContext } from 'react';
import { LAMPORTS_PER_SOL, Transaction, PublicKey, SystemProgram } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import ButterTerminalContext from '../components/ButterTerminalContext';
import arrowrightcircle from '../assets/arrow-right-circle.png';
import copy from '../assets/copy.png';
import { copyHandler, truncatePublicKey } from '../Controller/NewWalletTrimData';
import { Buffer } from 'buffer';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

// Adding onTransactionComplete prop to handle balance updates
const DepositTab = ({ onTransactionComplete }) => {
    const { butterWalletCredentials, setLocalButterWalletSol, getWallet } = useContext(ButterTerminalContext);
    const { publicKey, sendTransaction } = useWallet();
    const { connection } = useConnection();
    
    const [depositSol, setDepositSol] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCopiedForPublic, setIsCopiedForPublic] = useState(false);
    
    useEffect(() => {
        window.Buffer = Buffer;
    }, []);

    // Initialize butter wallet if needed
    useEffect(() => {
        const initializeButterWallet = async () => {
            if (publicKey && !butterWalletCredentials) {
                try {
                    await getWallet(publicKey.toString());
                } catch (error) {
                    console.error('Error initializing butter wallet:', error);
                }
            }
        };
    
        initializeButterWallet();
    }, [publicKey, butterWalletCredentials, getWallet]);

    // Enhanced wallet verification with clear error messages
    const verifyWalletConnection = useCallback(() => {
        if (!publicKey) {
            throw new WalletNotConnectedError('Please connect your Solana wallet first');
        }
        
        if (!butterWalletCredentials?.publickey) {
            throw new Error('Butter wallet not properly initialized');
        }

        if (!sendTransaction) {
            throw new Error('Transaction capability not available');
        }

        return true;
    }, [publicKey, butterWalletCredentials, sendTransaction]);

    const handleCopy = useCallback(() => {
        try {
            if (!butterWalletCredentials?.publickey) {
                toast.error('Wallet address not available');
                return;
            }

            const success = copyHandler(butterWalletCredentials, 'public');
            if (success) {
                setIsCopiedForPublic(true);
                setTimeout(() => setIsCopiedForPublic(false), 3000);
                toast.success('Address copied to clipboard');
            }
        } catch (error) {
            console.error('Copy failed:', error);
            setIsCopiedForPublic(false);
            toast.error('Failed to copy address');
        }
    }, [butterWalletCredentials]);

    // Updated deposit handler with improved error handling and balance updates
    const depositHandler = useCallback(async () => {
        setIsLoading(true);
        const loadingToast = toast.loading('Preparing deposit...');

        try {
            verifyWalletConnection();

            const depositAmount = parseFloat(depositSol);
            if (isNaN(depositAmount) || depositAmount <= 0) {
                throw new Error('Please enter a valid amount');
            }

            const userBalance = await connection.getBalance(publicKey);
            if (userBalance < depositAmount * LAMPORTS_PER_SOL) {
                throw new Error('Insufficient balance in your wallet');
            }

            const recipientPubKey = new PublicKey(butterWalletCredentials.publickey);
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: recipientPubKey,
                    lamports: depositAmount * LAMPORTS_PER_SOL,
                })
            );

            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            const signature = await sendTransaction(transaction, connection);
            toast.loading('Confirming transaction...', { id: loadingToast });

            await connection.confirmTransaction(signature, 'confirmed');

            const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.example.com';
            await axios.post(`${API_BASE_URL}/api/deposit-amount`, {
                deposit_data: {
                    amount: depositAmount,
                    publicKey: butterWalletCredentials.publickey,
                    signature
                }
            });

            const newBalance = await connection.getBalance(recipientPubKey);
            setLocalButterWalletSol(newBalance / LAMPORTS_PER_SOL);

            toast.success(`Successfully deposited ${depositAmount} SOL`, { id: loadingToast });
            setDepositSol('');
            
            // Call the parent's callback to update balances
            onTransactionComplete?.();

        } catch (error) {
            console.error('Deposit failed:', error);
            const errorMessage = error instanceof WalletNotConnectedError
                ? 'Please connect your Solana wallet first'
                : error.message.includes('insufficient')
                ? 'Insufficient balance in your wallet'
                : `Deposit failed: ${error.message}`;
            
            toast.error(errorMessage, { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    }, [
        publicKey, 
        connection, 
        depositSol, 
        butterWalletCredentials, 
        sendTransaction, 
        setLocalButterWalletSol, 
        verifyWalletConnection,
        onTransactionComplete
    ]);

    return (
        <div className="flex justify-between items-end w-[883px] h-[83px]">
            <div className='w-[302px] h-[83px] flex flex-col justify-between gap-1'>
                <label className="block text-[#E4E4E4] text-[24px] font-cabin">
                    Deposit Amount (SOL)
                </label>
                <input
                    type="number"
                    className='w-[302px] h-[42px] rounded-lg bg-[#F2F1E2] text-[#3C3C3C] text-[24px]'
                    onChange={(e) => setDepositSol(e.target.value)}
                    value={depositSol}
                    min="0"
                    step="0.000001"
                    disabled={isLoading || !publicKey}
                    placeholder={!publicKey ? "Connect wallet first" : "Enter amount"}
                />
            </div>
            
            <img src={arrowrightcircle} alt="arrow" />
            
            <div className='w-[231px] h-[83px] flex flex-col justify-between gap-1'>
                <label className="block text-[#E4E4E4] text-[24px] font-cabin">
                    Deposit To
                </label>
                <span className='w-[231px] h-[42px] rounded-lg bg-[#8A8A8A] text-[#E1E1E1] text-[24px] font-cabin flex justify-center items-center gap-6'>
                    {butterWalletCredentials?.publickey ? (
                        <>
                            <p>{truncatePublicKey(butterWalletCredentials.publickey, 4)}</p>
                            {isCopiedForPublic ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-clipboard2-check w-[30px] h-[30px] text-yellowButtonBg" viewBox="0 0 16 16">
                                    <path d="M9.5 0a.5.5 0 0 1 .5.5.5.5 0 0 0 .5.5.5.5 0 0 1 .5.5V2a.5.5 0 0 1-.5.5h-5A.5.5 0 0 1 5 2v-.5a.5.5 0 0 1 .5-.5.5.5 0 0 0 .5-.5.5.5 0 0 1 .5-.5z" />
                                    <path d="M3 2.5a.5.5 0 0 1 .5-.5H4a.5.5 0 0 0 0-1h-.5A1.5 1.5 0 0 0 2 2.5v12A1.5 1.5 0 0 0 3.5 16h9a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 12.5 1H12a.5.5 0 0 0 0 1h.5a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5z" />
                                    <path d="M10.854 7.854a.5.5 0 0 0-.708-.708L7.5 9.793 6.354 8.646a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0z" />
                                </svg>
                            ) : (
                                <img
                                    src={copy}
                                    alt="copy"
                                    className='w-[36px] h-[36px] hover:cursor-pointer'
                                    onClick={handleCopy}
                                />
                            )}
                        </>
                    ) : (
                        <p className="text-sm">Wallet loading...</p>
                    )}
                </span>
            </div>

            <button
                type="button"
                className={`flex items-center justify-center mt-2 bg-yellowButtonBg rounded-full 
                w-[214px] h-[42px] font-amaranth font-bold text-[24px] text-[#282B29] shadow-xl
                ${(isLoading || !publicKey) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-500'}`}
                onClick={depositHandler}
                disabled={isLoading || !publicKey}
            >
                {isLoading ? 'Processing...' : !publicKey ? 'Connect Wallet' : 'Deposit Funds'}
            </button>
        </div>
    );
};

export default DepositTab;