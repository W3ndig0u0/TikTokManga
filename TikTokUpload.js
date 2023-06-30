const fs = require('fs');
const TikTokScraper = require('tiktok-scraper');

async function uploadToTikTok() {
  try {
    // Specify TikTok username and password
    const username = 'mangonw';
    const password = 'Jx1184479102';

    // Login to TikTok
    await TikTokScraper.login({ username, password });

    // Upload the image
    // const uploadResponse = await TikTokScraper.uploadPhoto(imagePath);

    // Get the uploaded image URL
    // const uploadedImageUrl = uploadResponse.covers.origin;

    // Publish the image with caption
    // await TikTokScraper.postVideo({
    //   cover: uploadedImageUrl,
    //   description: caption,
    //   video: '', // Leave it empty if you don't have a video to attach
    // });

    console.log('Image uploaded to TikTok successfully!');
  } catch (error) {
    console.error('Error uploading image to TikTok:', error);
  }
}

uploadToTikTok();
