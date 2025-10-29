import React from 'react'

const Card3 = ({item}) => {
    return (
        <div className=" bg-transparent text-center  lg:w-100 flex flex-col items-center justify-end gap-8">
            {/* ${item.title === 'Proprietary AI Models' ? 'xl:w-[460px] lg:w-[400px]':'xl:w-[422px] lg:w-[400px]'} */}
            <span className={` flex justify-center`}>
                <img className={`${item.title === 'Proprietary AI Models' ? 'xl:!w-[300px] lg:!w-[200px] md:!w-[170px] !w-[260px] !h-[258px]'
                    :'xl:!w-[300px] lg:!w-[200px] md:!w-[170px] !w-[229px] !h-[224px]'}`} src={item.src} alt="butter icons"/>
            </span>
            <div className="py-5 text-white">
                <h1 className='font-amaranth pb-7 tracking-widest font-bold xl:text-[32px] lg:text-[28px] md:text-[20px] text-[20px]'>{item.title}</h1>
                <p className=' text-customGrayText font-singlet tracking-widest px-8'>{item.para}</p>
            </div>
        </div>

    )
}

export default Card3
