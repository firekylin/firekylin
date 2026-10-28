const fs = require('fs');
const path = require('path');
const cluster = require('cluster');
const Base = require('./base');

const statsAsync = think.promisify(fs.stat);
const readdirAsync = think.promisify(fs.readdir);
const readFileAsync = think.promisify(fs.readFile);
const writeFileAsync = think.promisify(fs.writeFile);
const THEME_DIR = think.THEMES_PATH;

module.exports = class extends Base {
  /**
   * forbidden ../ style path
   */
  pathCheck(themePath, basePath = THEME_DIR) {
    if (themePath.indexOf(basePath) !== 0) {
      this.fail();
      throw Error(`theme path ${themePath} error`);
    }
    return true;
  }

  async getAction() {
    switch (this.get('type')) {
      case 'fileList':
        const {theme} = this.get();
        const themePath = path.join(THEME_DIR, theme);
        this.pathCheck(themePath);

        const files = await this.getFileList(themePath);
        return this.success(files);

      case 'file':
        let {filePath} = this.get();
        filePath = path.join(THEME_DIR, filePath);
        this.pathCheck(filePath);

        const file = await readFileAsync(filePath, {encoding: 'utf-8'});
        return this.success(file);

      case 'templateList':
        return await this.getPageTemplateList();

      case 'themeFields':
        return await this.getThemeFields();

      case 'themeList':
      default:
        return await this.getThemeList();
    }
  }

  async updateAction() {
    let {filePath, content} = this.post();
    filePath = path.join(THEME_DIR, filePath);
    this.pathCheck(filePath);

    try {
      await writeFileAsync(filePath, content, {encoding: 'utf-8'});

      if (cluster.isWorker) {
        process.send('think-cluster-reload-workers');
      }
    } catch (e) {
      return this.fail(e);
    }
    return this.success();
  }

  /**
   * Fork theme
   */
  async putAction() {
    return this.fail('自动克隆接口已废弃，你可以手动操作');

    // let {theme, new_theme} = this.post();
    // let themeDir = path.join(THEME_DIR, theme);
    // let newThemeDir = path.join(THEME_DIR, new_theme);
    // this.pathCheck(themeDir) && this.pathCheck(newThemeDir);

    // try {
    //   /*let stat = */await statsAsync(newThemeDir);
    //   return this.fail(`${new_theme} 已存在，请手动切换到该主题`);
    // } catch(e) {
    //   execSync(`cp -r ${themeDir} ${newThemeDir}`);

    //   let configPath = path.join(newThemeDir, 'package.json');
    //   let config = think.require(configPath);
    //   config.name = new_theme;

    //   try {
    //     await writeFileAsync(
    //       configPath,
    //       JSON.stringify(config, null, '\t'),
    //       {encoding: 'utf-8'}
    //     );
    //     await this.model('options').updateOptions('theme', new_theme);
    //     return this.success();
    //   } catch(e) {
    //     return this.fail(e);
    //   }
    // }
  }

  /**
   * 递归获取文件夹树
   */
  async getFileList(base) {
    const result = [];
    const files = await readdirAsync(base);

    for (const file of files) {
      const pos = path.join(base, file);
      const stat = await statsAsync(pos);
      if (stat.isDirectory()) {
        result.push({
          module: file,
          children: await this.getFileList(pos)
        });
      }

      if (stat.isFile()) {
        result.push({module: file});
      }
    }

    return result;
  }

  /**
   * 获取主题列表
   */
  async getThemeList() {
    const themes = await readdirAsync(THEME_DIR);

    const result = [];
    for (const theme of themes) {
      const infoFile = path.join(THEME_DIR, theme, 'package.json');
      try {
        /* let stat = */await statsAsync(infoFile);
        const infoData = JSON.parse(await readFileAsync(infoFile));
        const preview = ['screenshot.png', 'screenshot.jpg', 'screenshot.webp']
          .find(file => fs.existsSync(path.join(THEME_DIR, theme, file)));
        const base = process.env.FIREKYLIN_PROJECT_PATH ? 'themes' : 'theme';
        result.push({...infoData, id: theme, screenshot: preview
          ? `/${base}/${encodeURIComponent(theme)}/${preview}` : null});
      } catch (e) {
        console.log(e); // eslint-disable-line no-console
      }
    }
    return this.success(result);
  }

  /**
   * 获取主题的自定义模板
   */
  async getPageTemplateList() {
    const {theme} = this.get();
    const templatePath = path.join(THEME_DIR, theme, 'template');
    this.pathCheck(templatePath);

    let templates = [];
    try {
      const stat = await statsAsync(templatePath);
      if (!stat.isDirectory()) {
        throw Error();
      }
    } catch (e) {
      return this.success(templates);
    }
    templates = await readdirAsync(templatePath);
    templates = templates.filter(t => /\.eta$/.test(t));
    return this.success(templates);
  }

  /** 获取主题在 package.json 中声明的通用文章字段。 */
  async getThemeFields() {
    const {theme} = this.get();
    if (!theme || theme !== path.basename(theme)) {
      return this.success([]);
    }
    const infoFile = path.join(THEME_DIR, theme, 'package.json');
    this.pathCheck(infoFile);

    let fields = [];
    try {
      const info = JSON.parse(await readFileAsync(infoFile, {encoding: 'utf-8'}));
      fields = Array.isArray(info.themeFields) ? info.themeFields : [];
    } catch {
      // A missing or invalid manifest has no declared fields.
    }
    return this.success(fields);
  }
};
