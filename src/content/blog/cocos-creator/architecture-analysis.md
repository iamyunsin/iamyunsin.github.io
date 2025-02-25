---
title: 'Cocos Creator3.x调用ICP canister'
description: '最近，和几个朋友一起做一个基于Internet Computer的链上小游戏，前端选择使用Cocos Creator3.x，于是就有了如何在Cocos Creator3中调用canister服务中的接口的需求。'
draft: true
pubDate: '2024-09-03'
tags: ['Cocos Creator', 'Internet Computer', 'ic', 'cocos']
---

大家好，我是原心。

最近，和几个朋友一起想做一个基于[Internet Computer](https://internetcomputer.org/)的链上小游戏，前端选择使用最新版`Cocos Creator 3.8.3`，于是就有了如何在`cocos`中调用`canister`服务中的接口的需求。

今天刚好有空，就记录一下在这次踩坑的心得。

> 本文的主要开发环境是`Cocos Creator3.8.3`，因此后文提到的`cocos`都是指`Cocos Creator 3.8.3`。

## 一、cocos模块导入问题和应对

**先上结论：直接克隆[agent-js](https://github.com/dfinity/agent-js.git)，本地编译打包成esm模块，并将最终的js文件内容放到cocos项目中，进行导入使用。**

即使通过上面的方式来做，由于现在`cocos`支持[import map](https://docs.cocos.com/creator/3.8/manual/zh/scripting/modules/import-map.html)，因此也可以将我们打包后的模块，映射成`@dfinity/agent`，因此使用的时候，仍然可以用`import { HttpAgent } from '@dfinity/agent'`。

> [import map](https://docs.cocos.com/creator/3.8/manual/zh/scripting/modules/import-map.html)是我在捣腾这个的时候，发现的，顺便将之前的`../../`这样的路径也做了路径映射，非常耐撕(*^▽^*)

----

虽然`cocos`官方也有支持cjs模块导入（插件导入模式），但是使用的时候并不友好，对比如下：
```ts
// esm引入
import { HttpAgent } from '@dfinity/agent';

//cjs转esm
import * as m from '@dfinity/agent';
const { HttpAgent } = m.default;
```

看到上面的对比，正常人应该都想选esm的方式，简单大气上档次。



### 1. 将`agent-js`中的`@dfinity/agent`打包成esm单文件模块

* 第一步：环境准备
```bash
# 克隆项目
git clone https://github.com/dfinity/agent-js.git
# 安装依赖
cd agent-js && npm i
```

* 第二步：编译构建
1. 修改`packages/agent/package.json`： 
```json
{
  ...
  "scripts": {
    "bundle": "esbuild --bundle src/index.ts --outfile=dist/index.js --format=esm --platform=browser",
  }
  ...
}

```
2. 执行构建： 
```bash
cd packages/agent
npm run bundle
```

* 第三步：拷贝到cocos项目中
经过上面的构建之后，会生成js文件，路径是`packages/agent/dist/index.js`。

### 

## 二、cocos运行编辑器运行时问题和应对



## 三、cocos编译器引起的问题和应对


## 总结：

