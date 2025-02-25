---
title: 'IC链上运维常识'
description: '由于机缘巧合，接触到了一些Internet computer（IC）相关的一些开发运维知识，下面就IC区块链日常开发运维常用知识点做个简单汇总，方便自己查阅。'
draft: false
pubDate: '2025-01-10'
tags: ['Internet Computer', 'blockchain']
---

大家好，我是原心。

近来，由于机缘巧合，接触到了一些[Internet computer（IC）](https://internetcomputer.org/)相关的一些开发运维知识，下面就IC区块链日常开发运维常用知识点做个简单汇总，方便自己查阅。

## 一、创建部署环境

IC上的应用/智能合约都是运行到canister中的，其自身是一个WASM虚拟机，可以执行标准的WASM程序，而我们编写的智能合约最终会被编译成.wasm字节码文件，用于部署。

要将引用部署到IC上，我们首先就需要创建一个新的canister，就好比要想在公有云上部署一个服务，首先要创建一个云主机一样。 

### 1. 子网选择

和创建云主机一样，我们创建`canister`的时候，也可以选择一个`子网`作为`canister`的通信网络. 加入你的系统涉及到多个`canister`，并且有多个`canister`之间的跨`canister`调用，那么选择子网就很重要，因为**同一个子网的canister之间的通信效率比跨子网通信要高得多**。

我们可以通过官方的子网列表查找所有子网信息 [IC子网列表](https://dashboard.internetcomputer.org/subnets)，然后从子网中选择一个子网来创建canister.

### 2. 创建canister

IC上创建canister的方法有很多，但是最常用的应该还是命令行，因为他能够控制canister的方方面面，[dfx命令官方文档](https://internetcomputer.org/docs/current/developer-docs/developer-tools/cli-tools/cli-reference/dfx-parent)

下面我们来看几种常见的创建canister的方法：

* 使用`dfx canister create`创建新的`canister` [官方文档](https://internetcomputer.org/docs/current/developer-docs/developer-tools/cli-tools/cli-reference/dfx-canister#dfx-canister-create)

> 例子：
```bash
# 新建一个canister，对应dfx.json中的user配置，并且选择子网为 fuqsr-in2lc-zbcjj-ydmcw-pzq7h-4xm2z-pto4i-dcyee-5z4rz-x63ji-nae
dfx canister create user --subnet fuqsr-in2lc-zbcjj-ydmcw-pzq7h-4xm2z-pto4i-dcyee-5z4rz-x63ji-nae --ic 

# 还可以通过next-to指定与目标canister同子网
dfx canister create user --next-to yvz3r-xiaaa-aaaap-qkmma-cai --ic 
```

还有很多其它用法，感兴趣可以看官方文档

* 通过 `dfx ledger create-canister` 创建新的`canister` [官方文档](https://internetcomputer.org/docs/current/developer-docs/developer-tools/cli-tools/cli-reference/dfx-ledger#dfx-ledger-create-canister)

```bash
# 新建一个canister，指定其controller为 tsqwz-udeik-5migd-ehrev-pvoqv-szx2g-akh5s-fkyqc-zy6q7-snav6-uqe 并且给他分配1.25个ICP
dfx ledger create-canister tsqwz-udeik-5migd-ehrev-pvoqv-szx2g-akh5s-fkyqc-zy6q7-snav6-uqe --amount 1.25 --subnet fuqsr-in2lc-zbcjj-ydmcw-pzq7h-4xm2z-pto4i-dcyee-5z4rz-x63ji-nae --network ic
```
可以看出，与 `dfx canister create` 不同，他不需要依赖dfx.json配置。

* 通过 `cycle wallet canister` 创建新的canister
  
上面的命令行都是只有在子网当前为开放状态时才能成功，如果你之前已有一些canister在某个子网，但是**如果后来由于社区投票后来关闭了某个子网，这时再通过上面的命令就无法成功创建**新的canister了。

对于这种情况，我们就只能使用 `cycle wallet canister` 在**指定的子网中**创建新的canister。
要使用这种方式来创建canister，可以通过以下步骤完成：

```bash
# 1. 先在对应子网选择一个canister，用于部署cycle wallet canister，使用如下命令即可完成
dfx identity deploy-wallet --network ic bkyz2-fmaaa-aaaaa-qaaaq-cai

# 2. 给cycle wallet canister充值
dfx cycles top-up bkyz2-fmaaa-aaaaa-qaaaq-cai 100000000000 --network ic

# 3. 创建新的canister，创建时，需要指定新canister的controller
dfx canister call bkyz2-fmaaa-aaaaa-qaaaq-cai wallet_create_canister '(record { cycles = 3000000000000 : nat64; settings = record { controller = principal "323qy-3ws2r-mckub-zomjm-64l74-fn6fd-4dxte-etwzl-ipb7a-4l52q-zqe" } })' --network ic
```

如上调用成功后，就可以在 `bkyz2-fmaaa-aaaaa-qaaaq-cai`Canister所在子网创建一个新的canister了

* 查看`cycle wallet canister`余额
```bash
dfx wallet --network ic balance
```

## 二、canister日常管理

### 1. 充值cycles

* 给当前identity充值cycles

```bash
# 1. 查看当前identity的ICP充值地址
dfx ledger account-id

# 2. 查看ICP余额
dfx ledger balance --ic

# 3. 查看Cycle余额
dfx cycles balance --ic

# 3. 将当前identity的1 ICP转换为对应的cycles
dfx cycles convert --amount 1 --network ic
```

* 给canister充值cycle

```bash
# 将当前identity的ledger中的1个ICP转换为cycles充值给 bkyz2-fmaaa-aaaaa-qaaaq-cai canister
dfx ledger top-up bkyz2-fmaaa-aaaaa-qaaaq-cai --amount 1 --ic

# 将当前identity的cycles中的 1000000000 cycles 发送给 bkyz2-fmaaa-aaaaa-qaaaq-cai canister
dfx cycles top-up bkyz2-fmaaa-aaaaa-qaaaq-cai 1000000000 --network ic
```

### 2. 添加/删除controller

* 添加controller
  
```bash
# 给 bkyz2-fmaaa-aaaaa-qaaaq-cai canister添加principal id为323qy-3ws2r-mckub-zomjm-64l74-fn6fd-4dxte-etwzl-ipb7a-4l52q-zqe的controller
dfx canister update-settings --add-controller 323qy-3ws2r-mckub-zomjm-64l74-fn6fd-4dxte-etwzl-ipb7a-4l52q-zqe bkyz2-fmaaa-aaaaa-qaaaq-cai --ic
```
* 删除controller

```bash
# 给 bkyz2-fmaaa-aaaaa-qaaaq-cai canister删除principal id为323qy-3ws2r-mckub-zomjm-64l74-fn6fd-4dxte-etwzl-ipb7a-4l52q-zqe的controller
dfx canister update-settings --remove-controller 323qy-3ws2r-mckub-zomjm-64l74-fn6fd-4dxte-etwzl-ipb7a-4l52q-zqe bkyz2-fmaaa-aaaaa-qaaaq-cai --ic
```

## 三、代码部署

ic的代码部署主要分两大类吧，一类是后端canister，另外一种是前端静态web服务canister。

### 1. 正常部署

常规部署，直接执行`dfx deploy`命令即可，此命令依赖当前工作目录中的`dfx.json`配置。

```bash
# 将app canister部署到本地网络
dfx deploy app

# 将app canister部署到ic主网
dfx deploy app --network ic

# 或者下面这样也可以
dfx deploy app --ic
```

### 2. canister重装

重装canister会导致canister中存放的所有数据都被丢弃，因此需要谨慎使用。 尽管如此，又是我们也是需要用到它的，因为有时候我们可能需要将部分canister废弃或重新启用，不过是用到其它场景。

```bash
# 在主网上重装 app canister
dfx deploy app --mode reinstall --ic
```

### 3. 前端canister部署

前端canister和普通的后端canister有所不同， **前端canister本质上是基于ic实现的一个静态web服务器** ，他的部署分为两部分：

1. 基于IC实现实现的静态web服务器WASM程序
2. 我们要部署的前端静态资源程序

很容易理解，前端canister的部署也分为两部分，一部分是安装静态web服务程序，另一部分是上传静态资源。

* 首次安装，我们需要安装web服务器，因此该步骤和部署其它canister一样

```bash
# 首次部署 frontend 服务
dfx deploy frontend --ic
```

对于前端canister，执行上面的命令会分为两步走，首先会安装web服务，然后再通过web服务的接口将静态资源上传到canister中。

* 升级静态资源

```bash
# 升级frontend服务中的静态资源
dfx canister install frontend --network ic --mode upgrade
```
### 总结

本次就先介绍到这里吧，IC提供了非常丰富的命令行工具，不过上面已经介绍了我们日常运维中能用到的大部分命令了。
