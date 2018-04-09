#!/usr/bin/env node

const inquirer = require('inquirer');
const shelljs = require('shelljs');
const semver = require('semver');
const path = require('path');
const fs = require('fs');
const pkgPath = path.join(process.cwd(), 'package.json');


main();

async function main() {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  if (pkg['my-cli'] && pkg['my-cli']['check-baidu-id']) {
    const configPath = path.join(process.cwd(), 'config.json');
    if (!fs.existsSync(configPath)) {
      shelljs.echo('找不到config.json');
      shelljs.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config['baidu-id']) {
      shelljs.echo('config.json缺少属性[baidu-id]');
      shelljs.exit(1);
    }
  }

  const { version } = await inquirer.prompt([
    {
      type: 'list',
      name: 'version',
      message: '版本号更新方式：',
      choices: [
        {
          name: `v${semver.inc(pkg.version, 'patch')}: Fix Bugs / Patch`,
          value: 'patch'
        },
        {
          name: `v${semver.inc(pkg.version, 'minor')}: Release New Version`,
          value: 'minor'
        },
      ]
    }
  ]);
  // 拉取最新版本
  shelljs.exec('git pull');
  // 运行测试
  shelljs.exec('npm test');
  //通过npm version更新版本号，但不自动添加git tag，而是在构建完成后由cli工具添加
  shelljs.exec(`npm version ${version} --no-git-tag-version`);
  // 构建
  shelljs.exec('npm run build');
  // 提交发布代码
  const nextVersion = semver.inc(pkg.version, version);
  shelljs.exec('git add . -A');
  shelljs.exec(`git commit -m "build: v${nextVersion}"`)
  shelljs.exec(`git tag -a v${nextVersion} -m "build: ${nextVersion}"`);
  shelljs.exec("git push")
  shelljs.exec("git push --tags");

}