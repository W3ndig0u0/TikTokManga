const fs = require('fs');
const path = require('path');
const axios = require('axios');
const MFA = require('mangadex-full-api');
const videoshow = require('videoshow');
const probe = require('probe-image-size');
const { execSync } = require('child_process');



async function downloadMangaImages(mangaTitle, chapterIndex) {
  try {
    await MFA.login('PekoPek0W0', 'Jx1184479102');

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
  
  const majorityDimension = getMajorityDimension(imageDimensions);
  
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

  const videoDuration = filteredImages.length * 5 * 1000; // Each image has a duration of 3 seconds
  const videoDurationInSeconds = videoDuration / 1000;

  const musicDurationInSeconds = getMusicDurationInSeconds(musicFilePath); // Retrieve the music duration

  const loopCount = Math.ceil(videoDurationInSeconds / musicDurationInSeconds);

  const delay = videoDurationInSeconds % musicDurationInSeconds;
  
  const audioOptions = {
    fade: true,
    delay: delay > 0 ? musicDurationInSeconds - delay : 0,
    loop: loopCount,
  };
  

  videoshow(images, videoOptions)
  .audio(musicFilePath, audioOptions)
  .save(outputFilePath)
  .on('start', function (command) {
    console.log('ffmpeg process started:', command)
  })
  .on('error', function (err, stdout, stderr) {
    console.error('Error:', err)
    console.error('ffmpeg stderr:', stderr)
  })
  .on('end', function (output) {
    console.error('Video created in:', output)
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

function getMusicDurationInSeconds(musicFilePath) {
  try {
    const ffprobeOutput = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${musicFilePath}"`
    );
    const durationInSeconds = parseFloat(ffprobeOutput);
    return durationInSeconds;
  } catch (error) {
    console.error('Error getting music duration:', error);
    return 0;
  }
}

async function run() {
  const mangaTitle = 'Majutsu wo Kiwamete Tabi ni Deta Tensei Elf, Moteamashita Jumyou de Ikeru Densetsu to naru';
  const chapterIndex = 0;
  const musicFilePath = 'D:/TikTokManga/Songs/song1.mp3';
  // const imagePaths = await downloadMangaImages(mangaTitle, chapterIndex);
  const imageFolder = path.join('D:', 'TikTokManga', 'Manga', mangaTitle);
  createSlideshowVideo(mangaTitle, imageFolder, musicFilePath);
}

run();
