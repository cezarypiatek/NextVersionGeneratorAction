import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as path from 'path'
import * as io from '@actions/io'
import { ExecOptions } from '@actions/exec/lib/interfaces'


const MAJOR_NUMBER_PATTERN = core.getInput('major-pattern')
const MINOR_NUMBER_PATTERN = core.getInput('minor-pattern')
const PATCH_NUMBER_PATTERN = core.getInput('patch-pattern')
const LAST_TAG_PATTERN = core.getInput('last-tag-pattern')
const OUTPUT_ENV_VARIABLE = core.getInput('last-tag-pattern')


async function run(): Promise<void> {
  try {
    await exec.exec("git fetch --prune --unshallow");
    let lastTag = "";
    await exec.exec(`git describe --tags --abbrev=0`, [], {
      listeners: {
        stdout: (data: Buffer) => {
          lastTag = data.toString().trim();
        }
      },
      ignoreReturnCode: true
    });
    let lastCommitsCommand = lastTag.length > 0 ? `git --no-pager log "${lastTag}..HEAD" --pretty=format:"%s"` : `git --no-pager log --pretty=format:"%s"`

    let lastCommits: Array<string> = [];
    await exec.exec(lastCommitsCommand, [], {
      listeners: {
        stdout: (data: Buffer) => {
          lastCommits.push(data.toString().trim());
        }
      }
    });

    if (lastTag.length == 0) {
      lastTag = "1.0.0.0"
    }
    let versionPattern: RegExp = /(?<major>\d+)\.(?<minor>\d+).(?<patch>\d+).(?<build>\d+)/;
    const matches: any = versionPattern.exec(lastTag);
    let groups: { major: number, minor: number, patch: number, build: number } = matches?.groups ?? { major: 1, minor: 0, patch: 0, build: 0 }
    var shouldBumpUpMajor = MAJOR_NUMBER_PATTERN && lastCommits.some((line) => line.match(MAJOR_NUMBER_PATTERN));
    var shouldBumpUpMinor = !shouldBumpUpMajor && MINOR_NUMBER_PATTERN && lastCommits.some((line) => line.match(MINOR_NUMBER_PATTERN));
    var shouldBumpUpPatch = !shouldBumpUpMinor && PATCH_NUMBER_PATTERN && lastCommits.some((line) => line.match(PATCH_NUMBER_PATTERN));

    if (shouldBumpUpMajor) {
      groups.major++;
    } else if (shouldBumpUpMinor) {
      groups.minor++;
    } else if (shouldBumpUpPatch) {
      groups.patch++;
    }
    const nextVersion = `${groups.major}.${groups.minor}.${groups.patch}.${process.env.GITHUB_RUN_NUMBER}`;
    core.setOutput('nextVersion', nextVersion)
    if(OUTPUT_ENV_VARIABLE)
    {
      core.exportVariable(OUTPUT_ENV_VARIABLE, nextVersion);
    }
    console.log(`Next version: ${nextVersion}`)
  }
  catch (error) {
    core.setFailed(error.message)
  }
}

run()