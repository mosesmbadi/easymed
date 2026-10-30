import React from 'react'

const NewsItem = ({feed}) => {
  return (
    <div className='w-full h-80 py-2'>
       <img src={feed.image} className='w-full h-48 rounded-md mb-1 z-0'/>
        <a className='font-semibold text-center text-lg' href={`https://www.drugs.com/${feed.link}`} target="_blank" rel="noopener noreferrer">
           {feed.title.substring(0,55)}...
        </a>
        <p className='text-sm font-light mt-1'>{feed.content.substring(0,80)}...</p>
    </div>
  )
}

export default NewsItem