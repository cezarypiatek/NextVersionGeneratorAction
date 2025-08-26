# NextVersionGeneratorAction
GithubAction for generating next version number based on the git log and message patterns.

Example Usage:

```yml
- name: Calculate next version
  uses: cezarypiatek/NextVersionGeneratorAction@0.5
  with:
    major-pattern: 'BREAKING CHANGES:'
    minor-pattern: 'FEATURE:'
    patch-pattern: '.*'
    output-to-env-variable: 'VersionPrefix'
```

## How it works

This generator tries to retrieve the last version tag from the repository and bumps it up using [https://semver.org/](https://semver.org/) guideline.
It uses regex patterns passed as `major-pattern`, `minor-pattern`, and `patch-pattern` parameters to establish type of change that impacts the version.


## How to build github action

```
docker run -v ${pwd}:/action -it  node:24-alpine /bin/sh
cd action
npm i -g @vercel/ncc
npm install
ncc build ./src/main.ts
```