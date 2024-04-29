---
title: 'Vue3架构分析（四）—— 运行时之组件实例的创建和初始化'
description: '上一篇文章我们分析了Vue3 App和渲染器的结构及程序设计。本文，我将继续尝试分析Vue3组件的创建和初始化过程。'
draft: false
pubDate: '2024-04-28'
tags: ['Vue', 'Vue3', '架构']
---

大家好，我是原心。

> 提示： 本系列文章都是基于`vue 3.4.21`源码进行解读梳理，文章中关键的地方会链接到`github源码`文件对应位置

[上一篇文章](../architecture-analysis-3)我们分析了Vue3 App和渲染器的结构及程序设计。本文，我将继续尝试分析Vue3组件的创建和初始化过程。

**为了有目的地阅读本文，我们带着下面两个问题进入今天的主题：**

1. **组件的渲染函数调用之间前，`Vue`运行时做了哪些前置工作？**  
2. **Vue3组件究竟有没有`beforeCreate`和`created`生命周期？我们怎样在`composition api`中使用这两个生命周期？**  
3. **Vue3是怎样识别到`hooks`所作用的组件实例的？**  


## 一、示例程序设计

为了更直观地观察`Vue3`组件的实例创建和初始化过程，我们通过一个简单的`Vue3`例子程序入手，尝试一步步分析这个例子的渲染过程，通过宏观分析运行时渲染应用的完整过程，并找到组件实例的创建和初始化时机。

* 例子程序代码(包含两个组件)

```vue
<!-- app.vue -->
<template>
  <HelloWorld name="yunsin" v-model="msg" />
  <p>打招呼的消息：{{ msg }}</p>
</template>
<script setup>
import { ref } from 'vue'
import HelloWorld from './components/HelloWorld.vue'

const msg = ref('balabla...');
</script>

<!-- components/HelloWorld.vue -->
<template>
  <p>Hello {{ name }}, {{ modelValue }}!</p>
  <label for="msg">
    招呼信息：
    <input id="msg" v-model="modelValue" type="text" />
  </label>
</template>
<script setup>
const props = defineProps({
  name: String,
});

const modelValue = defineModel('modelValue');
</script>
```

* 实例程序入口

```js
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

> **说明：上面的例子程序，包含了`App`和`HelloWorld`两个组件，其中`App`组件是应用根组件。**

## 二、渲染入口

下面我摘录了渲染入口的关键代码，我们重点来看渲染开始之前，`Vue`做了什么工作。

* 应用创建时，`@vue/runtime-dom`重写了`app`实例上的`mount`方法，代码摘要如下 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-dom/src/index.ts#L76)

```ts
const { mount } = app
app.mount = (containerOrSelector: Element | ShadowRoot | string): any => {
  // 将入参转为可用的DOM实例
  const container = normalizeContainer(containerOrSelector)
  if (!container) return

  const component = app._component

  // 清空用于挂载的容器
  container.innerHTML = ''
  // 调用@vue/runtime-core中的mount方法
  const proxy = mount(container, false, resolveRootNamespace(container))
  if (container instanceof Element) {
    container.removeAttribute('v-cloak')
    container.setAttribute('data-v-app', '')
  }
  return proxy
}
```

通过上面的代码，我们可以看到挂载前，在`@vue/runtime-dom`包中，主要做了三件事情：

1. 获取真实的挂载点`HTML`节点实例  
2. 清空挂载点`HTML`节点内的其它节点  

做完上面两件事之后，就调用`@vue/runtime-core`中的`mount`方法继续后续挂载逻辑，接下来我们继续分析`@vue/runtime-core`中的`mount`方法。

* 位于`@vue/runtime-core`中的`mount`方法的关键代码 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-core/src/apiCreateApp.ts#L305)

```ts
...
mount(
  rootContainer: HostElement,
  isHydrate?: boolean,
  namespace?: boolean | ElementNamespace,
): any {
  if (!isMounted) {
    // 根据应用根组件创建VNode，并与应用上下文绑定
    const vnode = createVNode(rootComponent, rootProps)
    vnode.appContext = context

    // 先获取命名空间，
    if (namespace === true) {
      namespace = 'svg'
    } else if (namespace === false) {
      namespace = undefined
    }

    if (isHydrate && hydrate) {
      hydrate(vnode as VNode<Node, Element>, rootContainer as any)
    } else {
      // 由于我们是纯前端渲染，传入的hydrate是false，因此直接进入这里的渲染函数
      render(vnode, rootContainer, namespace)
    }
    // 标记已经挂载
    isMounted = true
    app._container = rootContainer
    // for devtools and telemetry
    ;(rootContainer as any).__vue_app__ = app

    // 返回一个代理，用于处理defineExpose声明的允许外部访问的API暴露出去
    return getExposeProxy(vnode.component!) || vnode.component!.proxy
  }
}
```

上面的代码我们可以看到，挂载操作主要做了下面几件事情：  

1. **阻止重复挂载：** 首先，检查组件是否已经被挂载，如果已经被挂载，那么就不再执行后续的操作。
2. **创建虚拟DOM根节点：** 根据应用的根组件和属性创建一个`VNode`（虚拟节点）。
3. **执行渲染：** 调用`render`函数，从虚拟DOM根节点开始执行渲染，渲染的详细过程下文会详细分析。
4. **暴露组件API：** 创建一个代理对象，将组件通过`defineExpose`声明暴露给外部访问的API暴露出去。

到此为止，我们的挂载主逻辑基本梳理清楚了。接下来，我们深入分析一下`render`函数内部逻辑。

## 三、组件渲染之实例创建和初始化

我们回到例子中的App组件，此时它作为应用的根组件即将被渲染，接下来，我们就基于例子中的App组件来分析其渲染过程中Vue组件实例创建和初始化的部分。

### （一） 渲染的主流程

* 渲染函数源码如下 [查看源码](https://github.com/vuejs/core/blob/v3.4.21/packages/runtime-core/src/renderer.ts#L2356)

```ts
  const render: RootRenderFunction = (vnode, container, namespace) => {
    if (vnode == null) {
      if (container._vnode) { // 卸载组件
        unmount(container._vnode, null, null, true)
      }
    } else {
      patch(  // 更新组件 （挂载或更新）
        container._vnode || null,
        vnode,
        container,
        null,
        null,
        null,
        namespace,
      )
    }
    if (!isFlushing) {
      isFlushing = true
      flushPreFlushCbs()  // 执行在组件渲染的过程中产生的前置调度器（比如通过 watch api监听属性时，传入的Options中flush不是sync和post，则会在pre阶段执行）
      flushPostFlushCbs() // 执行在组件渲染的过程中产生的后置调度器，这个很多
      isFlushing = false
    }
    // 完成渲染之后，会更新container._vnode
    container._vnode = vnode
  }
```

从上面的代码可以看出，组件的渲染其实包含了三种情况：挂载、卸载和更新。就render自身来说，做了下面几件事情：  
1. **卸载：** 如果传入的待渲染的`vnode`为`null`，并且当前`container`中已经有挂载的`vnode`，则将其卸载  
2. **挂载/更新：** 如果传入`vnode`有值，①此时若`container`未挂载有`vnode`，则执行挂载；②若`container`已挂载了`vnode`，则执行更新  
3. **后续调度：** 执行完渲染之后，紧接着就会执行在组件逻辑执行过程中（调度器来自框架内部和用户代码）生成的调度器  
4. **关联容器和vnode：** 最后将新渲染的`vnode`和容器进行关联（`container._vnode = vnode`）  

对应到我们的例子程序，此过程如下图：

![例子渲染过程01](/blog/vue3/4/patch-01.svg)

> 提示：放框中的`VNode(App)`表示基于我们示例的App组件创建的`VNode`实例

如图，刚开始，示例程序对应的执行过程如下：
1. **确定是挂载操作：** 由于挂载点（即`id`为`app`的`DOM`节点）的`_vnode`子节点是空的，而传入的是App组件对应的VNode实例，因此执行的是挂载操作。
2. **执行挂载：** 经过`patch`函数将`App`组件对应的`VNode`实例渲染到挂载点中
3. **关联挂载点和App组件的VNode实例**


### （二）Vue组件渲染处理入口

接下来，让我们继续分析`patch`函数挂载新节点的过程（首次渲染某组件/节点），并尝试从中找出对`Vue组件`的处理入口。

* 精简后的`patch`函数源码 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-core/src/renderer.ts#L360)

```ts
const patch: PatchFn = (
  n1,
  n2,
  container,
  anchor = null,
  parentComponent = null,
  parentSuspense = null,
  namespace = undefined,
  slotScopeIds = null,
  optimized = __DEV__ && isHmrUpdating ? false : !!n2.dynamicChildren,
) => {
  // 如果两个VNode节点是同一个，就不再进行后续的处理
  if (n1 === n2) {
    return
  }

  // 容器中已经存在节点，且两个VNode不是相同的类型（判断节点的type类型和key，如果其中有一个不同返回false），不能复用
  if (n1 && !isSameVNodeType(n1, n2)) {
    anchor = getNextHostNode(n1) // 将当前vnode对应的下一个实际上的dom节点作为后面操作节点时的锚点
    unmount(n1, parentComponent, parentSuspense, true) // 卸载当前节点
    n1 = null
  }

  // diff优化，先忽略
  if (n2.patchFlag === PatchFlags.BAIL) {
    optimized = false
    n2.dynamicChildren = null
  }

  const { type, ref, shapeFlag } = n2
  // 根据传入的新节点的类型，进行不同的处理
  switch (type) {
    case Text:
      break
    case Comment:
      break
    case Static:
      break
    case Fragment:
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
      } else if (shapeFlag & ShapeFlags.COMPONENT) { // 先只关注Vue组件的处理，其它先忽略
        processComponent(
          n1,
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          namespace,
          slotScopeIds,
          optimized,
        )
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
      } else if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
      }
  }

  // set ref
  if (ref != null && parentComponent) {
    setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2)
  }
}
```

如上面代码所示，`patch`函数主要做了两件事情：

1. **卸载旧的VNode：** 当新的`VNode实例`和旧的`VNode实例`类型不同时（`type`和`key`其中有一个不同），由于无法复用节点，因此会先将旧的节点卸载掉
2. **分类处理VNode：** 接下来，将根据新的`VNode实例`的`type`和`shapeFlag`对节点进行分类处理，针对不同类型的节点做相应的处理后使其最终变成我们期望的DOM节点。

这里对应于我们的例子程序，仍然在App组件的首次`patch`中，紧跟例子程序的主流程，此时将进入`processComponent`函数，对`App`组件的`VNode实例`进行处理，下面继续看看`processComponent`内部是怎样将`App组件`的`VNode实例`渲染成DOM的。

### （三）App组件示例创建和初始化

* 精简后的组件实例化代码如下，包括六大块（[processComponent源码](https://github.com/vuejs/core/blob/v3.4.21/packages/runtime-core/src/renderer.ts#L1155)、[mountComponent源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-core/src/renderer.ts#L1192)、[setupComponent源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-core/src/component.ts#L726)、[setupStatefulComponent源码](https://github.com/vuejs/core/blob/v3.4.21/packages/runtime-core/src/component.ts#L745)、[handleSetupResult源码](https://github.com/vuejs/core/blob/v3.4.21/packages/runtime-core/src/component.ts#L841)、[finishComponentSetup源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-core/src/component.ts#L905)）  

```ts
// 1. 如果旧节点是否为空，则执行mountComponent来挂载组件
// 2. 否则使用updateComponent来更新组件
const processComponent = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  namespace: ElementNamespace,
  slotScopeIds: string[] | null,
  optimized: boolean,
) => {
  n2.slotScopeIds = slotScopeIds
  
  if (n1 == null) { 
    // 1. 之前挂载的节点是空的，那么分两种情况处理
    // 1.1 即将挂载的组件是KeepAlive组件，这种情况会通过keepAlive上下文中的activate方法进行处理，这里先忽略，后续专门分析KeepAlive的挂载过程
    if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
      ;(parentComponent!.ctx as KeepAliveContext).activate(
        n2,
        container,
        anchor,
        namespace,
        optimized,
      )
    } else {
      // 1.2 直接通过mountComponent函数进行挂载组件
      mountComponent(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        namespace,
        optimized,
      )
    }
  } else {
    // 2. 如果之前已经挂载过组件，则进行组件更新操作，这里先忽略，后续再分析
    updateComponent(n1, n2, optimized)
  }
}
...
// 挂载组件
const mountComponent: MountComponentFn = (
  initialVNode,
  container,
  anchor,
  parentComponent,
  parentSuspense,
  namespace: ElementNamespace,
  optimized,
) => {
  // 创建组件实例
  const instance: ComponentInternalInstance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent,
      parentSuspense,
    ))

  // 给原生KeepAlive组件注入渲染器，因为KeepAlive组件内部的activate方法和deactivate方法都会用到这些渲染器方法来管理内层组件的激活和失活状态
  if (isKeepAlive(initialVNode)) {
    ;(instance.ctx as KeepAliveContext).renderer = internals
  }

  // 执行组件的setup钩子，初始化组件
  setupComponent(instance)

  // 1. 如果组件的setup是异步函数，则instance.asyncDep会是一个Promise实例，否则为空
  // 2. setupRenderEffect的执行时机在setup已经完成后
  // 3. setupRenderEffect的作用是为组件初始化一个ReactiveEffect实例，用于组件渲染过程中的依赖收集和依赖改变后重新调度组件渲染，因此组件的真实首次渲染，就是在setupRenderEffect中进行的
  if (__FEATURE_SUSPENSE__ && instance.asyncDep) {
    parentSuspense && parentSuspense.registerDep(instance, setupRenderEffect)

    // 对于setup为异步函数的组件，先给挂载点插入一个占位符，方便后续setup执行完毕后，渲染的时候挂载到对应位置
    if (!initialVNode.el) {
      const placeholder = (instance.subTree = createVNode(Comment))
      processCommentNode(null, placeholder, container!, anchor)
    }
  } else {
    setupRenderEffect(
      instance,
      initialVNode,
      container,
      anchor,
      parentSuspense,
      namespace,
      optimized,
    )
  }
}
...
export function setupComponent(
  instance: ComponentInternalInstance,
  isSSR = false,
) {
  isSSR && setInSSRSetupState(isSSR)

  const { props, children } = instance.vnode
  const isStateful = isStatefulComponent(instance)
  // 初始化Props
  initProps(instance, props, isStateful, isSSR)
  // 初始化Slots
  initSlots(instance, children)

  // 执行组件setup
  const setupResult = isStateful
    ? setupStatefulComponent(instance, isSSR)
    : undefined

  isSSR && setInSSRSetupState(false)
  return setupResult
}
...
// 有状态组件的setup
function setupStatefulComponent(
  instance: ComponentInternalInstance,
  isSSR: boolean,
) {
  const Component = instance.type as ComponentOptions

  // 0. create render proxy property access cache
  instance.accessCache = Object.create(null)
  // 1. create public instance / render proxy
  // also mark it raw so it's never observed
  instance.proxy = markRaw(new Proxy(instance.ctx, PublicInstanceProxyHandlers))

  // 2. call setup()
  const { setup } = Component
  if (setup) {
    // 创建setupContext，其结构为： { attrs, slots, emit, expose }
    const setupContext = (instance.setupContext =
      setup.length > 1 ? createSetupContext(instance) : null)

    // 将当前实例设置为正在执行setup的实例，这使得运行时知道setup中的hooks是作用于哪个实例的
    const reset = setCurrentInstance(instance)
    // 暂停依赖跟踪
    pauseTracking()
    // 调用组件的setup方法
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      ErrorCodes.SETUP_FUNCTION,
      [
        instance.props,
        setupContext,
      ],
    )
    // 重置依赖跟踪
    resetTracking()
    // 恢复实例
    reset()

    // 对异步setup函数的处理
    if (isPromise(setupResult)) {
      setupResult.then(unsetCurrentInstance, unsetCurrentInstance)
      if (isSSR) {
        // return the promise so server-renderer can wait on it
        return setupResult
          .then((resolvedResult: unknown) => {
            handleSetupResult(instance, resolvedResult, isSSR)
          })
          .catch(e => {
            handleError(e, instance, ErrorCodes.SETUP_FUNCTION)
          })
      } else if (__FEATURE_SUSPENSE__) {
        // asyncDep赋值，这会影响handleSetupResult的执行时机
        instance.asyncDep = setupResult
      }
    } else {
      handleSetupResult(instance, setupResult, isSSR)
    }
  } else {
    finishComponentSetup(instance, isSSR)
  }
}
...
export function handleSetupResult(
  instance: ComponentInternalInstance,
  setupResult: unknown,
  isSSR: boolean,
) {
  // 如果组件的setup函数返回的是一个函数，则会将返回的函数作为组件的render函数
  if (isFunction(setupResult)) {
    instance.render = setupResult as InternalRenderFunction
  } else if (isObject(setupResult)) { // 如果setup返回的是一个对象，则将这个对象的代理refer作为组件内部实例上的setupState属性
    instance.setupState = proxyRefs(setupResult)
  }
  finishComponentSetup(instance, isSSR)
}
...
export function finishComponentSetup(
  instance: ComponentInternalInstance,
  isSSR: boolean,
  skipOptions?: boolean,
) {
  const Component = instance.type as ComponentOptions

  // 如果组件上没有render方法（在我们运行未使用打包工具提前打包的情况下，首次渲染某组件时发生），则进入运行时编译流程
  if (!instance.render) {
    // 只有在非SSR环境下才执行运行时编译，因为如果是SSR的话，在服务端已经完成了这一步了
    if (!isSSR && compile && !Component.render) {
      const template =
        (__COMPAT__ &&
          instance.vnode.props &&
          instance.vnode.props['inline-template']) ||
        Component.template ||
        resolveMergedOptions(instance).template
      if (template) {
        ...
        // 执行运行时编译，并将编译后的render函数保存到组件类上
        Component.render = compile(template, finalCompilerOptions)
      }
    }

    instance.render = (Component.render || NOOP) as InternalRenderFunction
  }

  // Options API兼容
  if (__FEATURE_OPTIONS_API__ && !(__COMPAT__ && skipOptions)) {
    const reset = setCurrentInstance(instance)
    pauseTracking()
    try {
      applyOptions(instance)
    } finally {
      resetTracking()
      reset()
    }
  }
}
```

经过分析**App组件实例化和初始化**的过程，我们能得到以下**三个结论**：

1. `KeepAlive`组件的挂载过程和普通组件挂载过程有所不同，但是他们的更新过程却是一致的。
2. `Vue`运行时会为每一个组件创建一个内部实例(`ComponentInternalInstance`)，用于管理组件的内部状态信息。
3. `Vue`运行时会基于创建的内部实例，进行4步初始化：①初始化Props；②初始化slots；③执行执行组件的setup函数；④执行`Options API`相关兼容处理.

基于我们的示例代码，完成上述过程后，我们将得到一个状态完全，随时可以进行渲染操作的`App`组件的`内部实例`，紧接着就会进入到`App组件`的首次渲染。

示例中的App组件在这个过程中的变化如下图所示：

![App组件初始化过程](/blog/vue3/4/app-component-init.svg)

直到`setupRenderEffect`函数被执行之前，上面的过程中完成了所有App组件的初始化过程，包括创建内部实例、初始化props、state、执行setup、处理setup函数返回的结果、执行运行时编译策略、执行options api兼容处理，并执行options api中定义的beforeCreate和created钩子等。

## 总结

现在，我们可以尝试回答文章开始提出的两个问题了：  

1. **组件的渲染函数调用之间前，`Vue`运行时做了哪些前置工作？**  
① 创建组件对应的`VNode`节点实例  
② 创建组件实例  
③ 在实例上执行组件的`setup`函数，并处理返回值（`render`函数和`setupState`）  
④ 处理`options api`相关的内容，其中就包括了派发`beforeCreate`和`created`生命周期函数    

2. **Vue3组件究竟有没有`beforeCreate`和`created`生命周期？我们怎样在`composition api`中使用这两个生命周期？**  
①  `Vue3`是有`beforeCreate`和`created`这两个生命周期的  
②  在`composition api`中，我们可以通过如下代码来注册`beforeCreate`和`created`生命周期钩子  
```ts
...
defineOptions({
  beforeCreate() {
    console.log('beforeCreate')
  },
  created() {
    console.log('created')
  },
})
...
```

3. **Vue3是怎样识别到`hooks`所作用的组件实例的？**  
vue3通过在调用`setup`函数之前，执行`const reset = setCurrentInstance(instance)`代码，将当前实例激活，以使得当前组件内的所有操作都能关联到当前组件的当前实例。并且在执行完`setup`函数之后，会通过`reset()`将当前实例之前的实例激活。

本文到此结束，下一篇将继续分析组件渲染的过程，我们将从`setupRenderEffect`函数作为入口开始分析。  

**由于笔者的水平所限，文章可能存在不足和谬误，恳请大家批评指正。**
