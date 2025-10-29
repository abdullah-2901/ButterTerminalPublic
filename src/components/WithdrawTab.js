import React, { useState, useCallback, useEffect, useContext } from 'react';
import { LAMPORTS_PER_SOL, Transaction, PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import ButterTerminalContext from '../components/ButterTerminalContext';
import arrowrightcircle from '../assets/arrow-right-circle.png';
import copy from '../assets/copy.png';
import { copyHandler, truncatePublicKey } from '../Controller/NewWalletTrimData';
import { Buffer } from 'buffer';

// Adding onTransactionComplete prop to handle balance updates
const WithdrawTab = ({ onTransactionComplete }) => {
    const { 
        butterWalletCredentials, 
        butterWalletSol,
        setLocalButterWalletSol
    } = useContext(ButterTerminalContext);

    const [withdrawSol, setWithdrawSol] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCopiedForPublic, setIsCopiedForPublic] = useState(false);

    const { publicKey } = useWallet();
    const { connection } = useConnection();

    useEffect(() => {
        window.Buffer = Buffer;
    }, []);

    const handleCopy = useCallback(() => {
        if (!publicKey) return;

        try {
            const copyResp = copyHandler({ userPublicKey: publicKey }, 'public');
            if (copyResp) {
                setIsCopiedForPublic(true);
                setTimeout(() => setIsCopiedForPublic(false), 3000);
            }
        } catch (error) {
            console.error('Error copying:', error);
            toast.error('Failed to copy');
        }
    }, [publicKey]);

    // Enhanced validation with clear error messages
    const validateWithdrawal = useCallback((amount) => {
        if (!publicKey) {
            throw new Error("Please connect your wallet");
        }

        if (!butterWalletCredentials) {
            throw new Error("Butter wallet not initialized");
        }

        if (isNaN(amount) || amount <= 0) {
            throw new Error("Please enter a valid amount");
        }

        const currentBalance = parseFloat(butterWalletSol);
        if (isNaN(currentBalance) || amount > currentBalance) {
            throw new Error("Insufficient funds in butter wallet");
        }
    }, [publicKey, butterWalletCredentials, butterWalletSol]);

    const processTransaction = useCallback(async (fromWallet, amount) => {
        if (!publicKey) throw new Error("Wallet not connected");

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromWallet.publicKey,
                toPubkey: publicKey,
                lamports: amount * LAMPORTS_PER_SOL,
            })
        );

        const latestBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = fromWallet.publicKey;
        transaction.sign(fromWallet);

        const rawTransaction = transaction.serialize();
        const signature = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });

        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        });

        if (confirmation.value.err) {
            throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
        }

        return signature;
    }, [connection, publicKey]);

    // Enhanced database update function with better error handling
    const updateDatabase = useCallback(async (amount, signature) => {
        if (!butterWalletCredentials?.publickey) {
            throw new Error('Wallet information not available');
        }

        const apiResponse = await axios.post('https://trd.buttertrade.xyz/api/withdraw-amount', {
            withdraw_data: {
                amount,
                publicKey: butterWalletCredentials.publickey,
                transactionSignature: signature
            }
        });

        if (!apiResponse.data.success) {
            throw new Error('Failed to update withdrawal in database');
        }
    }, [butterWalletCredentials]);

    // Updated withdraw handler with improved error handling and balance updates
    const withdrawHandler = useCallback(async () => {
        if (!butterWalletCredentials?.secretkey) {
            toast.error('Butter wallet not properly initialized');
            return;
        }

        const withdrawAmount = parseFloat(withdrawSol);
        setIsLoading(true);
        const loadingToast = toast.loading('Processing withdrawal...');

        try {
            // Validate the withdrawal first
            validateWithdrawal(withdrawAmount);

            // Convert secret key string to Uint8Array
            const secretKeyUint8 = new Uint8Array(
                butterWalletCredentials.secretkey.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
            );
            const fromWallet = Keypair.fromSecretKey(secretKeyUint8);

            toast.loading('Confirming transaction...', { id: loadingToast });
            const signature = await processTransaction(fromWallet, withdrawAmount);

            // Update the database with withdrawal information
            await updateDatabase(withdrawAmount, signature);

            // Get and update the new balance
            const sol = await connection.getBalance(fromWallet.publicKey) / LAMPORTS_PER_SOL;
            setLocalButterWalletSol(sol);
            
            toast.success(`Successfully withdrew ${withdrawAmount} SOL`, { id: loadingToast });
            setWithdrawSol(''); // Clear input after success

            // Call the parent's callback to update balances
            onTransactionComplete?.();

        } catch (error) {
            console.error("Withdrawal failed:", error);
            toast.error(error.message || "Withdrawal failed. Please try again.", { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    }, [
        butterWalletCredentials,
        withdrawSol,
        validateWithdrawal,
        processTransaction,
        updateDatabase,
        connection,
        setLocalButterWalletSol,
        onTransactionComplete
    ]);

    return (
        <div className="flex justify-between items-end w-[883px] h-[83px]">
            <div className='w-[302px] h-[83px] flex flex-col justify-between gap-1'>
                <label className="block text-[#E4E4E4] text-[24px] font-cabin">
                    Withdraw Amount (SOL)
                </label>
                <input
                    type="number"
                    className='w-[302px] h-[42px] rounded-lg bg-[#F2F1E2] text-[#3C3C3C] text-[24px]'
                    onChange={(e) => setWithdrawSol(e.target.value)}
                    value={withdrawSol}
                    min="0"
                    step="0.000001"
                    disabled={isLoading}
                    placeholder="Enter amount"
                />
            </div>
            <img src={arrowrightcircle} alt="arrow" />
            <div className='w-[231px] h-[83px] flex flex-col justify-between gap-1'>
                <label className="block text-[#E4E4E4] text-[24px] font-cabin">
                    Withdraw To
                </label>
                <span className='w-[231px] h-[42px] rounded-lg bg-[#8A8A8A] text-[#E1E1E1] text-[24px] font-cabin flex justify-center items-center gap-6'>
                    <p>{publicKey ? truncatePublicKey(publicKey.toString(), 4) : 'Not Connected'}</p>
                    {publicKey && (
                        isCopiedForPublic ? (
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
                        )
                    )}
                </span>
            </div>
            <button
                type="button"
                className={`flex items-center justify-center mt-2 bg-yellowButtonBg rounded-full 
                w-[214px] h-[42px] font-amaranth font-bold text-[24px] text-[#282B29] shadow-xl
                ${isLoading || !publicKey || !butterWalletCredentials ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-500'}`}
                onClick={withdrawHandler}
                disabled={isLoading || !publicKey || !butterWalletCredentials}
            >
                {isLoading ? 'Processing...' : 'Withdraw Funds'}
            </button>
        </div>
    );
};

export default WithdrawTab;