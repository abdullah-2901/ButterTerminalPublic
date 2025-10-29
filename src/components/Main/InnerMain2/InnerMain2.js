import React from 'react';
import Main2Card from './Card/Main2Card';


const InnerMain2 = () => {
    const blogArray = [
        {
            title: '$Butter the origin story',
            description: 'A timeless tale of how Butter came around'
        },
        {
            title: '$Butter Tokenomics and distribution',
            description: 'A look into how $Butter achieved decenteralization of supply'
        },
        {
            title: 'ELI5: How does the Butter Factory workand why should I be bullish?',
            description: 'A behind the scenes look into the building blocks that make us a truly unique undertaking'
        },
        {
            title: 'Solana Radar Hackathon Sumbission',
            description: 'A brief overview of our upcoming hackathon submission and why we think we’ll win!'
        },
    ]

    return (
        <div className='py-4 1.5xl:w-[1270px] xl:w-[1200px] md:w-[700px] w-[389px] '>
            <div className='flex flex-col  text-customLightBrownText text-center'>
                <h1 className='lg:text-[64px] md:text-[36px] text-[36px] font-bold font-amaranth pb-4'>Blogs</h1>
                <h5 className='font-singlet pb-6 font-singlet tracking-wide lg:text-[24px] md:text-[16px] hidden md:block'>For anons that want to go down the Butter Factory rabbit hole</h5>
            </div>
            <div className='grid md:grid-rows-2 grid-rows-4 grid-flow-col gap-10 md:px-none '>
                {blogArray.map((item ,index) => {
                    return (
                        <Main2Card key={index} item={item}/>
                    )
                }
                )}
            </div>
        </div>
    );
}

export default InnerMain2;
