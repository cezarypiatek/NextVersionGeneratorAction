import * as core from '@actions/core'
import * as exec from '@actions/exec'

const MAJOR_NUMBER_PATTERN = core.getInput('major-pattern')
const MINOR_NUMBER_PATTERN = core.getInput('minor-pattern')
const PATCH_NUMBER_PATTERN = core.getInput('patch-pattern')
const LAST_TAG_PATTERN = core.getInput('last-tag-pattern')
const OUTPUT_ENV_VARIABLE = core.getInput('output-to-env-variable')
const PRE_RELEASE_TAG = core.getInput('pre-release-tag')


async function run(): Promise<void> {
  try {
    await exec.exec("git fetch --prune --unshallow");
    let lastTag = "";
    let gitDescribeCommand = LAST_TAG_PATTERN.length ? `git describe --match "${LAST_TAG_PATTERN}" --tags --abbrev=0` : `git describe --tags --abbrev=0`
    await exec.exec(gitDescribeCommand, [], {
      listeners: {
        stdout: (data: Buffer) => {
          lastTag = data.toString().trim();
        }
      },
      ignoreReturnCode: true
    });

    let nextVersion = ""
    if (lastTag.length == 0) {
      nextVersion = `1.0.0.${process.env.GITHUB_RUN_NUMBER}`
    } else {

      let lastCommitsCommand = lastTag.length > 0 ? `git --no-pager log "${lastTag}..HEAD" --pretty=format:"%s"` : `git --no-pager log --pretty=format:"%s"`

      let lastCommits: Array<string> = [];
      await exec.exec(lastCommitsCommand, [], {
        listeners: {
          stdout: (data: Buffer) => {
            lastCommits.push(data.toString().trim());
          }
        }
      });


      let versionPattern: RegExp = /(?<major>\d+)(?:\.(?<minor>\d+))?(?:\.(?<patch>\d+))?(?:\.(?<build>\d+))?/;
      const matches: any = versionPattern.exec(lastTag);
      let groups: { major: number, minor: number, patch: number, build: number } = matches?.groups ?? {};
      if (groups.major == null) {
        groups.major = 1;
      }
      if (groups.minor == null) {
        groups.minor = 0;
      }

      if (groups.patch == null) {
        groups.patch = 0;
      }

      var shouldBumpUpMajor = MAJOR_NUMBER_PATTERN && lastCommits.some((line) => line.match(MAJOR_NUMBER_PATTERN));
      var shouldBumpUpMinor = !shouldBumpUpMajor && MINOR_NUMBER_PATTERN && lastCommits.some((line) => line.match(MINOR_NUMBER_PATTERN));
      var shouldBumpUpPatch = !shouldBumpUpMinor && PATCH_NUMBER_PATTERN && lastCommits.some((line) => line.match(PATCH_NUMBER_PATTERN));

      if (shouldBumpUpMajor) {
        groups.major++;
        groups.minor = 0;
        groups.patch = 0;
      } else if (shouldBumpUpMinor) {
        groups.minor++;
        groups.patch = 0;
      } else if (shouldBumpUpPatch) {
        groups.patch++;
      }
      nextVersion = `${groups.major}.${groups.minor}.${groups.patch}.${process.env.GITHUB_RUN_NUMBER}`;
    }

    if(PRE_RELEASE_TAG)
    {
      nextVersion+= `-${PRE_RELEASE_TAG}`;
    }

    core.setOutput('nextVersion', nextVersion)
    if (OUTPUT_ENV_VARIABLE) {
      core.exportVariable(OUTPUT_ENV_VARIABLE, nextVersion);
    }
    console.log(`Next version: ${nextVersion}`)
  }
  catch (error) {
    core.setFailed(error.message)
  }
}

run()