import React from 'react'
import { Link, useRouteError } from 'react-router-dom'

const ErrorPage = () => {
    const error = useRouteError();

    return (
        <div id='error-page' className='w-full h-svh flex flex-col justify-center items-center gap-4 bg-customDarkBrown text-yellowButtonBg'>
            <h1 className='text-3xl font-bold font-singlet'>Oops!</h1>
            <p className='text-3xl font-bold font-singlet'>Sorry, an unexpected error has occurred.</p>
            <p className='font-amaranth'>
                <span className=' text-[20px]'>Error : </span>  <code>{error.statusText || error.message}</code>
            </p>
            <p className='text-[20px] font-singlet'>Click here to go on <Link to={'/'} className='hover:text-red-800 underline font-bold text-xl'> <i> home</i></Link> page</p>

        </div>
    )
}

export default ErrorPage
