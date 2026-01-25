const { H5PEditor, H5PConfig, fsImplementations, cacheImplementations } = require('@lumieducation/h5p-server');
const path = require('path');

const H5P_BASE_PATH = '/Users/Vladyslav_Bondarchuk/Work/school/strapi-school/public/uploads/h5p';
const LIBRARIES_PATH = path.join(H5P_BASE_PATH, 'libraries');
const CONTENT_PATH = path.join(H5P_BASE_PATH, 'content');
const TEMP_PATH = path.join(H5P_BASE_PATH, 'temp');

async function debug() {
  const config = new H5PConfig(undefined, {
    baseUrl: 'http://localhost:1337/api/h5p',
    contentHubEnabled: true,
  });

  const libraryStorage = new fsImplementations.FileLibraryStorage(LIBRARIES_PATH);
  const contentStorage = new fsImplementations.FileContentStorage(CONTENT_PATH);
  const temporaryStorage = new fsImplementations.DirectoryTemporaryFileStorage(TEMP_PATH);
  const cache = new cacheImplementations.CachedKeyValueStorage('h5p');

  const editor = new H5PEditor(cache, config, libraryStorage, contentStorage, temporaryStorage);

  const user = { id: '1', name: 'admin', canUpdateAndInstallLibraries: true, canInstallRecommended: true, canCreateRestricted: true, type: 'local' };

  const html = await editor.render(undefined, 'en', user);

  // Look at script tags
  console.log('=== LOOKING FOR SCRIPT TAGS ===');
  const scriptStart = html.indexOf('<script src=');
  if (scriptStart >= 0) {
    console.log('Script tags start at:', scriptStart);
    console.log(html.substring(scriptStart, scriptStart + 2000));
  }
}

debug().catch(console.error);
