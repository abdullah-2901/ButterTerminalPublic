import React from 'react'
import Card from './Card/Card'
import icon2 from '../../../assets/icons2.png'
import icon3 from '../../../assets/icons3.png'
import icon4 from '../../../assets/icons4.png'
import icon5 from '../../../assets/icons5.png'
import rightArrow from '../../../assets/rightdownarrow.png'
import leftArrow from '../../../assets/leftdownarrow.png'

const InnerMain = () => {
    const array = [
        {
            title: 'Connect to the Butter Factory and <br /> explore the range of strategies',
            src: icon3,
            arrow: rightArrow
        },
        {
            title: 'Deposit funds into a strategy of <br /> your preference',
            src: icon4,
            arrow: leftArrow
        },
        {
            title: 'Let our ever improving system <br /> trade on your behalf',
            src: icon2,
            arrow: rightArrow
        },
        {
            title: 'Withdraw funds/profits at the end of <br /> the lockup period',
            src: icon5,
            arrow: null
        },
    ]
    return (
        <div className='flex flex-col lg:pt-28 md:pt-16 w-full pt-16'>
            <div className='flex flex-col  text-customLightBrownText text-center'>
                <h1 className='lg:text-[64px] md:text-[36px] text-[36px] font-bold font-amaranth pb-4'>Using Butter Trade</h1>
                <h5 className='font-singlet pb-6 font-singlet tracking-wide lg:text-[24px] md:text-[18px]'>We’re in alpha stage. You can explore our Solana Radar Hackathon <br />  submission by launching the appp</h5>
            </div>
            <div className='grid grid-cols-3 md:gap-20 gap-10 justify-items-center py-10'>
                {array.map((item, index) => {
                    if (index % 2 === 0) {
                        return (
                            <React.Fragment key={index}>
                                <div className='md:col-span-2 col-span-3' >
                                    <Card item={item} />
                                </div>
                                <div className='hidden md:block'></div>
                            </React.Fragment>
                        )
                    }
                    return (
                        <React.Fragment key={index}>
                            <div className='hidden md:block'></div>
                            <div className='md:col-span-2 col-span-3'>
                                <Card item={item} Right={true} />
                            </div>
                        </React.Fragment>
                    )
                })}



            </div>
        </div>
    )
}

export default InnerMain
