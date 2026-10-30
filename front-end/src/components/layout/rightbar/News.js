import React, { useEffect, useState } from 'react';
import Carousel from 'react-material-ui-carousel'
import NewsItem from './NewsItem';

const News = () => {
  const [feed, setFeed] = useState(null);

  const url = "https://www.drugs.com/medical-news.html"

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const response = await fetch(`/api/fetch-rss/${encodeURIComponent(url)}`);
        
        const parsedFeed = await response.json();
        setFeed(parsedFeed);
      } catch (err) {
        console.error('Error fetching RSS feed:', err);
      }
    };

    fetchFeed();
  }, [url]);

  return (
  <div className='w-full h-80 py-2 justify-center flex'>
    {feed ? (
    <div>
    <p className='text-xs text-center'>Medical News - Latest Updates at Drugs.com</p>
    <Carousel
      className="z-0"
      interval={10000}
      indicators={false}
      height={300}
    >
    {
        feed.data.map( (item, i) => <NewsItem feed={item} key={i}/> )
    }
    </Carousel>
    </div>
    ) : <div class="loading-spin"><div></div><div></div></div> }
  </div>

  )
}

export default News