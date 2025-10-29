import React, { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { copyHandler } from '../Controller/NewWalletTrimData';
import copy from '../assets/copy.png';
import CustomRotatingLoader from './CustomRotatingLoader';

const AccountCreation = () => {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  
  const [walletDetails, setWalletDetails] = useState(null);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to validate wallet data
  const validateWalletData = (data) => {
    // console.log('Validating wallet data:', data);

    if (!data) return false;

    // Check for required fields using the correct key names
    const requiredFields = ['publickey', 'secretkey'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return false;
    }

    return true;
  };

  // Function to fetch butter wallet details
  const fetchWalletDetails = useCallback(async (address) => {
    if (!address) {
      setError('No wallet connected');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get('https://trd.buttertrade.xyz/api/walletsinfo', {
        params: { publicKey: address.toString() }
      });

      // console.log('API Response:', response.data);

      if (response.data.success && Array.isArray(response.data.data)) {
        if (response.data.data.length > 0) {
          const walletData = response.data.data[0];
          
          // Validate the wallet data structure
          if (validateWalletData(walletData)) {
            // Map the API response using the correct key names
            const formattedWalletDetails = {
              publicKey: walletData.publickey,    // Note the lowercase 'publickey'
              secretKey: walletData.secretkey     // Note the lowercase 'secretkey'
            };
            
            // console.log('Formatted wallet details:', formattedWalletDetails);
            setWalletDetails(formattedWalletDetails);
            setError(null);
          } else {
            setError('Invalid wallet data structure');
            console.error('Invalid wallet data structure:', walletData);
          }
        } else {
          setError('No wallet found');
        }
      } else {
        setError('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching wallet details:', error);
      setError(error.message || 'Failed to fetch wallet details');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    if (publicKey) {
      fetchWalletDetails(publicKey.toString());
    } else {
      setWalletDetails(null);
      setIsLoading(false);
    }
  }, [publicKey, fetchWalletDetails]);

  const toggleSecretVisibility = () => setIsSecretVisible(!isSecretVisible);

  const copyKeys = (key) => {
    try {
      const valueToCopy = key === 'public' ? walletDetails?.publicKey : walletDetails?.secretKey;
      
      if (valueToCopy) {
        navigator.clipboard.writeText(valueToCopy);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 3000);
        return true;
      }
      console.error('Failed to copy key - value not found');
      return false;
    } catch (error) {
      console.error('Error copying:', error);
      return false;
    }
  };

  if (isLoading) return <CustomRotatingLoader />;

  if (!walletDetails) {
    return (
      <div className='flex flex-col items-center gap-[60px] mt-[20px]'>
        <h1 className='text-[32px] leading-[30px] text-center text-[#E1E1E1]'>
          {error || "You don't have a Butter wallet to start churning!"}
        </h1>
        <button 
          className='rounded-[100px] w-[396px] h-[64px] bg-[#EEAB00] text-[#282B29] font-amaranth leading-[20px] font-bold text-[32px]'
          onClick={() => navigate('/butter-wallet')}
        >
          Create Wallet
        </button>
      </div>
    );
  }

  const renderKeyField = (label, value, keyType) => (
    <div className='font-cabin text-walletparaText text-[24px] text-center flex flex-col gap-1 mt-2'>
      <p>
        Your <span className='text-customLightBrownText'>ButterWallet</span> {label}:
      </p>
      <div className='flex items-center gap-2 w-[640px] px-4 py-1 bg-[#717171] rounded-xl'>
        <span className={`font-bold w-[545px] text-center break-all whitespace-normal overflow-ellipsis ${
          keyType === 'secret' && !isSecretVisible ? 'blur-sm' : ''
        }`}>
          {value || 'Not available'}
        </span>
        <div className="flex items-center gap-2">
          {keyType === 'secret' && (
            <VisibilityToggle isVisible={isSecretVisible} onClick={toggleSecretVisibility} />
          )}
          <CopyButton isCopied={copiedKey === keyType} onClick={() => copyKeys(keyType)} />
        </div>
      </div>
    </div>
  );

  return (
    <div className='flex flex-col justify-center items-center'>
      {renderKeyField('PublicKey', walletDetails.publicKey, 'public')}
      {renderKeyField('SecretKey', walletDetails.secretKey, 'secret')}
      <p className='text-center font-cabin font-bold text-customLightBrownText text-[20px] tracking-[3px] w-[545px] mt-10'>
        *Please copy your SecretKey and store it safely. DO NOT share your private key with anyone
      </p>
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

export default AccountCreation;