# 仓库开发约定

以下规则适用于在本仓库工作的所有 AI 编程助手。

## 交流与提交语言

- 与用户交流、解释修改和汇报结果时使用中文。
- Git commit message 必须使用英文，包括标题和正文，且必须遵循 Conventional Commits 格式：`<type>[optional scope][!]: <description>`，例如 `fix(auth): reject disabled users`。
- PR 标题和描述必须使用英文。
- 保留代码标识符、命令、路径及必要的原文引用。

## 代码格式

- 手写的 CSS、JavaScript 和 TypeScript 源码必须保持清晰的多行格式，禁止压缩成单行。
- CSS 的每条声明独占一行，选择器和花括号按项目现有格式排版。
- JavaScript 和 TypeScript 的不同语句分行书写，代码块展开并正确缩进。
- 模板中的内嵌 `<style>` 和 `<script>` 同样遵守上述规则。
- 自动生成的构建产物、压缩文件及第三方代码不受上述排版要求限制，不手动重新格式化。
- 遵守项目已有的格式化与静态检查配置。
- 不为了统一格式而修改与当前任务无关的文件。

## 服务端常量

- `global.firekylin` 定义了服务端使用的常量（见 `src/bootstrap/worker.js`）。判断用户类型、用户状态、文章/页面类型、文章状态及特性开关时，必须使用对应的常量定义，禁止直接写 magic number。
- 例如使用 `firekylin.USER_ADMIN`、`firekylin.USER_AVAILABLE`、`firekylin.POST_ARTICLE`、`firekylin.POST_PAGE`、`firekylin.POST_PUBLISH`、`firekylin.POST_PUBLIC` 和 `firekylin.POST_ALLOW_COMMENT`；按实际语义选择常量，不能因数值相同而混用。

## 完成前检查

- 检查本次改动是否符合上述约定。
- 运行与本次修改相关的现有检查；无法运行时说明原因。
- 汇报实际完成的修改和验证结果，不把未执行的检查描述为已通过。
