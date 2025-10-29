import React from 'react'

const disclaimerContent = [
  "The trading strategies provided by Butter Factory are based on historical data and algorithms developed by our team. While these strategies aim to identify potential trading opportunities, there are inherent risks associated with trading digital assets. The market is volatile, and past performance is not indicative of future results. You could lose some or all of your investment.",
  "Butter Factory does not guarantee any profits or returns from using our strategies. Individual results may vary based on market conditions and personal investment decisions. By using our services, you acknowledge and accept these risks.",
  "Any performance metrics or backtested results shown on our platform are hypothetical and do not guarantee future performance. Actual results may vary due to market conditions, changes in strategies, or other factors.",
  "Ensure that you are in compliance with the regulations and laws applicable in your jurisdiction regarding trading and investment in digital assets. Butter Factory is not responsible for any legal issues that may arise from your use of our services."
]

const Disclaimer = () => {
    return (
        <div className='flex flex-col justify-center items-center gap-4 my-[60px] w-[1310px]'>
            <h1 className='font-amaranth font-bold text-[48px] text-center tracking-[2px] text-[#F8F8AE] mb-6'>
                Disclaimer
            </h1>
            <div className='w-[1113px] h-auto py-[40px] px-[35px] font-cabin text-[16px] text-[#000000] rounded-[32px] flex flex-col gap-6'
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
            >
                {disclaimerContent.map((paragraph, index) => (
                    <p key={index} className="mb-4">{paragraph}</p>
                ))}
            </div>
        </div>
    )
}

export default Disclaimer