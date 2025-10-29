import React from 'react'

const Main2Card = ({item}) => {
  return (
    <div className='flex flex-col bg-blogCardColor rounded-2xl items-start gap-4 px-6 py-4'>
      <h1 className='font-bold font-amaranth lg:text-[31.91px] md:text-[25.91px] text-blogHeading'>{item.title}</h1>
      <p className='font-singlet lg:text-[24px] md:text-[16px] text-blogHeading'>{item.description}</p>
    </div>
  )
}

export default Main2Card
