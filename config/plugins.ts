export default () => ({
  "config-sync": {
    enabled: true,
  },
  h5p: {
    enabled: true,
    resolve: './src/plugins/h5p',
    contentTypes: false, // Disable plugin's content-type (we use src/api/h5p-content instead)
    config: {
      // H5P library storage path
      librariesPath: "h5p/libraries",
      // H5P content storage path
      contentPath: "h5p/content",
      // H5P temporary files path
      temporaryFilesPath: "h5p/temp-files",
      // Highest legacy package expands to about 69 MiB.
      maxTotalSize: 96 * 1024 * 1024,
      // Legacy packages contain individual videos up to about 42 MiB.
      maxFileSize: 64 * 1024 * 1024,
      // Enable H5P Hub for downloading content types
      enableHubLocalization: true,
      enableLrsContentTypes: false,
      // Content user data (like quiz attempts, progress)
      contentUserDataStorage: true,
    },
  },
});
