import React from 'react'
import Card3 from './Card3.jsx/Card3'
import icons6 from '../../../assets/icons6.png'
import icons1 from '../../../assets/icon1.png'

const InnerMain3 = () => {
    const arr = [
        {
            title: 'Proprietary AIgo Strategies',
            para: 'Algo trading strategies and proprietary signal generation models built over multi cycle crypto exposure',
            src: icons6
        },
        {
            title: 'Robust on-chain engine',
            para: 'Novel on-chain execution engine designed for enterprise scale, able to power through volatile trading conditions and network congestion',
            src: icons1
        }
    ]
    return (
        <div className=' flex flex-col justify-center items-center mt-[6rem] xl:gap-20 lg:gap-16 md:gap-10 w-full pt-16 md:pt-0'>
            <div className='flex flex-col  text-customLightBrownText text-center'>
                <h1 className='lg:text-[64px] md:text-[36px] text-[36px] font-bold font-amaranth pb-4'>Reasons to Believe</h1>
                <h5 className='font-singlet pb-6 font-singlet tracking-wide lg:text-[24px] md:text-[18px]'>More than a larp? Reasons to believe in the Butter Factory </h5>
            </div>
            <div className='flex flex-col md:flex-row lg:gap-16 gap-16'>
                {
                    arr.map((item, index) => (
                        <Card3 item={item} key={index}/>
                    ))
                }
            </div>
        </div>
    )
}

export default InnerMain3
