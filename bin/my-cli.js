#!/usr/bin/env node

const inquirer = require('inquirer');
const shelljs = require('shelljs');
const semver = require('semver');
const path = require('path');
const fs = require('fs');


main();

async function main() {
  const pkg = readJSON('package.json');

  if (command('git status --porcelain .').trim()) {
    shelljs.echo('存在未提交的内容');
    shelljs.exit(1);
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `正在运行当前项目(${pkg.name})的构建发布流程，确定继续吗？`
    }
  ]);

  if (!confirm) {
    shelljs.echo('已取消执行构建发布流程');
    shelljs.exit(0);
  }

  if (pkg['my-cli'] && pkg['my-cli']['check-baidu-id']) {
    const  config = readJSON('config.json');
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
  command('git pull');
  // 运行测试
  command('npm test');
  //通过npm version更新版本号，但不自动添加git tag，而是在构建完成后由cli工具添加
  command(`npm version ${version} --no-git-tag-version`);
  // 构建
  command('npm run build');
  // 提交发布代码
  const nextVersion = semver.inc(pkg.version, version);
  command('git add . -A');
  command(`git commit -m "build: v${nextVersion}"`)
  command(`git tag -a v${nextVersion} -m "build: ${nextVersion}"`);
  command("git push")
  command("git push --tags");

}

function readJSON(jsonPath) {
  const jsonFilePath = path.join(process.cwd(), jsonPath);
  if (!fs.existsSync(jsonFilePath)) {
    shelljs.echo('找不到' + jsonPath);
    shelljs.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  }
  catch(err) {
    shelljs.echo(jsonPath + ': JSON解析出错');
    shelljs.exit(1);
  }
}

function command(shell) {
  const result = shelljs.exec(shell);
  if (!result) {
    shelljs.echo(`${shell}: 命令运行出错`);
    shelljs.exit(1);
  }
  if (result.code !== 0) {
    shelljs.echo(`${shell}: ${result.stderr.toString() || '命令运行出错'}`);
    shelljs.exit(1);
  }
  return result.stdout.toString() || '';
}
