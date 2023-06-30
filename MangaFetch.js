const fs = require('fs');
const path = require('path');
const axios = require('axios');
const MFA = require('mangadex-full-api');
const videoshow = require('videoshow');
const probe = require('probe-image-size');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
require('dotenv').config();



async function downloadMangaImages(mangaTitle, chapterIndex) {
  try {
    const password = process.env.MANGAPASSWORD;

    await MFA.login('PekoPek0W0', password);

    // Get a manga:
    let manga = await MFA.Manga.getByQuery(mangaTitle);

    let chapters = await manga.getFeed({ translatedLanguage: ['en'] }, true);
    let chapter = chapters[chapterIndex];
    let pages = await chapter.getReadablePages();

    // Get who uploaded the chapter:
    let uploader = await chapter.uploader.resolve();

    let resolvedGroups = await MFA.resolveArray(chapter.groups);
    let groupNames = resolvedGroups.map(elem => elem.name);

    console.log(`Manga "${manga.title}" has a chapter titled "${chapter.title}" that was uploaded by ${uploader.username} and scanlated by ${groupNames.join(' and ')}.`);

    const mangaFolder = path.join(__dirname, 'Manga', manga.title);

    if (!fs.existsSync(mangaFolder)) {
      fs.mkdirSync(mangaFolder, { recursive: true });
    }

    const imagePaths = [];

    for (let i = 0; i < pages.length; i++) {
      const imageUrl = pages[i];
      const imageName = `${i + 1}.jpg`;
      const imagePath = path.join(mangaFolder, imageName);

      const response = await axios.get(imageUrl, { responseType: 'stream' });
      response.data.pipe(fs.createWriteStream(imagePath));
      console.log(`Downloaded page ${i + 1}`);
      console.log(imagePath)

      imagePaths.push(imagePath);
    }

    return imagePaths;
  } catch (error) {
    console.error(error);
    return [];
  }
}

function createSlideshowVideo(mangaTitle, imageFolder, musicFilePath) {
  const outputFileName = mangaTitle + '.mp4';
  const outputFilePath = path.join('Video', outputFileName);

  const images = fs.readdirSync(imageFolder)
    .filter(file => file.endsWith('.jpg'))
    .map(file => path.join(imageFolder, file))
    .sort((a, b) => {
      const regex = /(\d+)\.jpg$/;
      const indexA = parseInt(a.match(regex)[1]);
      const indexB = parseInt(b.match(regex)[1]);
      return indexA - indexB;
    });

    const imageDimensions = images.map(imagePath => {

      const dimensions = probe.sync(fs.readFileSync(imagePath));
      return `${dimensions.width}x${dimensions.height}`;
    });

  console.log(images);

  
  const majorityDimension = getMajorityDimension(imageDimensions);
  console.log(majorityDimension);

  const filteredImages = images.filter((imagePath, index) => {
    const dimensions = imageDimensions[index];
    return dimensions === majorityDimension;
  });


  const videoOptions = {
    fps: 30,
    loop: 5,
    transition: true,
    transitionDuration: 1,
    videoBitrate: '1024',
    videoCodec: 'libx264',
    size: '1080x1080',
    audioBitrate: '192k',
    audioChannels: 2,
    format: 'mp4',
    pixelFormat: 'yuv420p',
  };

  caption =  mangaTitle + "#manga, #anime";
  

  videoshow(images, videoOptions)
  .audio(musicFilePath)
  .save(outputFilePath)
  .on('start', function (command) {
    console.log('ffmpeg process started:', command)
  })
  .on('error', function (err, stdout, stderr) {
    console.error('Error:', err)
    console.error('ffmpeg stderr:', stderr)
  })
  .on('end', function (output) {
    console.error('Video created in:', output);
    (async () => {
      console.log(output);
      const password = process.env.TIKTOKPASSWORD;
      await loginToTikTok("haiyunmao6@gmail.com", password, output, caption);
    })();
  })
}

function getMajorityDimension(dimensions) {
  const counts = {};
  let majorityDimension = null;
  let maxCount = 0;

  dimensions.forEach(dimension => {
    counts[dimension] = (counts[dimension] || 0) + 1;

    if (counts[dimension] > maxCount) {
      majorityDimension = dimension;
      maxCount = counts[dimension];
    }
  });

  return majorityDimension;
}



async function loginToTikTok(username, password, videoPath, caption) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.tiktok.com/login');

  // Click on the "Use Phone/Email/Username" link
  const channelItems = await page.$$('[data-e2e="channel-item"]',{ timeout: 5000 });

  // Check if there is a second element
  if (channelItems.length >= 2) {
    // Click on the second element
    await channelItems[1].click();
  } else {
    console.log('Second channel item not found');
  }
  
  const emailLoginLink = await page.waitForSelector('a[href="/login/phone-or-email/email"]', { timeout: 5000 });
  await emailLoginLink.click();

  await page.waitForSelector('input[name="username"]', { timeout: 5000 });

  await page.type('input[name="username"]', username);

  await page.type('input[type="password"]', password);

  const loginButton = await page.waitForSelector('button[type="submit"][data-e2e="login-button"]', { timeout: 50000 });
  await loginButton.click();

  await page.waitForNavigation({ timeout: 100000 });

  // Check if the login was successful
  const loggedIn = await page.evaluate(() => {
    const errorElement = document.querySelector('.error-container');
    return !errorElement;
  });

  if (loggedIn) {
    console.log('Login successful');
    await page.goto('https://www.tiktok.com/upload?lang=sv-SE');
    await page.waitForTimeout(3000); // Wait for the page to load
  
    await uploadVideoToTikTok(videoPath, caption);
    } else {
    console.log('Login failed');
  }

  // Wait for some time before continuing (adjust the duration as needed)
  await page.waitForTimeout(5000);

  // Close the browser
  // await browser.close();
}


async function uploadVideoToTikTok(videoPath, caption) {
  // Upload video file
  const fileButton = await page.waitForSelector('button[aria-label="Välj fil"]');
  await fileButton.click();
  await page.waitForTimeout(2000); // Wait for the file selection dialog to open
  // Perform the file upload process using Puppeteer's file upload utility
  await fileInput.uploadFile(videoPath);

  await page.waitForTimeout(2000); // Wait for the video file to be added

  // Select cover image
  const coverImage = await page.waitForSelector('div.bg-container-v2 img[src^="blob"]');
  await coverImage.click();

  await page.waitForTimeout(2000); // Wait for the cover image selection options to appear

  // Toggle switch for using custom caption
  const captionSwitch = await page.waitForSelector('input[data-tux-switch-input="true"]');
  await captionSwitch.click();

  // Enter caption
  const captionInput = await page.waitForSelector('div[aria-label="Bildtext"] div[role="textbox"]');
  await captionInput.type(caption);

  // Edit video
  const editVideoButton = await page.waitForSelector('div.css-1z070dx');
  await editVideoButton.click();

  await page.waitForTimeout(2000); // Wait for the video editor to open

  // Hover over music card
  const musicCard = await page.waitForSelector('div.music-card-content');
  await musicCard.hover();

  await page.waitForTimeout(2000); // Wait for the music card operation options to appear

  // Select music card operation
  const musicCardOperation = await page.waitForSelector('div.music-card-operation');
  await musicCardOperation.click();

  await page.waitForTimeout(2000); // Wait for the changes to be applied

  // Save changes
  const saveChangesButton = await page.waitForSelector('div.css-1z070dx');
  await saveChangesButton.click();

  await page.waitForTimeout(2000); // Wait for the changes to be saved

  // Publish the video
  const publishButton = await page.waitForSelector('button.css-y1m958');
  await publishButton.click();

  await page.waitForTimeout(2000); // Wait for the publish process to complete
}


async function run() {
  const mangaTitle = "The Ancient Magus' Bride";
  const chapterIndex = 0;
  const musicFilePath = 'D:/TikTokManga/Songs/song1.mp3';
  // const imagePaths = await downloadMangaImages(mangaTitle, chapterIndex);
  const imageFolder = path.join('D:', 'TikTokManga', 'Manga', mangaTitle);
  createSlideshowVideo(mangaTitle, imageFolder, musicFilePath);
}


run();
