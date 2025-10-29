import React from 'react'
import churner from '../../assets/churnermachine1.png'
import './Main.css'
import group from '../../assets/Group24.png'
import InnerMain from './InnerMain/InnerMain'
import InnerMain2 from './InnerMain2/InnerMain2'
import InnerMain3 from './InnerMain3/InnerMain3'
import InnerMain4 from './InnerMain4/InnerMain4'
import InnerMain5Frog from './InnerMain5Frog/InnerMain5Frog'
import InnerMain6 from './InnerMain6/InnerMain6'
import InnerMain7 from './InnerMain7/InnerMain7'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import toast, { Toaster } from 'react-hot-toast'

const Main = () => {
    const navigate = useNavigate()
    const { publicKey, connect } = useWallet();

    const launchAppHandler = async () => {
        if (!publicKey) {
            toast.error('Connect your wallet!');
            return;
        }

        try {
            // Attempt to connect wallet if not already connected
            toast('Under maintenance',
                {
                  icon: 'ℹ',
                  style: {
                    borderRadius: '10px',
                    background: '#EEAB00',
                    color: '#fff',
                  },
                }
              );
            // await connect();

            // // Check again if wallet is connected
            if (publicKey) {
                navigate('/wallet-app');
            } else {
                toast.error('Wallet connection failed. Please try again.');
            }
        } catch (error) {
            console.error('Wallet connection error:', error);
            toast.error('Failed to connect wallet, Error: ', error);
        }
    };

    return (
        <div id='about-section' className=' flex flex-col items-center justify-center'>
            <Toaster />
            <div className=' flex flex-col-reverse md:flex-row justify-around items-center text-customBrownNewText xl:w-[1063.75px] lg:w-[900px] md:w-[660px] lg:pl-0 md:pl-6'>
                <div className='flex flex-col  md:gap-8 gap-6 md:mt-0 mt-8 text-customLightGrayText md:max-w-none max-w-[349px]'>
                    <h1
                        className='1.5xl:text-[62px] 1.5xl:leading-[82px] xl:text-[56px]  xl:leading-[70px] lg:leading-[70px] lg:text-[56px] md:leading-[40px] md:text-[30px] text-[36px] leading-[40px] font-amaranth'
                    >
                        <p className='inline text-customLightBrownText'>Solana's native </p>
                        <br />garageband algo <br /> trading firm
                    </h1>
                    <h4 className='text-customLightBrownText xl:text-[20px] lg:text-[17px] md:text-[12px] text-[16px] drop-shadow-2xl font-singlet tracking-wide'>
                        Deposit funds into our auto-trading vaults based on your investment profile and risk appetite
                    </h4>

                    <button type="button" className="text-customDarkBrown focus:outline-none bg-exploreYellow focus:ring-customDarkRed font-bold font-singlet rounded-full 1.5xl:text-[24px] 
                    1.5xl:px-5 1.5xl:py-2.5 text-center me-2 mb-2 1.5xl:w-[302px] 1.5xl:h-[56px] xl:w-[302px] xl:h-[46px] lg:w-[302px] lg:h-[46px] md:w-[120px] md:h-[40px] w-[151px] h-[42px]"
                        onClick={launchAppHandler}
                    >
                        Create Account
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className=" inline 1.5xl:w-[24px] xl:w-[18px] w-[18px] ml-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                </div>
                <div>
                    <img src={churner} alt="churner" className='1.5xl:w-[556.69px] 1.5xl:h-[556.69px] xl:w-[526.69px] xl:h-[526.69px] lg:!w-[516.69px] lg:!h-[410.69px] md:!w-[516.69px] md:!h-[410.69px] ' />
                </div>
            </div>
            {/* <div className='mb-12 hidden md:flex'>
                <img src={group} alt="group text" className='mt-10 1.5xl:w-[1150px] 1.5xl:h-[110px] xl:w-[1200px] xl:h-[110px] lg:w-[940px] lg:h-[95px] md:w-[700px] md:h-[75px] ' />
            </div> */}
            <InnerMain3 />
            <InnerMain />
            <InnerMain7 />
            <InnerMain5Frog />
            {/* <InnerMain2 /> */}
            <InnerMain4 />
            <div className='mb-10'>
                <InnerMain6 />
            </div>
        </div>

    )
}

export default Main
