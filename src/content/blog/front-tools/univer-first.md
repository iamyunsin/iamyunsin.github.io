---
title: '初识Univer框架'
description: 'Univer 是一个开源协作解决方案，其目标是将协作能力赋予所有系统。使用 Univer，用户可以同步编辑文件内容，使文件在不同类型的系统中流畅地传输，并避免再次下载和上传 Microsoft Office 文件。'
pubDate: '2023-09-28'
tags: ['Univer', 'Luckysheet']
---

## 一、简介

Univer 是一个**开源协作**解决方案，其目标是**将协作能力**赋予所有系统。使用 Univer，用户可以**同步编辑文件**内容，使文件在不同类型的系统中流畅地传输，并避免再次下载和上传 Microsoft Office 文件。

[Univer](https://github.com/dream-num/univer)是[Luckysheet2.0](https://github.com/dream-num/Luckysheet)的升级。Luckysheet 2.0 很少用到设计模式，扩展性不好，模块拆分不够细致，所以 Univer 重构的时候，重点考虑了扩展性，设计了一种插件化架构，或者叫微内核架构。更多细节请参考[前端插件化架构在 Univer 的实现](https://github.com/dream-num/univer/blob/dev/docs/implementation-of-front-end-plug-in-architecture-in-univer-zh.md)

## 二、宏观架构（官方提供）

### 1. 整体架构

Univer 按照插件化架构进行设计，核心以外的功能都以插件的形式进行开发。**官方规划了插件市场的建设，满足更加个性化的需求**。

![](/blog/front-tools/univer-first/1.png)

### 2. 渲染引擎

Univer sheet, document, slide 采用同一套渲染引擎架构，把应用抽象为文本流，表格，画布，core 部分触发渲染，object 为渲染器。

![](/blog/front-tools/univer-first/2.png)

### 3. 公式引擎

Univer 自研公式引擎，支持异步计算, lambda 函数及范围命名。

![](/blog/front-tools/univer-first/3.png)

## 三、技术实现（实践梳理）

由于个人能力和精力有限，并没有把Univer的架构研究得很透彻，甚至有些环节都没有弄得十分清楚，因此这部分可能存在不准确甚至谬误的地方，望大家海涵，同时希望感兴趣的同事可以一起探索、补充和指正。

* 涉及的前端技术

  1. 依赖管理与多包管理: [pnpm](https://www.pnpm.cn/)和[pnpm workspace](https://www.pnpm.cn/workspaces)
  2. 构建工具: [vite](https://cn.vitejs.dev/)
  3. 开发语言: [Typescript](https://www.typescriptlang.org/)
  4. MVVM框架: [preact](https://www.preactjs.cn/)，[官方使用preact的考量](https://github.com/dream-num/univer/blob/dev/docs/use-preact-to-create-component-library.md)
  3. 开发规范：[Google 开源项目风格指南 - TypeScript 风格指南](https://zh-google-styleguide.readthedocs.io/en/latest/google-typescript-styleguide/contents/#)

* Univer各包之间的宏观关系分析

  当前版本的Univer，从细节层面看包之间关系其实是错综复杂的，但是宏观地看，包之间的关系又是相对清晰的。
  下面是我们根据自己的理解简单梳理了一下其相应核心包的作用，以及包之间的关系。

* Univer的包关系结构图：

![](/blog/front-tools/univer-first/4.png)

* UniverSheet启动程序宏观流程图：

![](/blog/front-tools/univer-first/5.png)

### 1. Univer实例简介

Univer实例是一个全局上下文管理器，它分别管理着一组universheets、univerdocs和universlides，以及运行时环境（Environment）、全局上下文（GlobalContext）、i18n翻译器(Locale)、插件管理器（PluginManager）和钩子管理器（HooksManager、PathObservableHooks）。

* Univer核心实体关系图：

![](/blog/front-tools/univer-first/6.png)

### 2. 插件生命周期

Univer的插件生命周期比较简单，主要包括以下回调函数：
1. onCreate: 插件创建后被安装时调用
2. onMounted: 插件被安装时调用
3. onDestroy: 插件卸载时调用

UniverSheet可选插件安装&卸载流程图：

![](/blog/front-tools/univer-first/7.png)

## 四、插件开发工作流

> **工具函数、常量维护以及共用组件需要通知到每个开发人员**

### 1. 以任务为导向的工作流

![](/blog/front-tools/univer-first/8.jpg)

### 2. 以开发为导向的工作流

![](/blog/front-tools/univer-first/9.jpg)

## 五、数据绑定插件

### 1. 业务背景（数据填报）

数据填报主要要解决的问题是将excel变成“自定义表单”，然后通过这个“自定义表单”提供给用户填写，填写完成后再根据模板定义，提取出结构化数据提交给后台，后台收到结构化数据后做处理、存储。

1. 模板（表单）：数据源 + 绑定关系
2. 填报：模板 + 填写的数据
3. 提报：填报的数据 + 绑定关系 提取出结构化数据，提交给后台
4. 查看或编辑： 模板 + 填写的数据，还原出表格 或 直接将填写的excel保存下来，然后直接还原。

### 2. 插件内部组件关系

![](/blog/front-tools/univer-first/10.jpg)

如上图，整个插件的核心主要是围绕`数据源`和`绑定关系`展开的，其它的提取数据、以及将数据还原到模板中，都可以通过绑定关系来还原。

## 六、问题/不足

univer的开发，实际上是对插件的开发。在整个架构搭建完善后，普通开发人员不会去改底层的代码，所以开发起来相对简单。

开发中主要的阻力来源自目前Univer的底层架构尚不完善，还在持续优化和改进。

* 未完善的文档

大多数需要调用的api都在底层，由于提供给的api众多，在一个类中存在较多个暴露的方法，而代码读起来相对耗费时间，往往在寻找需要的api时付出大量精力。Typescript在一定程度上缓解了这种压力。

* 过长的调用路径

为了获取一个需要的实例，有些时候需要调取一长串的链式函数，一个是层级过深不方便寻找，一个是容易引起混乱。

* 多个实例交叉、重复引用

正如上所述，过长的链式调用引发了部分实例交叉、重复引用。在父子兄弟实例上挂载相同的实例，或在两个实例中循环引用另一个实例都属于这类操作。目前来看开发起来除了不方便寻找没遇到其他的问题，但是感觉这是不太正确的操作。

此问题在univer开发团队的[任务规划](https://github.com/dream-num/univer/issues/32)中被提上修改日程:

> Fix circular dependency and prevent it from happening

* 框架尚未稳定

目前Univer还处于开发阶段，尚未发布第一个稳定版，因此我们目前基于它做的一切工作都无法投入到生产中使用。

* 活跃度一般

由于目前框架尚未发布稳定版，观望的人还是比较多，但是仓库主要由核心的几个人在维护，更新速度不是很快。 但也可以看到官方在努力让架构变得更合理和完善。

## 七、优势

* 架构清晰

架构设计合理、清晰、耦合度低，具备良好可维护性和可扩展性。

* 开源：

[Univer](https://github.com/dream-num/univer)是基于[MIT](https://github.com/dream-num/univer/blob/dev/LICENSE)协议开源的，因此我们能够在其之上进行二开并商用（售卖），而无需担心侵权。

同时，开源给我们带来无限可能，我们几乎能够基于它做**所有我们想做的事情**。

* 广阔的前景

根据目前我们对其架构的理解，我们应该能够基于它做很多其它的事情，比如协同绘图（流程图、脑图、时序图等等）、业务插件（例如基于导入模板，支持关联字典、关联后台某些基础数据、多选、甚至直接支持弹窗选择某些关联的业务数据）、业务层校验。

由于其对插件的支持，有利于我们沉淀业务插件以及在不同项目中复用这些能力。

## 八、我们的观点

Univer就像一个天才少年，目前尚未成熟，但他潜力无限，值得我们持续地探索，这些付出终将在Univer稳定之时回馈到我们的业务项目中。
