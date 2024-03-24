---
title: 'Vue3架构分析（三）—— 运行时之渲染器和Vue App的设计与新建'
description: '之前已经分析过Vue3编译器的设计及vue sfc的编译过程，接下来我想继续分析Vue3运行时相关的设计与实现，本篇作为Vue3运行时分析的开篇，我们先来分析一下Vue3运行时渲染器和应用的架构设计及创建的过程。'
draft: false
pubDate: '2024-03-24'
tags: ['Vue', 'Vue3', '架构']
---

大家好，我是原心。

> 提示： 本系列文章都是基于`vue 3.4.21`源码进行解读梳理，文章中关键的地方会链接到`github源码`文件对应位置

[上一篇文章](../architecture-analysis-2)我们分析了`Vue3编译器`将`vue sfc`组件编译成`JS代码`的过程。接下来，我们来看看`Vue3`的**渲染器**和**App**结构的设计与实现。

## 一、应用启动流程概览

在开始分析之前，我们先来看一张**Vue应用启动**的流程概览图：

![Vue运行时全景图](/blog/vue3/3/runtime-flow.svg)

上图已经较为详细地梳理出了Vue应用启动，运行时内部(`@vue/runtime-dom`和`@vue/runtime-core`)的执行过程，基于上图我们可以看到**Vue应用启动过程经过了如下步骤：**

1. **用户创建应用：** 程序员通过`createApp(AppComponent)`调用`vue`运行时提供的`createApp`函数，并传入用户实现的自定义组件`App`，这时我们传入的`App`组件就是我们应用的根组件，而我们的`VNode`树（虚拟Dom树）的根节点，也将根据它的定义来创建。  
2. **获取渲染器：** `Vue`运行时在收到创建应用的调用后，会先判断当前运行时是否有合适的渲染器可以使用，如果没有的话则会创建渲染器，创建渲染器的时候，会通过`createAppAPI`工厂函数创建一个`createApp`函数，而真正创建`App实例`的工作将由这个函数来完成。
3. **创建并返回App实例：** 这一步会首先创建`App`上下文用于保存`App`在整个运行过程中的配置和状态，以及暴露一些公开的辅助函数。
4. **用户侧调用App实例的`mount('#app')`函数：** 用户侧调用mount函数，将用户提供的自定义组件`AppComponent`挂载到`id`为`app`的dom节点上。
5. **创建VNode根节点和根节点组件实例：** 紧接着`Vue`运行时此时会以`AppComponent`为标的创建一个`VNode`节点，不过这个`VNode`节点上很多信息都还是空的，不过没关系，紧接着又创建一个`AppComponent`对应的实例，不过此时的实例只是一个满足`ComponentInternalInstance`接口的对象。
6. **初始化`AppComponent`实例：** 接着便会执行`AppComponent`的`setup`函数，不过在执行`setup`函数之前，会先为实例初始化`Props`初始值和`Slots`初始值，这也使得我们在`setup`函数里面可以通过形参拿到`props`和`slots`，执行完`setup`函数之后，我们会根据执行的结果更新`组件实例`和`VNode实例`。
7. **处理选项式API相关初始化过程：** 图中的灰底虚线边框部分流程，都是处理**选项式API组件（Options API）**的流程，首先会调用`beforeCreate`钩子，然后依次处理`inject`、`data`、`computed`、`watch`和`provide`属性，然后调用`created`钩子，最后注册`options`对象提供的生命周期函数。
8. **设置渲染副作用：** 最后，会创建一个当前组件的渲染副作用对象，用于收集当前组件的渲染函数执行期间，响应式数据依赖收集，以便在被依赖的响应式数据变化时，自动调度渲染副作用，重新执行渲染。
9. **执行渲染：** 渲染的过程就是深度遍历VNode树，并生成对应的DOM节点的过程，这个过程后面我们再详细讲解。

接下来，我们来看看**Vue渲染器**是怎么设计的。

## 二、渲染器的设计与创建

下方类图应该能表达出渲染器的代码结构设计，他同时用到了单例模式和工厂模式：

![Vue运行时全景图](/blog/vue3/3/renderer.svg)

> 提示： 上图是为了便于理解其代码的设计结构而使用类图进行表达，Vue3实际代码实现中，并不存在`RendererSingleton`类、`RendererFactory`和`RendererBuilder`类，因为JS或TS中要表达这些设计思想，并不需要使用类。

从上图可以看出，**Vue3渲染器**使用了三个`创建型`设计模式（**单例模式**，**工厂方法模式**和**建造者模式**），这样做的主要目的应该是为了可扩展性和简化创建**渲染器实例**的过程，下面我们就基于上图尝试结合源码做一些分析：

1. **对渲染器的抽象：** 从上图看出，`Vue3`对渲染器进行了高度的抽象，我们通过源码来看看Vue3对渲染器接口的定义 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-core/src/renderer.ts#L77)

```ts
export interface Renderer<HostElement = RendererElement> {
  render: RootRenderFunction<HostElement>
  createApp: CreateAppFunction<HostElement>
}

// 用于SSR场景
export interface HydrationRenderer extends Renderer<Element | ShadowRoot> {
  hydrate: RootHydrateFunction
}
```

`Vue3`的**渲染器**只有`render`（负责渲染）和`createApp`（负责创建应用）这两个函数，而如果是`SSR场景`，客户端通过`HydrationRenderer`提供的`hydrate`方法进行水合（激活）。  

2. **渲染器创建过程的抽象：** 通过上图，我们看到图中的`RendererBuilder`(**渲染器建造者**)类是作为创建`Renderer`(**渲染器**)的封装，其中有两个名为`baseCreateRenderer`的函数，分别用于创建两种不同场景下使用的渲染器。  
而我们的`RendererBuilder`类依赖`RendererOptions`和`CreateHydrationFunctions`接口，这两个被依赖的接口我们可以将其称为“原材料”。这里打个比方，`RendererBuilder`就好比是一个专门制造渲染器的工人，只要你给他提供符合`RendererOptions`和`CreateHydrationFunctions`这两个接口的“原材料”，他就能帮你生产出你想要的渲染器，至于制造出来的渲染器的具体功能和适用场景，取决于你提供的原材料。  

* 下面是建造者的代码  [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-core/src/renderer.ts#L328)
```ts
// overload 1: no hydration
function baseCreateRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement,
>(options: RendererOptions<HostNode, HostElement>): Renderer<HostElement>

// overload 2: with hydration
function baseCreateRenderer(
  options: RendererOptions<Node, Element>,
  createHydrationFns: typeof createHydrationFunctions,
): HydrationRenderer

// implementation
function baseCreateRenderer(
  options: RendererOptions,
  // 注意这里的类型是 typeof createHydrationFunctions 
  // 下面的 createHydrationFunctions 函数刚好就是这个类型
  createHydrationFns?: typeof createHydrationFunctions,
): any {
  ... // 此处省略了 2071 行代码，这就是我们创建者模式的核心价值，使得外部在创建渲染器的时候，关注点不要在这些复杂细节上
  return {
    render,
    hydrate,
    createApp: createAppAPI(render, hydrate),
  }
}
```

* 下面是我们原材料相关的接口声明 [查看**RendererOptions**源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-core/src/renderer.ts#L94)，[查看**createHydrationFunctions**源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-core/src/hydration.ts#L76)

```ts
// 渲染器原材料之一，该接口主要约束了具体的节点操作入参和出参，至于实现，那是另外需要考虑的，大家可以根据注释感受一下这个接口的含义
export interface RendererOptions<
  HostNode = RendererNode,
  HostElement = RendererElement,
> {
  // 合并属性（也就是当节点更新时，属性的更新怎么打补丁）
  patchProp(
    el: HostElement,
    key: string,
    prevValue: any,
    nextValue: any,
    namespace?: ElementNamespace,
    prevChildren?: VNode<HostNode, HostElement>[],
    parentComponent?: ComponentInternalInstance | null,
    parentSuspense?: SuspenseBoundary | null,
    unmountChildren?: UnmountChildrenFn,
  ): void
  // 插入节点
  insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void
  // 移除节点
  remove(el: HostNode): void
  // 创建元素
  createElement(
    type: string,
    namespace?: ElementNamespace,
    isCustomizedBuiltIn?: string,
    vnodeProps?: (VNodeProps & { [key: string]: any }) | null,
  ): HostElement
  createText(text: string): HostNode
  createComment(text: string): HostNode
  setText(node: HostNode, text: string): void
  setElementText(node: HostElement, text: string): void
  parentNode(node: HostNode): HostElement | null
  nextSibling(node: HostNode): HostNode | null
  querySelector?(selector: string): HostElement | null
  setScopeId?(el: HostElement, id: string): void
  cloneNode?(node: HostNode): HostNode
  insertStaticContent?(
    content: string,
    parent: HostElement,
    anchor: HostNode | null,
    namespace: ElementNamespace,
    start?: HostNode | null,
    end?: HostNode | null,
  ): [HostNode, HostNode]
}
// 返回SSR环境激活应用和激活节点所需的函数
export function createHydrationFunctions(
  rendererInternals: RendererInternals<Node, Element>,
) {
  ... 
  // 此处省略了636行代码，其实这个函数本身也是一个建造者模式的实例，都是隐藏了创建 hydrate, hydrateNode 函数的复杂性
  // 让使用者将关注点转移到 RendererInternals 这个接口的约定
  return [hydrate, hydrateNode] as const
}
```

**这样做的好处有两点：**  
**一是： `baseCreateRenderer`封装了创建渲染器的复杂过程，使得使用时不再关注创建渲染器的复杂过程，转而只需要关注“原材料”的说明书（即：`RendererOptions`和`CreateHydrationFunctions`接口的定义），至于需要实现何种功能的渲染器，只需提供合适的“原材料”即可。**  
**二是： 将可自定义的节点操作相关实现从渲染器抽离到`RendererOptions`中，使得渲染器的实现与具体渲染运行环境解耦，只要在对应环境提供相应实现，那么渲染器仍然能够正常工作**  

> 如果上面的第二点好处您没有`get`到的话，那么我们举个例子：假设我们要将`Vue3`的应用渲染到`canvas`上，应该怎么做呢？我们可以提供基于`canvas`图形API的`RendererOptions`接口实现，并传递给`baseCreateRenderer`创建我们需要的渲染器，然后我们通过这个渲染器创建出来的应用在渲染的时候就会使用我们的`RendererOptions`实现，将对应的`Vue组件`渲染到`canvas`上了。**不过这个实现可能非常具有挑战性**  

3. **渲染器创建过程的再次抽象：** 由于在同一个环境下，`Vue3运行时`应该只需要一个渲染器，因此Vue3在这里使用了单例模式，而在创建的时候，为了更加方便地创建渲染器，中间又加入了类似工厂方法的一层封装。

* 单例的实现 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-dom/src/index.ts#L43)

```ts
// lazy create the renderer - this makes core renderer logic tree-shakable
// in case the user only imports reactivity utilities from Vue.
let renderer: Renderer<Element | ShadowRoot> | HydrationRenderer

let enabledHydration = false

function ensureRenderer() {
  return (
    renderer ||
    (renderer = createRenderer<Node, Element | ShadowRoot>(rendererOptions))
  )
}

function ensureHydrationRenderer() {
  // 1. 如果已经创建了具有水合功能的渲染器，则直接返回当前的渲染器
  // 2. 如果没有创建过具有水合功能的渲染器，则创建一个具有水合功能的渲染器，并赋值给渲染器
  renderer = enabledHydration
    ? renderer
    : createHydrationRenderer(rendererOptions)
  enabledHydration = true
  return renderer as HydrationRenderer
}
```

从代码可以看出，这是一个典型的懒汉模式的单例实现。

* 工厂方法的实现 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-core/src/renderer.ts#L299)

```ts
export function createRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement,
>(options: RendererOptions<HostNode, HostElement>) {
  return baseCreateRenderer<HostNode, HostElement>(options)
}

export function createHydrationRenderer(
  options: RendererOptions<Node, Element>,
) {
  // 这里的 createHydrationFunctions 使用了内部默认实现
  return baseCreateRenderer(options, createHydrationFunctions)
}
```

> **值得注意的是：** 单例部分的代码是在`@vue/runtime-dom`包中，而工厂方法的实现是在`@vue/runtime-core`中，相对于`@vue/runtime-dom`来说`@vue/runtime-core`算外部依赖，因此为了方便外部使用，`@vue/runtime-core`提供工厂方法我非常好的，可以提升使用体验。

## 三、App的设计与创建

渲染器已经创建好了，现在就可以通过渲染器来创建应用了，我们首先通过一个UML类图来认识`Vue应用`的主体结构：

![Vue运行时全景图](/blog/vue3/3/app-class-uml.svg)

从上图可以看出，Vue应用的主体结构包含三部分`App`、`AppConfig`和`AppContext`组成，它们的职责应该是这样的：
1. **App：** `App`描述了Vue应用的基本信息，包括`版本号`、`唯一标识`、`根组件`、`挂载点`等信息，以及暴露`use`、`components`,`directive`和`mount`等一些我们常用的方法。  
2. **AppContext：** 主要用于保存应用当前运行时状态，包括应用当前状态下的`组件`、`指令`以及选项、props、emits`缓存`等。
3. **AppConfig：** 主要存放应用的全局配置信息以及兼容Options API的选项合并策略等。

现在，我们已经了解了Vue App的基本结构，接下来我们看看Vue App的创建过程：

1. 创建`Vue App`主流程: 下面是我们精简后的代码 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-core/src/apiCreateApp.ts#L205)

```ts
function createApp(rootComponent, rootProps = null) {
  ...
  // 创建AppContext
  const context = createAppContext()
  // 用于判断一个插件是否已经安装过
  const installedPlugins = new WeakSet()

  let isMounted = false

  const app: App = (context.app = {
    _uid: uid++,
    _component: rootComponent as ConcreteComponent,
    _props: rootProps,
    _container: null,
    // 将AppContext于App进行关联
    _context: context,
    _instance: null,

    version,

    // 与AppConfig建立依赖
    get config() {
      return context.config
    },

    set config(v) {
    },

    // 安装插件的实现
    use(plugin: Plugin, ...options: any[]) {
      if (installedPlugins.has(plugin)) {
        __DEV__ && warn(`Plugin has already been applied to target app.`)
      } else if (plugin && isFunction(plugin.install)) {
        // 安装 {install: (Vue, ...any[]) => void } 这种类型的插件
        installedPlugins.add(plugin)
        plugin.install(app, ...options)
      } else if (isFunction(plugin)) {
        // 安装 (Vue, ...any[]) => void  这种类型的插件
        installedPlugins.add(plugin)
        plugin(app, ...options)
      }
      return app
    },

    // 混入
    mixin(mixin: ComponentOptions) {
      if (__FEATURE_OPTIONS_API__) {
        if (!context.mixins.includes(mixin)) {
          context.mixins.push(mixin)
        }
      }
      return app
    },

    component(name: string, component?: Component): any {
      if (!component) {
        return context.components[name]
      }
      context.components[name] = component
      return app
    },

    directive(name: string, directive?: Directive) {
      if (!directive) {
        return context.directives[name] as any
      }
      context.directives[name] = directive
      return app
    },

    // 挂载，这部分后续讲首次渲染与挂载的时候再详细来说
    mount(
      rootContainer: HostElement,
      isHydrate?: boolean,
      namespace?: boolean | ElementNamespace,
    ): any {
      if (!isMounted) {
        const vnode = createVNode(rootComponent, rootProps)
        vnode.appContext = context

        if (namespace === true) {
          namespace = 'svg'
        } else if (namespace === false) {
          namespace = undefined
        }

        if (isHydrate && hydrate) {
          hydrate(vnode as VNode<Node, Element>, rootContainer as any)
        } else {
          render(vnode, rootContainer, namespace)
        }
        isMounted = true
        app._container = rootContainer
        ;(rootContainer as any).__vue_app__ = app

        return getExposeProxy(vnode.component!) || vnode.component!.proxy
      }
    },

    unmount() {
      if (isMounted) {
        // 卸载很简单，就是将null渲染到应用的挂载点中
        render(null, app._container)
        delete app._container.__vue_app__
      }
    },

    provide(key, value) {
      context.provides[key as string | symbol] = value
      return app
    },

    // 这个函数主要是用来在某些函数内部执行一些需要当前应用上下文的函数
    runWithContext(fn) {
      const lastApp = currentApp
      currentApp = app
      try {
        return fn()
      } finally {
        currentApp = lastApp
      }
    },
  })

  return app
}
```

从上面的代码可以看出，`Vue3`中并不存在实现`App`接口的类，App实际上就是一个普通的对象，只是这个对象中包含了`App`接口要求的属性和函数。

2. 创建`AppContext`和`AppConfig` [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/runtime-core/src/apiCreateApp.ts#L172)

```ts
export function createAppContext(): AppContext {
  return {
    app: null as any,
    // AppConfig
    config: {
      isNativeTag: NO,
      performance: false,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: undefined,
      warnHandler: undefined,
      compilerOptions: {},
    },
    mixins: [],
    components: {},
    directives: {},
    provides: Object.create(null),
    optionsCache: new WeakMap(),
    propsCache: new WeakMap(),
    emitsCache: new WeakMap(),
  }
}
```

从上面的代码可以看到，`App`、`AppContext`和`AppConfig`这几个接口都没有实现类，转而在创建的时候在函数中完成初始化。

我想这样实现可能是为了防止多个应用之间行为的相互影响吧，假如是通过`class AppClass implements App`来实现`App`接口，然后再通过`new AppClass`创建应用的话，假设有人通过`AppClass.prototype`函数实现，那么会影响所有`App`的行为。

## 总结

本篇我们主要分析了**Vue3运行时**渲染器和App的设计及创建：

1. **渲染器**将可变的与运行平台相关的Api抽离到了`RendererOptions`接口中，其它复杂实现则内聚到了`baseCreateRenderer`函数中，同时为了简化创建**渲染器**的过程和提升获取渲染器的效率，同时使用了`单例`、`工厂方法`和`建造者`三个创建型设计模式。  
2. **Vue App**主要包括应用信息载体`App接口`，运行时状态载体`AppContext`和应用配置信息载体`AppConfig`三部分。  

**由于笔者的水平所限，文章可能存在不足和谬误，还请大家不吝指正。**  

如果文章对您有用，还望不吝三连^_^  

> **【原创声明】**  
> 本作品（包括但不限于文字、图片、音频、视频等）为（原心&lt;yunsin@vip.qq.com&gt;）原创作品，版权归原作者所有。未经授权，任何组织、机构、企业、个人不得以任何形式进行复制、转载、摘编、发表、发布、散布、传播等任何行为。  
任何在未经授权的情况下使用本作品的行为均被视作侵权行为，我们将保留追究法律责任的权利。如需使用本作品，请联系（原心&lt;yunsin@vip.qq.com&gt;）并注明出处及署名，我们将酌情考虑授权。  
本声明的最终解释权归（原心&lt;yunsin@vip.qq.com&gt;）所有，如有疑问请联系（**微信：iamyunsin** &nbsp; **邮箱: yunsin@vip.qq.com**）。


