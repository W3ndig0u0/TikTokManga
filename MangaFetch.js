const MFA = require('mangadex-full-api');

async function run() {
  try {
    await MFA.login('PekoPek0W0', 'Jx1184479102');
    let manga = await MFA.Manga.getByQuery('Ancient Magus Bride');

    let chapters = await manga.getFeed({ translatedLanguage: ['en'] }, true); 
    let chapter = chapters[0];
    let pages = await chapter.getReadablePages(); 
    let uploader = await chapter.uploader.resolve();
    let resolvedGroups = await MFA.resolveArray(chapter.groups)
    let groupNames = resolvedGroups.map(elem => elem.name);
 
    console.log(`Manga "${manga.title}" has a chapter titled "${chapter.title}" that was uploaded by ${uploader.username} and scanlated by ${groupNames.join('and')}.`);
    pages.forEach(page => {
    console.log(`${page}`);
    });
  } catch (error) {
    console.error(error);
  }
}

run();
