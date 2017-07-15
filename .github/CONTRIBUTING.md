# Firekylin 用户贡献指南

首先感谢大家使用 Firekylin，为了让大家更好的帮助 Firekylin 的成长，请先阅读以下内容帮助大家了解如何快速向 Firekylin 项目提交贡献。

## 如何获得帮助？

如果您在使用过程中遇到问题，请先查看 [问题解答](https://github.com/firekylin/firekylin/wiki/%E9%97%AE%E9%A2%98%E8%A7%A3%E7%AD%94) 中的解答，里面列举了一些用户常见的问题，或许你的问题就在其中。如果没有找到也不用灰心，你可以在 [GitHub](https://github.com/firekylin/firekylin/wiki/issues) 及 [Gitter](https://gitter.im/firekylin/firekylin?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge) 上提问。如果前面的方法你都觉得麻烦的话，直接加入到我们的 [Gitter](https://gitter.im/firekylin/firekylin?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge) 交流群里来吧，相信在这里会有人快速响应你的问题的！

## 如何提交BUG？

当你在 Github issue 上提 BUG 的时候，尽量将自己当时的环境，复现步骤以及报错 BUG 都贴全。其中涉及代码的部分（例如报错）尽量使用代码格式引用，不要使用截图。尽量不要发一些无意义的 issue，当问题被解决时，需要及时的关闭 issue。

## 如何提交代码？

首先你需要 Fork [firekylin/firekylin](https://github.com/firekylin/fireylin) 项目，然后将项目克隆到本地。然后本地环境的搭建可参考文档 [仓库版安装](https://github.com/firekylin/firekylin/wiki/%E4%BB%93%E5%BA%93%E7%89%88%E5%AE%89%E8%A3%85)。一切就绪之后你需要新建一个分支，并在新分支中提交你的修改。确认一切没有问题之后你就可以在 <https://github.com/firekylin/firekylin/compare> 上提 PR 了！我们会尽快审核并合并你们的提交的！

## 代码风格

在提交代码之前，一定要使用 `npm run lint` 检查自己的代码风格规范是否符合项目的规范。如果碰到相应的报错，可以使用 `npm run lint-fix` 命令进行修复。但并不是所有的错误都能被自动修复，剩下的你需要按照提示手动修复。当代码风格完全正常后，就可以继续你的提交了！

## 后记

感谢大家对 Firekylin 的贡献，你们的帮助是 Firekylin 成长的源泉，希望 Firekylin 能越来越棒！
