import React from 'react'
import twoFrog from '../../../assets/twoFrog.png'
import discord from '../../../assets/discord.png'
import twitter from '../../../assets/tweeter.png'
import telegram from '../../../assets/telegram.png'


const InnerMain4 = () => {
    return (
            <div id="community-section" className='bg-customLightBrownText flex flex-col-reverse items-center md:flex-row justify-center md:items-end 1.5xl:w-[1270px] xl:w-[1200px] 1.5xl:h-[428px] xl:h-[390px] lg:w-[950px] lg:h-[350px] md:w-[700px] md:h-[290px] w-[389px] h-[349px] my-12 px-[7px] lg:gap-16 md:gap-8 gap-6 rounded-[32px] '>
                <div>
                    <img src={twoFrog} alt="two frogs hugging..." className='1.5xl:w-[426px] 1.5xl:h-[370px] xl:w-[350px] xl:h-[310px] lg:w-[320px] lg:h-[280px] md:w-[265px] md:h-[225px] w-[216px] h-[188px]' />
                </div>
                <div className='flex flex-col items-center xl:gap-10 lg:gap-4 md:gap-4 gap-6 self-stretch justify-center'>
                    <div className='font-amaranth 1.5xl:text-[56px] xl:text-[46px] lg:text-[37px] md:text-[22px] text-[32px] text-customDarkBrown font-bold'>Join The Butter Community</div>
                    <div className='flex lg:gap-12 gap-6'>
                        <button className=''>
                            <img src={discord} alt="discord" className='1.5xl:w-[75px] 1.5xl:h-[75px] xl:w-[65px] xl:h-[65px] lg:w-[55px] lg:h-[55px] md:w-[43px] md:h-[43px] w-[40px] h-[40px]'/>
                        </button>
                        <button>
                            <img src={twitter} alt="X" className='1.5xl:w-[75px] 1.5xl:h-[75px] xl:w-[65px] xl:h-[65px] lg:w-[55px] lg:h-[55px] md:w-[43px] md:h-[43px] w-[40px] h-[40px'/>
                        </button>
                        <button>
                            <img src={telegram} alt="Telegram" className='1.5xl:w-[75px] 1.5xl:h-[75px] xl:w-[65px] xl:h-[65px] lg:w-[55px] lg:h-[55px] md:w-[43px] md:h-[43px] w-[40px] h-[40px'/>
                        </button>
                    </div>
                </div>
            </div>
    )
}

export default InnerMain4
