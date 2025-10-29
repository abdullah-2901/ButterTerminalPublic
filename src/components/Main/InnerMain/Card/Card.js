import React from 'react'

const Card = ({ item, Right }) => {
    return (
        <div className='md:relative xl:mb-10 lg:mb-2'>
            <div className={`flex items-center bg-transparent xl:mt-4 md:mt-2  relative ${!Right ? 'flex':'flex-row-reverse'}`}>
                <img
                    className={`md:object-cover md:absolute xl:-bottom-[px] lg:-bottom-[px] md:-bottom-[px] xl:w-[256px] xl:h-[251px] lg:w-[150px] lg:h-[140px] md:w-[135px] md:h-[135px] w-[137px] h-[134px]
                    ${Right ? 'xl:-right-44 lg:-right-[102px] md:-right-[95px]' : 'xl:-left-48 lg:-left-[115px] md:-left-[105px]'} `}
                    src={item.src}
                    alt="axe..." />
                <div className="flex flex-col border text-customDarkBrown bg-customLightBrownText rounded-3xl
                md:px-8 xl:py-7 px-4 lg:py-5 py-3 md:max-w-none md:max-h-none max-w-[255px] max-h-[95px]  justify-between">
                    <p className="mb-2 xl:text-[24px] lg:text-[22px] md:text-[14px] tracking-tight font-singlet dark:text-white" dangerouslySetInnerHTML={{ __html: item.title }} />
                </div>
            </div>
            {item.arrow &&
                <div className={`${Right ? 'md:absolute xl:-left-[215px] xl:top-[68px] lg:-left-[165px] lg:top-[46px] md:-left-[105px] md:top-[35px]' : 'absolute xl:-right-[215px] xl:top-[68px] lg:-right-[165px] lg:top-[46px] md:-right-[105px] md:top-[35px]'} hidden md:block`} >
                    <img src={item.arrow} alt="arrow pic..." className='xl:w-[191px] xl:h-[190px] lg:w-[161px] lg:h-[160px] md:w-[101px] md:h-[120px]' />
                </div>
            }
        </div>
    )
}

export default Card
