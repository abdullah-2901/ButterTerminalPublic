import React from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

const InnerMain7 = () => {
    const walletAddress = useSelector((state) => state.UserDetail.wallet)
    const navigate = useNavigate();

    const mintButtonHandler = () => {
        // console.log('walletAddress:', walletAddress);
        if (walletAddress) {
            toast.success('This page will be available soon.')
            // navigate('/mint-page');
            return
        }
        toast.error('Please connect your wallet first')
    }


    return (
        <div className='bg-customLightBrownText flex flex-col justify-center items-center xl:h-[228px] xl:w-[1200px] lg:h-[228px] 
        lg:w-[900px] md:h-[200px] md:w-[700px] w-[389px] h-[150px] my-12 px-[64px] md:gap-8 gap-4 rounded-[32px] lg:py-36 md:py-[25px]'>
            <h1 className='lg:text-[64px] md:text-[36px] text-[32px] font-bold font-amaranth pb-4 text-customDarkBrown'>Mint your
                NFTs</h1>
            <button
                className='text-customDarkBrown focus:outline-none bg-exploreYellow hover:bg-[#f7cc40] focus:ring-customDarkRed 
                font-singlet font-bold rounded-full 
            text-[20px] px-5 lg:py-2.5 md:py-2 text-center me-2 mb-2 lg:w-[177px] md:w-[137px]'
                onClick={mintButtonHandler}
            >
                Wen Mint?
            </button>
        </div>
    )
}

export default InnerMain7
