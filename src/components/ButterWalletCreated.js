import React, { useEffect, useState } from 'react'
import copy from '../../assets/copy.png'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom';
import { copyHandler } from '../../Controller/NewWalletTrimData';
import ContinueCard from './ContinueCard';
import previousarrow from '../../assets/previousarrow.png'

const ButterWalletCreated = () => {
    const { user_wallet_detail } = useSelector(state => state.UserNewWalletInfo);
    const UserNewWalletInfo = useSelector(state => state.UserNewWalletInfo);
    const navigate = useNavigate();
    const [isShown, setIsShown] = useState(false);
    const [isCopiedForPublic, setIsCopiedForPublic] = useState(false);
    const [isCopiedForSecret, setIsCopiedForSecret] = useState(false);
    const [isSecretVisible, setIsSecretVisible] = useState(false);

    // useEffect(() => {
    //     // console.log(UserNewWalletInfo);
    // }, [UserNewWalletInfo])

    const copyKeys = (key) => {
        try {
            const copyResp = copyHandler(user_wallet_detail, key);
            if (copyResp) {
                // // console.log('key copied successfully!');

                if (key === 'public') {
                    setIsCopiedForPublic(true);
                    setIsCopiedForSecret(false);
                } else if (key === 'secret') {
                    setIsCopiedForSecret(true);
                    setIsCopiedForPublic(false);
                }

                setTimeout(() => {
                    setIsCopiedForPublic(false);
                    setIsCopiedForSecret(false);
                }, 3000);

            } else {
                // // console.log('Failed to copy key');
            }
        } catch (error) {
            console.error('Error copying:', error);
            // // console.log('Failed to copy key');
        }
    }

    const toggleSecretVisibility = () => {
        setIsSecretVisible(!isSecretVisible);
    }

    return (
        <div className='relative w-[950px] h-[734px]'>
            <div className='absolute top-8 left-8 bg-[#EEAB00] w-[60px] h-[60px] rounded-full flex items-center justify-center cursor-pointer' onClick={() => navigate('/wallet-app')}>
                <img src={previousarrow} alt="Previous" className='w-[21.67px] h-[16.67px]' />
            </div>
            <div className={`bg-[#616060] rounded-3xl flex flex-col justify-center items-center gap-[40px] w-full h-full ${isShown ? 'opacity-50' : ''}`}>
                {/* Main content */}
                <h1 className='font-amaranth text-customLightBrownText text-[36px] tracking-[1.5px]'>
                    ButterWallet Created!
                </h1>
                <div className='font-cabin text-walletparaText text-[24px] text-center flex flex-col gap-1'>
                    <p>
                        Your <span className='text-customLightBrownText'>ButterWallet</span> PublicKey:
                    </p>
                    <div className='flex items-center gap-2 w-[640px] px-4 py-1 bg-[#717171] rounded-xl'>
                        <span className='font-bold w-[545px] text-center break-all whitespace-normal overflow-ellipsis'>
                            {user_wallet_detail?.publicKey}
                        </span>
                        {!isCopiedForPublic ? <img src={copy} alt="" className='w-[36px] h-[36px] hover:cursor-pointer'
                            onClick={() => {
                                copyKeys('public')
                            }}
                        />
                            :
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-clipboard2-check w-[30px] h-[30px] text-yellowButtonBg" viewBox="0 0 16 16">
                                <path d="M9.5 0a.5.5 0 0 1 .5.5.5.5 0 0 0 .5.5.5.5 0 0 1 .5.5V2a.5.5 0 0 1-.5.5h-5A.5.5 0 0 1 5 2v-.5a.5.5 0 0 1 .5-.5.5.5 0 0 0 .5-.5.5.5 0 0 1 .5-.5z" />
                                <path d="M3 2.5a.5.5 0 0 1 .5-.5H4a.5.5 0 0 0 0-1h-.5A1.5 1.5 0 0 0 2 2.5v12A1.5 1.5 0 0 0 3.5 16h9a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 12.5 1H12a.5.5 0 0 0 0 1h.5a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5z" />
                                <path d="M10.854 7.854a.5.5 0 0 0-.708-.708L7.5 9.793 6.354 8.646a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0z" />
                            </svg>
                        }
                    </div>
                </div>

                <div className='flex flex-col justify-center items-center'>
                    <div className='font-cabin text-walletparaText text-[24px] text-center flex flex-col gap-1 mt-2'>
                        <p>
                            Your <span className='text-customLightBrownText'>ButterWallet</span> SecretKey:
                        </p>
                        <div className='flex items-center gap-2 w-[640px]  px-4 py-1 bg-[#717171] rounded-xl'>
                            <span className={`font-bold w-[545px] text-left break-all whitespace-normal overflow-ellipsis ${!isSecretVisible && 'blur-sm'}`}>
                                {user_wallet_detail?.secretKey}
                            </span>
                            <div className="flex flex-col items-center gap-2">
                                {isSecretVisible ? (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="w-[24px] h-[24px] text-yellowButtonBg cursor-pointer"
                                        onClick={toggleSecretVisibility}
                                    >
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="w-[24px] h-[24px] text-yellowButtonBg cursor-pointer"
                                        onClick={toggleSecretVisibility}
                                    >
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                )}
                                {!isCopiedForSecret ? (
                                    <img
                                        src={copy}
                                        alt=""
                                        className='w-[36px] h-[36px] hover:cursor-pointer'
                                        onClick={() => copyKeys('secret')}
                                    />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="bi bi-clipboard2-check w-[30px] h-[30px] text-yellowButtonBg" viewBox="0 0 16 16">
                                        <path d="M9.5 0a.5.5 0 0 1 .5.5.5.5 0 0 0 .5.5.5.5 0 0 1 .5.5V2a.5.5 0 0 1-.5.5h-5A.5.5 0 0 1 5 2v-.5a.5.5 0 0 1 .5-.5.5.5 0 0 0 .5-.5.5.5 0 0 1 .5-.5z" />
                                        <path d="M3 2.5a.5.5 0 0 1 .5-.5H4a.5.5 0 0 0 0-1h-.5A1.5 1.5 0 0 0 2 2.5v12A1.5 1.5 0 0 0 3.5 16h9a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 12.5 1H12a.5.5 0 0 0 0 1h.5a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5z" />
                                        <path d="M10.854 7.854a.5.5 0 0 0-.708-.708L7.5 9.793 6.354 8.646a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </div>

                    <p className='text-center font-cabin font-bold text-customLightBrownText text-[20px] tracking-[3px]'>
                        *Please copy your SecretKey and store it safely. 
                    </p>
                </div>

                <div className='flex justify-center items-center gap-4 h-[64px] w-[756px]'>
                    <button type="button" className="flex items-center justify-center mt-2 bg-yellowButtonBg rounded-full w-[296px] h-[54px] font-amaranth 
                    font-bold  text-[32px] text-[#282B29]  "
                        onClick={() => { navigate('/new-wallet-balance') }}
                    >
                        Check Balance
                    </button>
                    <button type="button" className="flex items-center justify-center mt-2 bg-[#D4D4D4] rounded-full w-[296px] h-[54px] font-amaranth 
                    font-bold text-[32px] text-[#282B29]"
                        onClick={() => setIsShown(true)}
                    >
                        Continue
                    </button>
                </div>
            </div>
            {isShown && (
                <>
                    <div className="absolute inset-0 bg-[#2c2c2c] opacity-50 backdrop-blur-md rounded-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                        <ContinueCard onClose={() => setIsShown(false)} setIsShown={setIsShown} />
                    </div>
                </>
            )}
        </div>
    )
}

export default ButterWalletCreated