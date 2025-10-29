import React from 'react'

const Button = ({title}) => {
  return (
    <button className=' text-black 1.5xl:text-[24px] xl:text-[21px] lg:text-[21px] md:text-[14px] 
    text-[9px] font-bold rounded-[31.2px] 1.5xl:w-[175.25px] xl:w-[165.25px] 1.5xl:h-[67px] xl:h-[62px] lg:h-[40px] lg:w-[105.25px] md:h-[35px] md:w-[98.25px] w-[59px] h-[26px]' style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>{title}</button>
  )
}

export default Button
