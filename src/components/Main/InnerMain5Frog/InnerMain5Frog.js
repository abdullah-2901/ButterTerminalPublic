import React from 'react'
import frog from '../../../assets/frog.png';
import { useNavigate } from 'react-router-dom';

const InnerMain5Frog = () => {
    const navigate = useNavigate();
    return (
        <div className='lg:flex flex-col md:flex-row justify-center items-center xl:gap-20 md:gap-[32px] gap-[8px] md:px-0 px-[12px] xl:pb-18 pb-[28px]'>
            <img src={frog} alt="frog...." className='xl:w-[402px] xl:h-[431px] lg:w-[350px] lg:h-[361px] md:w-[280px] md:h-[350px] w-[177px] h-[190px] ' />
            <div className='flex flex-col justify-center items-center md:gap-8 gap-2'>
                <div className=''>
                    <h1 className='font-amaranth xl:text-[64px] lg:text-[54px] md:text-[34px] text-[32px] font-bold text-customLightBrownText'>Butterfactory FAQs</h1>
                    <p className='font-singlet text-customLightBrownText xl:text-[24px] lg:text-[20px] md:text-[16px] text-[12px] lg:w-[530px] '>Have a lot of unanswered questions? Go through our FAQs to get a better understanding </p>
                </div>
                <button type="button" className="text-customDarkBrown focus:outline-none bg-exploreYellow focus:ring-customDarkRed font-bold font-singlet rounded-full xl:text-[20px] md:text-[16px] px-5 py-2.5 text-center me-2 mb-2 xl:w-[200px] xl:h-[56px] lg:w-[170px] lg:h-[50px] md:w-[148px] md:h-[50px] w-[120px] h-[39px] text-[12px]"
                    onClick={() => navigate('/faqs')}
                >
                    Learn More
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className=" inline xl:w-[20px] lg:w-[18px] md:w-[18px] w-[12px] ml-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

export default InnerMain5Frog;