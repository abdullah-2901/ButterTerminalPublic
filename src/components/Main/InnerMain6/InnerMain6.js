import React from 'react'
import Button from '../../Button/Button'

const InnerMain6 = () => {
    const buttonArray = [
        {
            title: 'Gitbook'
        },
        {
            title: 'Blog'
        },
        {
            title: 'About'
        },
    ]

    return (
        <div className='1.5xl:w-[1310px] 1.5xl:h-[398px] xl:h-[398px] xl:w-[1200px] lg:w-[950px] lg:h-[328px] md:w-[700px] md:h-[290px] w-[398px] h-[180px] bg-[#474747] rounded-[31.24px] flex flex-col items-center justify-center mt-6 md:gap-8 gap-6'>
            <div className='flex flex-col items-center gap-5'>
                <div className='flex gap-4'>
                    {buttonArray.map((item, index) => {
                        return (
                            <Button title={item.title} key={index} />
                        )
                    })}
                </div>
                <p className='1.5xl:text-[34.24px] xl:text-[32.98px] lg:text-[28.98px] md:text-[19.98px] text-[11px] text-customLightBrownText font-singlet'>Follow Butter for shitposts and project updates </p>
            </div>
            <h1 className='1.5xl:text-[52.98px] xl:text-[54.98px] lg:text-[44.98px] md:text-[30.98px] text-[16px] text-customLightBrownText font-amaranth md:tracking-[3.5px] tracking-[2.5px]'>
                All Rights Reserved Butter DAO 2024
            </h1>
        </div>
    )
}

export default InnerMain6
