import Parser from 'rss-parser';
import fetch from 'node-fetch';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;

  try {
    const proxyResponse = await fetch(url);
    const proxyData = await proxyResponse.text();

    const $ = cheerio.load(proxyData);

    // Select the desired divs using the given class
    const mediaDivs = $('.ddc-media.is-stacked');

    // Initialize an array to store the data
    const dataArray = [];

    // Loop through each div and extract data
    mediaDivs.each((index, element) => {
      const title = $(element).find('.ddc-media-title a').text();
      const link = $(element).find('.ddc-media-title a').attr('href');
      const date = $(element).find('.ddc-media-metadata').text().trim();
      const content = $(element).find('.ddc-media-content p').text().trim();
      
      // Check for the 'figure' tag inside the '.ddc-media-image' div
      const image = $(element).find('.ddc-media-image figure').attr('data-background-image');

      // Push the data into the array
      dataArray.push({
        title,
        link,
        date,
        content,
        image,
      });
    });

    res.status(200).json({ data: dataArray });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data' });
  }
}
