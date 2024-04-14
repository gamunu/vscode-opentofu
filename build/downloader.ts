/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import got from 'got';
import * as fs from 'fs';
import * as path from 'path';
import Downloader from 'nodejs-file-downloader';

export interface Release {
  repository: string;
  package: string;
  destination: string;
  fileName: string;
  version: string;
  extract: boolean;
}

function getPlatform(platform: string) {
  if (platform === 'win32') {
    return 'windows';
  }
  if (platform === 'sunos') {
    return 'solaris';
  }
  return platform;
}

function getArch(arch: string) {
  // platform | terraform-ls  | extension platform | vs code editor
  //    --    |           --  |         --         | --
  // macOS    | darwin_amd64  | darwin_x64         | ✅
  // macOS    | darwin_arm64  | darwin_arm64       | ✅
  // Linux    | linux_amd64   | linux_x64          | ✅
  // Linux    | linux_arm     | linux_armhf        | ✅
  // Linux    | linux_arm64   | linux_arm64        | ✅
  // Windows  | windows_amd64 | win32_x64          | ✅
  // Windows  | windows_arm64 | win32_arm64        | ✅
  if (arch === 'x64') {
    return 'amd64';
  }
  if (arch === 'armhf') {
    return 'arm';
  }
  return arch;
}

interface ExtensionInfo {
  name: string;
  extensionVersion: string;
  languageServerVersion: string;
  preview: false;
  syntaxVersion: string;
}

function getExtensionInfo(): ExtensionInfo {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pjson = require('../package.json');
  return {
    name: 'opentofu',
    extensionVersion: pjson.version,
    languageServerVersion: pjson.langServer.version,
    syntaxVersion: pjson.syntax.version,
    preview: pjson.preview,
  };
}

async function downloadLanguageServer(platform: string, architecture: string, extInfo: ExtensionInfo) {
  const cwd = path.resolve(__dirname);

  const buildDir = path.basename(cwd);
  const repoDir = cwd.replace(buildDir, '');
  const installPath = path.join(repoDir, 'bin');
  const filename = process.platform === 'win32' ? 'opentofu-ls.exe' : 'opentofu-ls';
  const filePath = path.join(installPath, filename);
  if (fs.existsSync(filePath)) {
    if (process.env.downloader_log === 'true') {
      console.log(`OpenTofu LS exists at ${filePath}. Exiting`);
    }
    return;
  }

  fs.mkdirSync(installPath);

  const os = getPlatform(platform);
  const arch = getArch(architecture);

  const packageName =
    os === 'windows'
      ? `opentofu-ls_${extInfo.languageServerVersion}_${os}_${arch}.exe`
      : `opentofu-ls_${extInfo.languageServerVersion}_${os}_${arch}`;

  await fetchVersion({
    repository: 'gamunu/opentofu-ls',
    package: packageName,
    destination: installPath,
    fileName: filename,
    version: extInfo.languageServerVersion,
    extract: false,
  });
}

async function downloadSyntax(info: ExtensionInfo) {
  const release = `v${info.syntaxVersion}`;

  const productName = 'terraform'.replace('-preview', '');
  const executable = `${productName}.tmGrammar.json`;

  const cwd = path.resolve(__dirname);
  const buildDir = path.basename(cwd);
  const repoDir = cwd.replace(buildDir, '');
  const installPath = path.join(repoDir, 'syntaxes');

  const fpath = path.join(installPath, executable);
  if (fs.existsSync(fpath)) {
    if (process.env.downloader_log === 'true') {
      console.log(`Syntax path exists at ${fpath}. Exiting`);
    }
    return;
  }

  fs.mkdirSync(installPath);

  const url = `https://github.com/hashicorp/syntax/releases/download/${release}/${executable}`;
  if (process.env.downloader_log === 'true') {
    console.log(`Downloading: ${url}`);
  }
  const content = await got({ url }).text();
  fs.writeFileSync(fpath, content);
  if (process.env.downloader_log === 'true') {
    console.log(`Download completed: ${fpath}`);
  }
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
    const dStatus = await downloader.download(); //Downloader.download() resolves with some useful properties.

    if (os !== 'windows' && dStatus.filePath) {
      fs.chmodSync(dStatus.filePath, 0o777);
    }

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

async function run(platform: string, architecture: string) {
  const extInfo = getExtensionInfo();
  if (process.env.downloader_log === 'true') {
    console.log(extInfo);
  }

  await downloadSyntax(extInfo);

  // we don't download ls for web platforms
  if (os === 'web') {
    return;
  }

  await downloadLanguageServer(platform, architecture, extInfo);
}

let os = process.platform.toString();
let arch = process.arch;

// ls_target=linux_amd64 npm install
//  or
// ls_target=web_noop npm run download:artifacts
const lsTarget = process.env.ls_target;
if (lsTarget !== undefined) {
  const tgt = lsTarget.split('_');
  os = tgt[0];
  arch = tgt[1];
}

run(os, arch);
