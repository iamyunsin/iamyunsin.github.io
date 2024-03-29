---
title: '一文讲透事件循环'
description: '事件循环是JS的并发模型的核心，也是前端面试最常考的问题之一，今天您请随我一起翻越事件循环这座大山吧。'
draft: false
pubDate: '2024-03-27'
tags: ['事件循环', 'eventloop', 'javascript', 'js']
---

事件循环是JS的并发模型的核心，也是前端面试最常考的问题之一，今天您请随我一起翻越事件循环这座大山吧。

## 一、心智模型

**X火车站**有一个**一根筋的光杆站长**，所谓一根筋，就是他**同一时刻只做一件事**，所谓光杆，就是**整个车站只有站长一人工作**。  

**站长**的工作分为两大类：**① 日常事务**（安检、咨询答疑、车辆调度...，反正就是一些琐事）和**② 接车**（火车一般都有几种，慢车、快车、特快）。  

从事这份工作的**站长**应该有三种状态：**① 处理日常事务**；**② 接车中**；**③ 空闲**。  

**站长**非常有原则，不喜欢被打扰，当他在做一件事的时候，其它事情都只能等着，哪怕是接车，也只能是车等他，别问为什么，他就是这么牛掰。   

**站长**很勤劳，从来不躲懒，只要他是空闲的，有事儿来了就会立即处理。  

综上，**站长**的工作流程如下图：

![站长模型](/blog/knowledge/js-eventloop/stationmaster-model.svg)

很简单吧！没错，这个**一根筋的光杆站长**就是**JS的执行栈**，所有事情都必须由他处理，他每一时刻只能处理一件**最要紧**的事情，所有其它事情都要等他有空才会去做。  

而`车`就好比事件循环的**任务队列**中的`任务`，`日常事务`好比JS程序的**函数/语句/表达式**。  

## 二、事件循环执行流程

我们JS的执行流程和上面的站长工作流程非常类似，如下图：

![事件循环执行流程](/blog/knowledge/js-eventloop/eventloop.svg)

上图描述了事件循环的执行流程，可以看到执行流程是：

1. **检查执行栈：** 首先检查**执行栈**（主线程代码）是否被清空（执行完毕），如果没有，则继续执行，直到执行完毕后，再检查**微任务队列**。
2. **检查微任务队列：** 当**执行栈**已经清空，则会检查**微任务队列**是否已清空，如果没有清空，则会**从队头取出一个微任务**并**放入执行栈中**立即执行，然后又将继续第`1`步。
3. **检查宏任务队列：** 当**微任务队列**已清空，则会检查**宏任务队列**是否已经清空，如果没有清空，则会从**队头取出一个宏任务**并**放入执行栈中**立即执行，然后又将继续第`1`步。
4. **进入空闲状态：** 当**宏任务队列**也被清空了，① 此时即将进入**空闲状态**，如果本轮事件循环期间有调用`requestIdleCallback`注册回调函数，则会生成一个`宏任务`（即：注册的回调函数）并放入到宏任务队列中，那么当下一轮循环的时候，当前注册的宏任务会被执行；② 本轮事件循环中没有`requestIdleCallback`被注册，则会直接进入空闲状态。

直到现在，我们已经对**事件循环的执行过程**应该已经有了非常清晰的认识了。  

然而，事件循环之所以让我们感到疑惑的点并不在其执行过程，而是在其任务的产生过程。

> 要理解上图，我们明确三个概念：  
> 1. **执行栈：** 所有js代码都必须在执行栈中执行。  
> 2. **任务队列：** 任务队列是**存放待执行任务**的地方，js中分为两大类：**微任务**和**宏任务**，本质上来看，他们只有优先级不同，其它并无区别。 
> 3. **任务：** 任务队列中的**任务**可以看做是一个js函数，其实就是一段可执行的代码，和其它JS函数并无区别。  

## 三、任务的分类及产生过程

我们知道，队列是一种**先进先出(FIFO)**的数据结构，因此无论是**宏任务队列**还是**微任务队列**，都具有先进先出的特性。当我们程序足够复杂的时候，可能会在很多程序块中生产**任务**并**入队**，而任务的**入队顺序**和**执行流程**直接关系到程序执行的先后顺序。

**因此理解任务产生（或生产）的过程，对我们精细把控程序的执行节奏是非常重要的，对性能优化和问题排查有非常大的帮助。**

接下来，我们通过精心准备的示例代码来探测这些任务的产生（入队）的时机：

### （一） 阻塞js线程来观察UI线程对宏任务队列的控制

* 示例代码：  

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试</title>
</head>
<body>
  <script>
    function slowAction() {
      console.log('执行栈：慢操作执行开始');
      requestIdleCallback(() => {
        console.log('执行栈：requestIdleCallback');
      });
      setTimeout(() => {
        console.log('执行栈：setTimeout');
      }, 0);
      requestAnimationFrame(() => {
        console.log('执行栈：requestAnimationFrame');
      });
      Promise.resolve().then(() => {
        console.log('执行栈：Promise');
      });
      
      // 卡顿代码
      let els = '';
      for(let i = 0; i < 100000; i ++) {
        els += '1';
      }

      console.log('执行栈：慢操作执行结束');
    }
    let printLogTimes = 0;
    function printLog() {
      printLogTimes ++;
      const printSeq = printLogTimes;
      console.log('打印日志', printSeq);
      setTimeout(() => {
        console.log('打印日志 setTimeout', printSeq);
      }, 0);
      Promise.resolve().then(() => {
        console.log('打印日志 Promise.then', printSeq);
      }).finally(() => {
        console.log('打印日志 Promise.finally', printSeq);
      });
      requestIdleCallback(() => {
        console.log('打印日志 requestIdleCallback', printSeq);
      });
      requestAnimationFrame(() => {
        console.log('打印日志 requestAnimationFrame', printSeq);
      });
    }
  </script>
  <button onclick="slowAction()">执行卡顿操作</button>
  <button onclick="printLog()">打印日志</button>
</body>
</html>
```

* 先点击执行卡顿操作，再点击两次打印日志（卡顿期间点击）的执行输出分析

```bash
执行栈：慢操作执行开始                # 主线程同步执行的代码
执行栈：慢操作执行结束                # 主线程同步执行的代码
执行栈：Promise                     # 主线程中注册的Promise，这个任务在调用then的这一刻就已经放到了微任务队列，因为Promise已经是resolve状态
打印日志 1                          # 第1次点击打印日志按钮时放入宏任务队列的任务（即 printLog 函数），从这里可以看出，点击事件触发的时候，任务就已经被放入了宏任务队列
打印日志 Promise.then 1             # 在宏任务（printLog）触发期间，放入到微任务队列中的任务，当printLog函数被执行完成之后，再检查微任务队列的时候就被发现了
打印日志 Promise.finally 1          # 同上
打印日志 2                          # 第2次点击打印日志按钮时放入宏任务队列的任务（即 printLog 函数），从这里可以看出，点击事件触发的时候，任务就已经被放入了宏任务队列，它比第5行的微任务更早进入队列，然而由于微任务队列的优先级更高，因此第5行日志更早被打印出来
打印日志 Promise.then 2             # 同样，与第五行类似
打印日志 Promise.finally 2          # 同上
执行栈：requestAnimationFrame       # requestAnimationFrame被触发的时候，安装的requestAnimationFrame回调会被放到宏任务队列，通过chrome performance工具录制可以看到对应时机
打印日志 requestAnimationFrame 1    # 同上
打印日志 requestAnimationFrame 2    # 同上
执行栈：setTimeout                  # 当定时器被触发时，会将安装的setTimeout回调按照触发顺序放入到宏任务队列
打印日志 setTimeout 1               # 同上
打印日志 setTimeout 2               # 同上
执行栈：requestIdleCallback         # 当执行栈被清空之前，会触发将requestIdleCallback注册的回调放如宏任务队列
打印日志 requestIdleCallback 1      # 同上
打印日志 requestIdleCallback 2      # 同上
```

* 通过**Chrome调试工具的**Performance（性能）tab录制的关键触发点

![](/blog/knowledge/js-eventloop/chrome-performance.jpg)

> 提示：上图中，越靠上的操作越晚触发

**结论：**
1. **用户点击事件**的**回调函数**会在按钮点下的那一刻立即被添加到**宏任务队列**
2. **微任务**的优先级确实比宏任务高
3. **每次执行栈清空**后，总是**先检查微任务队列**，**再检查宏任务队列**

这个例子让我们产生了一个疑问，`setTimeout`和`requestAnimationFrame`的触发顺序是必然是这样的吗？我们再来一个例子，并分别说明其触发时机。

### （二）`requestAnimationFrame`与`setTimeout`宏任务触发的情况分析

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <script>
    function runProbe() {
      setTimeout(()=>{
        console.log('setTimeout: 1');
      });
      requestAnimationFrame(()=>{
        console.log('requestAnimationFrame 2')
      });
      setTimeout(()=>{
        console.log('setTimeout: 3');
      });
    }
  </script>
  <button onclick="runProbe()">运行探针</button>
</body>
</html>
```

运行上面的代码，多点几次“运行探针”按钮，可以观察到3种顺序：

* 顺序1

```bash
requestAnimationFrame 2
setTimeout: 1
setTimeout: 3
```

* 顺序2

```bash
setTimeout: 1
requestAnimationFrame 2
setTimeout: 3
```
* 顺序3

```bash
setTimeout: 1
setTimeout: 3
requestAnimationFrame 2
```

这看起来我们好像并不能控制他们执行的顺序，这是因为：
1. **setTimeout：** 对于`setTimeout`的回调函数何时进入宏任务队列，其实是跟**定时器超时触发**什么时候被触发有关，然而即使是`setTimeout`超时时间为`0`，也**不会立即将回调函数放入宏任务队列**，一般浏览器的定时器最短超时时间为`4毫秒`，但是如果超时时间到了，而JS线程却并不空闲，那么也会根据实际情况波动。  
2. **requestAnimationFrame：** **它在触发时机是在每一帧渲染之前。**其触发频率会受`屏幕帧率`影响，同时**渲染线程**与**JS线程**又是**互斥**的，影响它触发的因素非常多，因此其回调被放入宏任务队列的时机也很难预判。  

**结论：其实`setTimeout`和`requestAnimationFrame`安装的回调函数被推入宏任务队列的时机，跟浏览器内部状态有关，因此他们并没有其它相关的优先级关系。**

### （三） 无论是**宏任务**还是**微任务**，其**执行顺序仅与其被加入任务队列的先后有关**

看看下面的例子：

```ts
Promise.resolve().then(() => {
  Promise.resolve().then(() => {
    
    console.log('Promise.then: 3'); 
  });
  console.log('Promise.then: 1');
});

Promise.resolve().then(() => {
  Promise.resolve().then(() => {
    console.log('Promise.then: 4');
  });
  console.log('Promise.then: 2');
});
```

* 上面的代码会稳定地产生下面的输出

```bash
Promise.then: 1
Promise.then: 2
Promise.then: 3
Promise.then: 4
```

这是由于当执行`Promise`的`resolve`方法会将`then`方法传递的钩子推入微任务队列，而这个示例中有确定的入队顺序。

**结论：事件循环中，任务的执行顺序微任务先于宏任务，且先入队的任务先执行。**

## 四、最大误区

理解事件循环的最大的误区是：将**安装回调的函数**当成**宏任务**或**微任务**的**入队的时机**，其实这完全是两回事，下面举几个例子：

```ts
// 1. 这句代码只是安装了一个定时器，回调函数只是被定时器持有了
setTimeout(() => { console.log('setTimeout');}, 0);
// 1. 代码执行到这里的时候，上面安装的定时器回调还没有进入宏队列，真正进入宏队列的时机是这个定时器超时触发的时候


let resolveHolder;
const promise = new Promise((resolve) => {
  resolveHolder = resolve;
});
// 2. 这局代码只是给promise安装了一个解决状态的回调函数，此时传入的函数并没有进入微任务队列
promise.then(() => {  console.log('then') });
// 2. 当调用下面这句话的时候，回调函数才真正被封装成微任务加入到微任务队列
resolveHolder();
```

通过上面的两个例子，我想您应该能够举一反三了，其实我们的**这些日常操作并没有真正亲自将宏任务或微任务推到对应的任务队列中，我们只是告诉浏览器或JS引擎，我们需要在未来某个条件下执行某个函数，而浏览器或JS引擎会在未来条件满足后将我们传入的函数封装成任务，放入到对应的任务队列中**，并依赖事件循环的执行流程来执行这些任务。

我们的引擎中，应该只有`queueMicrotask`函数是立即将传入函数封装成任务推入到微任务队列中的，如果您对这个API感兴趣可以点击[这里查看](https://developer.mozilla.org/zh-CN/docs/Web/API/queueMicrotask)。

## 总结

**事件循环的执行流程本身非常简单，其复杂的部分在于涉及到它的API比较多，而每一个API在影响其涉及的宏任务和微任务入队的时机很难把握。**

下面，我们列出常见的微任务和宏任务相关API：

**微任务：** `queueMicrotask`、`Promise`和`MutationObserve`。

**宏任务：**   
1. **用户交互事件：** `click`，`mouse*`，`input`等等用户操作触发的`dom事件`
2. **setTimeout：** 定时任务，超时触发
3. **requestIdleCallback：** JS执行栈和UI线程都空闲时触发
4. **requestAnimationFrame：** 当屏幕下一帧即将绘制前触发
5. **setImmediate：** 非标准，不过`nodejs`支持比较好，等价于`setTimeout(() => {}, 0)`
6. **MessageChannel：** 消息通道，[点击查看](https://developer.mozilla.org/zh-CN/docs/Web/API/MessageChannel)API文档
....

其实，我不知道**宏任务**的说法来自哪里（**如果您知道，请在评论区告知**），我全局搜了一下V8的源码，只找到[`TaskQueue`](https://github.com/v8/v8/blob/main/src/libplatform/task-queue.h#L22)和[`MicrotaskQueue`](https://github.com/v8/v8/blob/main/src/execution/microtask-queue.h#L27)，并且[MDN上也只提到了task和microtask](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth)相关的说法。

本次分享就到这里了，如有文章有谬误还请不吝指正，如果有疑问或建议，请直接微信联系

> **【原创声明】**  
> 本作品（包括但不限于文字、图片、音频、视频等）为（原心&lt;yunsin@vip.qq.com&gt;）原创作品，版权归原作者所有。未经授权，任何组织、机构、企业、个人不得以任何形式进行复制、转载、摘编、发表、发布、散布、传播等任何行为。  
任何在未经授权的情况下使用本作品的行为均被视作侵权行为，我们将保留追究法律责任的权利。如需使用本作品，请联系（原心&lt;yunsin@vip.qq.com&gt;）并注明出处及署名，我们将酌情考虑授权。  
本声明的最终解释权归（原心&lt;yunsin@vip.qq.com&gt;）所有，如有疑问请联系（&nbsp; **微信：iamyunsin** &nbsp; **邮箱: yunsin@vip.qq.com**）。