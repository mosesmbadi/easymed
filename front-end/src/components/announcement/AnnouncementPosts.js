import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'

import { getAllAnnouncements } from '@/redux/features/announcements';
import { useAuth } from '@/assets/hooks/use-auth';

const AnnouncementPosts = ({AnnouncementChannel, paginate}) => {
    const dispatch = useDispatch();
    const auth = useAuth();
    const router = useRouter();
    const announcements = useSelector((store)=> store.announcement.announcements)    

    useEffect(()=>{
      if(auth){
        dispatch(getAllAnnouncements(auth))
      }
    }, [])

    const sortedAnnouncements = [...announcements]; // Create a copy of the array
    sortedAnnouncements.sort((a, b) => b.id - a.id); // Sort by announcement ID from largest to smallest
    
    const topFiveAnnouncements = AnnouncementChannel ? (
      sortedAnnouncements
    .filter((announcement) =>  announcement.channel === AnnouncementChannel?.id )
    .slice(0, paginate ? paginate : 100) // Take the top paginate announcements or 100 if no paginate is passed
    .map((announcement) => (
      <li className='w-full' key={announcement.id}>
        <div className='flex flex-col w-full gap-2'>
          <h3 className='font-semibold text-warning text-lg'>{announcement.title}</h3>
          <span className='text-sm'>{announcement.content}</span>
        </div>
      </li>
    ))
    ) : (
      sortedAnnouncements
    .slice(0, paginate ? paginate : 100) // Take the top paginate announcements or 100 if no paginate is passed
    .map((announcement) => (
      <li className='w-full' key={announcement.id}>
        <div className='flex flex-col w-full gap-2'>
          <h3 className='font-semibold text-warning text-lg'>{announcement.title}</h3>
          <span className='text-sm'>{announcement.content}</span>
        </div>
      </li>
    ))
    )

  return (
    <section className="w-full p-2">
      <div className='w-full items-center px-8 pb-4 flex h-full rounded-lg border border-background shadow-lg'>
        {announcements.length <= 0 ? (
          <div className='w-full items-center flex h-full justify-center'>
            <h2>no announcement</h2>
          </div>
        ) : (
          <div className='w-full flex h-full flex-col'>
            <div className="flex gap-4 mb-8 items-center">
                <img onClick={() => router.back()} className="h-3 w-3 cursor-pointer" src="/images/svgs/back_arrow.svg" alt="go back"/>
                <h3 className="text-2xl font-bold my-4 text-primary"> {`Top ${AnnouncementChannel ? AnnouncementChannel?.name : 'everyone'}'s announcements`} </h3>
            </div>
            <ul className='flex flex-col gap-4 w-full'>
              {topFiveAnnouncements}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

export default AnnouncementPosts;