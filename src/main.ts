import * as core from '@actions/core'
import * as exec from '@actions/exec'

interface NextVersionGeneratorSettings{
  readonly MAJOR_NUMBER_PATTERN: string,
  readonly MINOR_NUMBER_PATTERN : string,
  readonly PATCH_NUMBER_PATTERN : string,
  readonly VERSION_TAG_PREFIX : string,
  readonly OUTPUT_ENV_VARIABLE : string,
}

async function run(settings : NextVersionGeneratorSettings): Promise<void> {  
  try {
    await exec.exec("git fetch --prune --unshallow");
    let lastTag = "";
    let gitDescribeCommand = settings.VERSION_TAG_PREFIX.length ? `git describe --match "${settings.VERSION_TAG_PREFIX}*" --tags --abbrev=0` : `git describe --tags --abbrev=0`
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
      nextVersion = `1.0.0`
    } else {

      let lastCommitsCommand = lastTag.length > 0 ? `git --no-pager log "${settings.VERSION_TAG_PREFIX}${lastTag}..HEAD" --pretty=format:"%s"` : `git --no-pager log --pretty=format:"%s"`

      let lastCommits: Array<string> = [];
      await exec.exec(lastCommitsCommand, [], {
        listeners: {
          stdout: (data: Buffer) => {
            lastCommits.push(data.toString().trim());
          }
        }
      });


      let versionPattern: RegExp = /(?<major>\d+)(?:\.(?<minor>\d+))?(?:\.(?<patch>\d+))?/;
      const matches: any = versionPattern.exec(lastTag);
      let { major = 1, minor = 0, patch = 0 } : { major: number, minor: number, patch: number } = matches?.groups ?? {};
      
      var shouldBumpUpMajor = settings.MAJOR_NUMBER_PATTERN && lastCommits.some((line) => line.match(settings.MAJOR_NUMBER_PATTERN));
      var shouldBumpUpMinor = !shouldBumpUpMajor && settings.MINOR_NUMBER_PATTERN && lastCommits.some((line) => line.match(settings.MINOR_NUMBER_PATTERN));
      var shouldBumpUpPatch = !shouldBumpUpMinor && settings.PATCH_NUMBER_PATTERN && lastCommits.some((line) => line.match(settings.PATCH_NUMBER_PATTERN));

      if (shouldBumpUpMajor) {
        major++;
        minor = 0;
        patch = 0;
      } else if (shouldBumpUpMinor) {
        minor++;
        patch = 0;
      } else if (shouldBumpUpPatch) {
        patch++;
      }
      nextVersion = `${major}.${minor}.${patch}`;
    }

    core.setOutput('nextVersion', nextVersion)
    if (settings.OUTPUT_ENV_VARIABLE) {
      core.exportVariable(settings.OUTPUT_ENV_VARIABLE, nextVersion);
    }
    console.log(`Next version: ${nextVersion}`)
  }
  catch (error) {
    core.setFailed(error.message)
  }
}

let settings: NextVersionGeneratorSettings = {
  MAJOR_NUMBER_PATTERN: core.getInput('major-pattern'),
  MINOR_NUMBER_PATTERN: core.getInput('minor-pattern'),
  PATCH_NUMBER_PATTERN: core.getInput('patch-pattern'),
  VERSION_TAG_PREFIX: core.getInput('version-tag-prefix'),
  OUTPUT_ENV_VARIABLE: core.getInput('output-to-env-variable')
}
run(settings)