#!/usr/bin/env node

/**
 * H5P Library Download Script
 *
 * Downloads essential H5P libraries from the H5P Hub.
 * Run this script to populate the libraries directory with full library files.
 *
 * Usage: node scripts/download-h5p-libraries.js
 */

const {
  H5PEditor,
  H5PConfig,
  fsImplementations,
  cacheImplementations,
} = require('@lumieducation/h5p-server');
const path = require('path');
const fs = require('fs-extra');

// Essential H5P libraries to download
const ESSENTIAL_LIBRARIES = [
  'H5P.MultiChoice',        // Multiple choice questions
  'H5P.TrueFalse',          // True/False questions
  'H5P.Blanks',             // Fill in the blanks
  'H5P.DragQuestion',       // Drag and drop
  'H5P.DragText',           // Drag text
  'H5P.MarkTheWords',       // Mark the words
  'H5P.QuestionSet',        // Quiz with multiple questions
  'H5P.SingleChoiceSet',    // Single choice set
  'H5P.Summary',            // Summary task
  'H5P.Accordion',          // Accordion
  'H5P.AdvancedText',       // Advanced text (HTML)
  'H5P.Audio',              // Audio player
  'H5P.Image',              // Image display
  'H5P.Video',              // Video player
  'H5P.Table',              // Table
  'H5P.Link',               // Link
  // These are larger and can be added later:
  // 'H5P.InteractiveVideo',   // Video with interactions (large)
  // 'H5P.CoursePresentation', // Slide presentations (large)
];

// Paths
const H5P_BASE_PATH = path.join(__dirname, '..', 'public', 'uploads', 'h5p');
const LIBRARIES_PATH = path.join(H5P_BASE_PATH, 'libraries');
const CONTENT_PATH = path.join(H5P_BASE_PATH, 'content');
const TEMP_PATH = path.join(H5P_BASE_PATH, 'temp');
const CORE_PATH = path.join(H5P_BASE_PATH, 'core');
const EDITOR_PATH = path.join(H5P_BASE_PATH, 'editor');

async function ensureDirectories() {
  console.log('📁 Ensuring directories exist...');
  await fs.ensureDir(LIBRARIES_PATH);
  await fs.ensureDir(CONTENT_PATH);
  await fs.ensureDir(TEMP_PATH);
  console.log('✅ Directories ready');
}

async function createH5PEditor() {
  console.log('🔧 Initializing H5P Editor...');

  // Create configuration
  const config = new H5PConfig(undefined, {
    baseUrl: 'http://localhost:1337',
    contentHubEnabled: true,
    fetchingDisabled: false,
    hubRegistrationEndpoint: 'https://api.h5p.org/v1/sites',
    hubContentTypesEndpoint: 'https://api.h5p.org/v1/content-types/',
    contentTypeCacheRefreshInterval: 86400000, // 24 hours
    enableLrsContentTypes: true,
    libraryInstallUrl: 'https://api.h5p.org/v1/libraries',
  });

  // Create storage implementations
  const libraryStorage = new fsImplementations.FileLibraryStorage(LIBRARIES_PATH);
  const contentStorage = new fsImplementations.FileContentStorage(CONTENT_PATH);
  const temporaryStorage = new fsImplementations.DirectoryTemporaryFileStorage(TEMP_PATH);

  // Create a simple in-memory cache
  const cache = new cacheImplementations.CachedKeyValueStorage('h5p');

  // Create the H5P Editor
  const h5pEditor = new H5PEditor(
    cache,
    config,
    libraryStorage,
    contentStorage,
    temporaryStorage
  );

  console.log('✅ H5P Editor initialized');
  return h5pEditor;
}

async function downloadLibrary(h5pEditor, machineName) {
  console.log(`📥 Downloading ${machineName}...`);

  try {
    // Install the library from the H5P Hub
    await h5pEditor.installLibraryFromHub(machineName);
    console.log(`✅ ${machineName} installed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to install ${machineName}:`, error.message);
    return false;
  }
}

async function verifyLibrary(machineName) {
  // Check if library folder has more than just library.json
  const libraryFolders = await fs.readdir(LIBRARIES_PATH);
  const matchingFolders = libraryFolders.filter(f => f.startsWith(machineName));

  for (const folder of matchingFolders) {
    const folderPath = path.join(LIBRARIES_PATH, folder);
    const files = await fs.readdir(folderPath);

    if (files.length > 1) {
      console.log(`  📂 ${folder}: ${files.length} files`);
      return true;
    }
  }

  return false;
}

async function listInstalledLibraries() {
  console.log('\n📚 Installed Libraries:');
  const folders = await fs.readdir(LIBRARIES_PATH);

  for (const folder of folders.sort()) {
    const folderPath = path.join(LIBRARIES_PATH, folder);
    const stat = await fs.stat(folderPath);

    if (stat.isDirectory()) {
      const files = await fs.readdir(folderPath);
      const hasFullInstall = files.length > 1;
      const status = hasFullInstall ? '✅' : '⚠️ (stub only)';
      console.log(`  ${status} ${folder} (${files.length} files)`);
    }
  }
}

async function main() {
  console.log('🚀 H5P Library Download Script');
  console.log('================================\n');

  try {
    // Ensure directories exist
    await ensureDirectories();

    // Clean up old stub libraries
    console.log('\n🧹 Cleaning up stub libraries...');
    const existingFolders = await fs.readdir(LIBRARIES_PATH);
    for (const folder of existingFolders) {
      const folderPath = path.join(LIBRARIES_PATH, folder);
      const files = await fs.readdir(folderPath);
      if (files.length === 1 && files[0] === 'library.json') {
        console.log(`  Removing stub: ${folder}`);
        await fs.remove(folderPath);
      }
    }

    // Create H5P Editor
    const h5pEditor = await createH5PEditor();

    // Download essential libraries
    console.log('\n📦 Downloading essential libraries...\n');

    let successCount = 0;
    let failCount = 0;

    for (const library of ESSENTIAL_LIBRARIES) {
      const success = await downloadLibrary(h5pEditor, library);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // List all installed libraries
    await listInstalledLibraries();

    // Summary
    console.log('\n================================');
    console.log('📊 Summary:');
    console.log(`  ✅ Successfully installed: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  📁 Libraries path: ${LIBRARIES_PATH}`);

    if (failCount > 0) {
      console.log('\n⚠️  Some libraries failed to install.');
      console.log('   This may be due to network issues or Hub availability.');
      console.log('   Try running the script again later.');
    }

    console.log('\n✨ Done!');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
