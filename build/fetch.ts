import Downloader from 'nodejs-file-downloader';

export interface Release {
  repository: string;
  package: string;
  destination: string;
  fileName: string;
  version: string;
  extract: boolean;
}

export async function fetchVersion(release: Release): Promise<void> {
  validateRelease(release);
  await downloadFile(release);
}

async function downloadFile(release: Release) {
  const url = `https://github.com/${release.repository}/releases/download/v${release.version}/${release.package}`;
  const downloader = new Downloader({
    url: url, //If the file name already exists, a new file with the name 200MB1.zip is created.
    directory: release.destination, //This folder will be created, if it doesn't exist.
    fileName: release.fileName,
  });

  try {
    await downloader.download(); //Downloader.download() resolves with some useful properties.

    if (process.env.downloader_log === 'true') {
      console.log(`Download completed`);
    }
  } catch (error) {
    throw new Error(`Release download failed version: ${release.version}, fileName: ${release.fileName}`);
  }
}

function validateRelease(release: Release) {
  if (!release.repository) {
    throw new Error('Missing release repository');
  }

  if (!release.package) {
    throw new Error('Missing release package name');
  }

  if (!release.destination) {
    throw new Error('Missing release destination');
  }

  if (!release.version) {
    throw new Error('Missing release version');
  }
}
