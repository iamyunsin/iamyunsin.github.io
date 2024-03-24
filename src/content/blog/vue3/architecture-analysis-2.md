---
title: 'Vue3架构分析（二）—— 编译器的设计与实现'
description: '我想详细地分析一下Vue3的单文件组件的编译过程（即，其从.vue变成JS和CSS的过程），并试着分析其编译器的设计与实现。'
draft: false
pubDate: '2024-03-13'
tags: ['Vue3', '架构']
---

大家好，我是原心。

> 提示： 本系列文章都是基于`vue 3.4.21`源码进行解读梳理，文章中关键的地方会链接到`github源码`文件对应位置

[上一篇文章](../architecture-analysis-1)，我分享了一下从Vue单文件组件到浏览器中的DOM的主流程，不过，其中忽略了诸多细节。

接下来，我想详细地分析一下`Vue3`的单文件组件的编译过程（即，其从`.vue`文件变成`JS和CSS`的过程），并试着分析其编译器的设计与实现。

> **提示： 编译器的职责是将源码转换成目标代码，而Vue编译器的职责就是将vue源码（template,script,style）转换成浏览器能够执行的js和css代码。**

## 一、整体设计

为了使主流程的清晰易懂，我们先梳理了Vue编译器的**整体流程图**，如下所示：

![Vue编译器全景图](/blog/vue3/compile.svg)

> Vue编译器的工作流程如下：

1. **词法分析：** 将Vue源文件字符串输入词法分析器，经过处理之后得到许多`token`（标记），单个`token`对应源码中的一段连续的字符串，**表示程序语言中有具体含义的词语**（类似将文章分成许多词语）。  

2. **语法分析：** 按顺序输入第一步产生的`token`，经过语法分析，根据不同`token`的上下文和含义，生成`Vue AST`，它是**Vue程序文本的结构化描述**。  

3. **语法转换：** 处理第二步生成的`Vue AST`树中的所有节点，将其转换成`JS AST`。这个过程中，我们的转换器需要对`vue`中的**指令**、**插值表达式**、**组件**、**元素等等**进行一系列处理，最终产出可以用于生成js代码的`JS AST`。  

4. **代码生成器：** 处理步骤三产生的`JS AST`树中的所有节点，生成最终的`JS代码`。  

下面摘录表达这一过程的源码如下（您也可以通过[源码链接](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/compile.ts#L65)查看）：

```ts
export function baseCompile(
  source: string | RootNode,
  options: CompilerOptions = {},
): CodegenResult {
  ... 
  // 传入的是字符串（源代码，则执行baseParse函数进行编译）
  const ast = isString(source) ? baseParse(source, resolvedOptions) : source
  ... 
  // 执行转换，将编译后的vue ast转换成js ast
  transform(
    ast,
    extend({}, resolvedOptions, {
      nodeTransforms: [
        ...nodeTransforms,
        ...(options.nodeTransforms || []), // user transforms
      ],
      directiveTransforms: extend(
        {},
        directiveTransforms,
        options.directiveTransforms || {}, // user transforms
      ),
    }),
  )

  // 根据转换后的ast和编译配置，生成目标代码
  return generate(ast, resolvedOptions)
}
```

现在，我们对`Vue3`的编译器的工作流程已经有了一个宏观的认识，接着我们先来看看`Vue3`编译器各部分的**设计**和**实现**。

## 二、词法分析器和语法分析器的设计与实现

`Vue3`的词法分析器和语法分析器设计得简单而巧妙，下面是我根据源码梳理得出的UML类图，应该可以表达出其设计思路：

![Vue3词法分析器与语法分析器类图](/blog/vue3/parser.svg)

根据上面的描述，按理词法分析器和语法分析器应该是完全解耦的，唯一的关联只是语法分析器依赖词法分析器输出的token，那上面这个图怎么耦合起来了呢？

理想情况下词法分析器和语法分析器确实不该耦合，但是为了让分词和语法分析同步进行，不得不这样做。

我想，之所以要让分词和语法分析同步进行的主要原因有以下两个：

1. 源码的语法可能存在错误或不合理的情况，一边分词一边做语法分析能更快发现存在的问题  
2. 基于性能的考虑，一边分词一边做语法分析能够节省一些不必要的额外步骤  

下面，我们简单解读一下上面的类图：  

1. 首先**词法分析器(Tokenizer)** 依赖一个抽象的**取词器**(`Callbacks`接口)，**取词器**提供了一些方法用于接收词法分析器分析后输出的`token`，对于不同类型的token，将传递给不同的接收方法。
2. **语法分析器(Parser)**实现了**取词器**(`Callbacks接口`)，并且将这个实现作为词法分析器的依赖传递给他，然后语法分析器就可以静静地等待词法分析器回传`token`了。
3. 当**语法分析器**中的**取词器**收到**词法分析器**回传的`token`后，会对不同类型的`token`进行不同的处理，生成`AST节点`并将AST节点添加到`Vue AST树`中。

这样的设计让**词法分析器**和**语法分析器**解耦了，无论是**词法分析器**还是**语法分析器**的实现都是可替换的，只要他们都遵循**取词器**的接口进行通信就好。下面摘录了能表达上述设计的代码： 
* callbacks 点击[源码链接](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/tokenizer.ts#L180)跳转到对应源码位置
```ts
interface Callbacks {
  ontext(start: number, endIndex: number): void
  ontextentity(char: string, start: number, endIndex: number): void

  oninterpolation(start: number, endIndex: number): void

  onopentagname(start: number, endIndex: number): void
  onopentagend(endIndex: number): void
  onselfclosingtag(endIndex: number): void
  onclosetag(start: number, endIndex: number): void

  onattribdata(start: number, endIndex: number): void
  onattribentity(char: string, start: number, end: number): void
  onattribend(quote: QuoteType, endIndex: number): void
  onattribname(start: number, endIndex: number): void
  onattribnameend(endIndex: number): void

  ondirname(start: number, endIndex: number): void
  ondirarg(start: number, endIndex: number): void
  ondirmodifier(start: number, endIndex: number): void

  oncomment(start: number, endIndex: number): void
  oncdata(start: number, endIndex: number): void

  onprocessinginstruction(start: number, endIndex: number): void
  // ondeclaration(start: number, endIndex: number): void
  onend(): void
  onerr(code: ErrorCodes, index: number): void
}
```   
* tokenizer 点击[源码链接](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/tokenizer.ts#L228)跳转到对应源码  
```ts
class Tokenizer {
  ...
  constructor(
    private readonly stack: ElementNode[],
    private readonly cbs: Callbacks,
  )

  ...
}

```

* parser 相关源码您可以通过[tokenizer实现](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/parser.ts#L97)和[baseParse实现](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/parser.ts#L1021)查看

```ts
// 这里的传入的第二个对象参数就是对Callbacks接口的实现
const tokenizer = new Tokenizer(stack, {
  onerr: emitError,
  // 当词法分析器分析出一串完整的文本时，就会调用该函数
  ontext(start, end) {
    onText(getSlice(start, end), start, end)
  },
  ...
})

export function baseParse(input: string, options?: ParserOptions): RootNode {
  ...
  currentInput = input
  ...
  const root = (currentRoot = createRoot([], input))
  // 调用词法分析器进行分词
  tokenizer.parse(currentInput)
  ...
  return root
}
```

现在，我们已经在宏观上的了解了`Vue3`词法分析器和语法分析器的设计模型，接下来我们通过源码来学习一下各部分的具体实现。

> 提示：本节后续内容可能会比较烧脑和过于细节，如果不感兴趣可以直接跳转到[转换器的设计与实现](#三转换器的设计与实现)

### （一）词法分析器的实现分析

词法分析器的核心本质实际上是做字符串处理，将源码字符串处理成许多有特殊意义的token。

要读懂**词法分析器**的源码，我们要先理解**有限状态自动机**（又叫`有限自动机`）模型，因为我们的词法分析器的运转就是基于这个模型来运转的。

有限自动机的几个要素：

1. 具有有限个明确的状态  
2. 各状态之间的流转途径有明确的定义  
3. 状态机初始化时具有一个确定的初始状态  
4. 分析结束时，可以处于的正确的状态定义  

为了便于理解词法分析器状态机的工作流程，我们先来举一个非常简单的例子（复杂了会很烧脑）：

* 我们基于下面的`vue sfc`组件（①），来设置分析一下`tokenizer`在执行过程中的状态流转

```vue
<template>
  <div>{{ a }}</div>
</template>
<script setup>
import { ref } from 'vue'

const a = ref('a')
</script>
```

* 为了更好地理解后续内容，我们先放出基于上面的代码，词法分析器和语法分析器内部的状态流转图：

![](/blog/vue3/tokenizer-parser-workflow.svg)

如图所示，为了完成左侧`vue sfc`源码到`Vue AST`的转换，词法分析器的状态机一共做了`25次`状态流转，而这个过程中语法分析器的`辅助栈`也进行了六次变化，当然整个过程中，`Vue AST`中的节点内部做了更多次变化。

在进行源码实现分析之前，我们先看看为了实现词法分析器功能，做的一些类型定义及内容。

* `Vue`的词法分析器的所有状态定义（共34种状态）[源码链接](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/tokenizer.ts#L87)

```ts
/** All the states the tokenizer can be in. */
export enum State {
  Text = 1,

  // interpolation （插值表达式相关的状态）
  InterpolationOpen,
  Interpolation,
  InterpolationClose,

  // Tags（标签相关的状态）
  BeforeTagName, // After <
  InTagName,
  InSelfClosingTag,
  BeforeClosingTagName,
  InClosingTagName,
  AfterClosingTagName,

  // Attrs （属性相关的状态）
  BeforeAttrName,
  InAttrName,
  InDirName,
  InDirArg,
  InDirDynamicArg,
  InDirModifier,
  AfterAttrName,
  BeforeAttrValue,
  InAttrValueDq, // "
  InAttrValueSq, // '
  InAttrValueNq,

  // Declarations
  BeforeDeclaration, // !
  InDeclaration,

  // Processing instructions
  InProcessingInstruction, // ?

  // Comments & CDATA
  BeforeComment,
  CDATASequence,
  InSpecialComment,
  InCommentLike,

  // Special tags
  BeforeSpecialS, // Decide if we deal with `<script` or `<style`
  BeforeSpecialT, // Decide if we deal with `<title` or `<textarea`
  SpecialStartSequence,
  InRCDATA,

  InEntity,

  InSFCRootTagName,
}
```

* 特殊字符的定义，用于词法分析过程中辅助判断 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/tokenizer.ts#L47)

```ts
export enum CharCodes {
  Tab = 0x9, // "\t"
  NewLine = 0xa, // "\n"
  FormFeed = 0xc, // "\f"
  CarriageReturn = 0xd, // "\r"
  Space = 0x20, // " "
  ExclamationMark = 0x21, // "!"
  Number = 0x23, // "#"
  Amp = 0x26, // "&"
  SingleQuote = 0x27, // "'"
  DoubleQuote = 0x22, // '"'
  GraveAccent = 96, // "`"
  Dash = 0x2d, // "-"
  Slash = 0x2f, // "/"
  Zero = 0x30, // "0"
  Nine = 0x39, // "9"
  Semi = 0x3b, // ";"
  Lt = 0x3c, // "<"
  Eq = 0x3d, // "="
  Gt = 0x3e, // ">"
  Questionmark = 0x3f, // "?"
  UpperA = 0x41, // "A"
  LowerA = 0x61, // "a"
  UpperF = 0x46, // "F"
  LowerF = 0x66, // "f"
  UpperZ = 0x5a, // "Z"
  LowerZ = 0x7a, // "z"
  LowerX = 0x78, // "x"
  LowerV = 0x76, // "v"
  Dot = 0x2e, // "."
  Colon = 0x3a, // ":"
  At = 0x40, // "@"
  LeftSquare = 91, // "["
  RightSquare = 93, // "]"
}
```

* 有特殊含义的字符串定义，用于辅助判断有特定含义的源码串 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/tokenizer.ts#L216)

```ts
export const Sequences = {
  Cdata: new Uint8Array([0x43, 0x44, 0x41, 0x54, 0x41, 0x5b]), // CDATA[
  CdataEnd: new Uint8Array([0x5d, 0x5d, 0x3e]), // ]]>
  CommentEnd: new Uint8Array([0x2d, 0x2d, 0x3e]), // `-->`
  ScriptEnd: new Uint8Array([0x3c, 0x2f, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74]), // `</script`
  StyleEnd: new Uint8Array([0x3c, 0x2f, 0x73, 0x74, 0x79, 0x6c, 0x65]), // `</style`
  TitleEnd: new Uint8Array([0x3c, 0x2f, 0x74, 0x69, 0x74, 0x6c, 0x65]), // `</title`
  TextareaEnd: new Uint8Array([
    0x3c, 0x2f, 116, 101, 120, 116, 97, 114, 101, 97,
  ]), // `</textarea
}
```

源码中，还定义了很多辅助判断的函数，这里就不一一列举了，因为最重要的还是对状态的定义。从状态的数量（34种）就能看出来，要实现词法分析和语法分析工作量是非常大的。

不过还有两个比较关键的前置源码，一个就是状态机的初始状态，另一个是我们的词法分析器的状态流转入口，下面我们也把相关代码摘录出来了。

* `tokenizer`的初始状态是`State.Text` [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/tokenizer.ts#L230)

```ts
export default class Tokenizer {
  /** The current state the tokenizer is in. */
  public state = State.Text
  ...
}
```

* 状态机的每次接收输入时，状态的流转的入口在`tokenizer.parse`方法中，这里包含了所有这`34`种状态下，状态机的逻辑分支入口 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/tokenizer.ts#L920)

```ts
public parse(input: string) {
    this.buffer = input
    while (this.index < this.buffer.length) {
      const c = this.buffer.charCodeAt(this.index)
      if (c === CharCodes.NewLine) {
        this.newlines.push(this.index)
      }
      switch (this.state) {
        case State.Text: {
          this.stateText(c)
          break
        }
        case State.InterpolationOpen: {
          this.stateInterpolationOpen(c)
          break
        }
        case State.Interpolation: {
          this.stateInterpolation(c)
          break
        }
        case State.InterpolationClose: {
          this.stateInterpolationClose(c)
          break
        }
        case State.SpecialStartSequence: {
          this.stateSpecialStartSequence(c)
          break
        }
        case State.InRCDATA: {
          this.stateInRCDATA(c)
          break
        }
        case State.CDATASequence: {
          this.stateCDATASequence(c)
          break
        }
        case State.InAttrValueDq: {
          this.stateInAttrValueDoubleQuotes(c)
          break
        }
        case State.InAttrName: {
          this.stateInAttrName(c)
          break
        }
        case State.InDirName: {
          this.stateInDirName(c)
          break
        }
        case State.InDirArg: {
          this.stateInDirArg(c)
          break
        }
        case State.InDirDynamicArg: {
          this.stateInDynamicDirArg(c)
          break
        }
        case State.InDirModifier: {
          this.stateInDirModifier(c)
          break
        }
        case State.InCommentLike: {
          this.stateInCommentLike(c)
          break
        }
        case State.InSpecialComment: {
          this.stateInSpecialComment(c)
          break
        }
        case State.BeforeAttrName: {
          this.stateBeforeAttrName(c)
          break
        }
        case State.InTagName: {
          this.stateInTagName(c)
          break
        }
        case State.InSFCRootTagName: {
          this.stateInSFCRootTagName(c)
          break
        }
        case State.InClosingTagName: {
          this.stateInClosingTagName(c)
          break
        }
        case State.BeforeTagName: {
          this.stateBeforeTagName(c)
          break
        }
        case State.AfterAttrName: {
          this.stateAfterAttrName(c)
          break
        }
        case State.InAttrValueSq: {
          this.stateInAttrValueSingleQuotes(c)
          break
        }
        case State.BeforeAttrValue: {
          this.stateBeforeAttrValue(c)
          break
        }
        case State.BeforeClosingTagName: {
          this.stateBeforeClosingTagName(c)
          break
        }
        case State.AfterClosingTagName: {
          this.stateAfterClosingTagName(c)
          break
        }
        case State.BeforeSpecialS: {
          this.stateBeforeSpecialS(c)
          break
        }
        case State.BeforeSpecialT: {
          this.stateBeforeSpecialT(c)
          break
        }
        case State.InAttrValueNq: {
          this.stateInAttrValueNoQuotes(c)
          break
        }
        case State.InSelfClosingTag: {
          this.stateInSelfClosingTag(c)
          break
        }
        case State.InDeclaration: {
          this.stateInDeclaration(c)
          break
        }
        case State.BeforeDeclaration: {
          this.stateBeforeDeclaration(c)
          break
        }
        case State.BeforeComment: {
          this.stateBeforeComment(c)
          break
        }
        case State.InProcessingInstruction: {
          this.stateInProcessingInstruction(c)
          break
        }
        case State.InEntity: {
          this.stateInEntity()
          break
        }
      }
      this.index++
    }
    this.cleanup()
    this.finish()
  }
```

下面，我们看看当执行`tokenizer.parse(①, { parseMode: 'sfc' })`方法传入上面的vue sfc组件源码后，并且指定为sfc模式，会经过怎样的状态流转呢？

**解析出第一个token:** 因为状态机的初始状态是`State.Text`，因此执行`this.stateText(c)`，对应parse方法的第`10`行

1. 由于收到的第一个字符是`<`符号，因此经过处理之后，状态流转到`State.BeforeTagName`，下面代码的第`6`行 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/tokenizer.ts#L315)

```ts
private stateText(c: number): void {
  if (c === CharCodes.Lt) {
    if (this.index > this.sectionStart) {
      this.cbs.ontext(this.sectionStart, this.index)
    }
    this.state = State.BeforeTagName
    this.sectionStart = this.index
  } else if (!__BROWSER__ && c === CharCodes.Amp) {
    this.startEntity()
  } else if (!this.inVPre && c === this.delimiterOpen[0]) {
    this.state = State.InterpolationOpen
    this.delimiterIndex = 0
    this.stateInterpolationOpen(c)
  }
}
```

2. `this.index`自增，并继续`while`循环，由于当前状态处于`State.BeforeTagName`，因此执行`this.stateBeforeTagName(c)`方法，进入之后，因为如此是字符`t`因此，会进入`isTagStartChar`分支，状态会切到`State.InSFCRootTagName`，下方第`11`行代码 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/tokenizer.ts#L551)

```ts
private stateBeforeTagName(c: number): void {
  if (c === CharCodes.ExclamationMark) {
    ...
  } else if (c === CharCodes.Questionmark) {
    ...
  } else if (isTagStartChar(c)) {
    this.sectionStart = this.index
    if (this.mode === ParseMode.BASE) {
      ...
    } else if (this.inSFCRoot) {
      this.state = State.InSFCRootTagName
    } else if (!this.inXML) {
      ...
    } else {
      ...
    }
  } else if (c === CharCodes.Slash) {
    this.state = State.BeforeClosingTagName
  } else {
    this.state = State.Text
    this.stateText(c)
  }
}
```

3. `this.index`自增，并继续`while`循环，由于当前状态处于`State.InSFCRootTagName`，因此执行`this.stateInSFCRootTagName(c)`，从下面的代码可以看到，如果没有收到`/`、`空格`或`>`三种字符的话，tokenizer的状态就会一直处于`State.InSFCRootTagName`状态，直到接收到`/`、`空格`或`>`的时候，就表示当前的标签名解析结束，执行`this.handleTagName(c)`通过`this.cbs.onopentagname`通知取词器将当前打开的标签传递给`parser`进行语法分析。

```ts
function isEndOfTagSection(c: number): boolean {
  return c === CharCodes.Slash || c === CharCodes.Gt || isWhitespace(c)
}
...
private stateInSFCRootTagName(c: number): void {
  if (isEndOfTagSection(c)) {
    const tag = this.buffer.slice(this.sectionStart, this.index)
    if (tag !== 'template') {
      this.enterRCDATA(toCharCodes(`</` + tag), 0)
    }
    this.handleTagName(c)
  }
}

private handleTagName(c: number) {
    this.cbs.onopentagname(this.sectionStart, this.index)
    this.sectionStart = -1
    this.state = State.BeforeAttrName
    this.stateBeforeAttrName(c)
  }
```

4. 然后结束当前分析，将sectionStart重置，并尝试开始分析属性（设置状态为`State.BeforeAttrName`，并立即执行`this.stateBeforeAttrName(c)`），由于传入的字符是`<template>`串的`>`符号，因此执行会将当前状态转换到`State.Text`，下面的第`7`行代码。

```ts
private stateBeforeAttrName(c: number): void {
    if (c === CharCodes.Gt) {
      this.cbs.onopentagend(this.index)
      if (this.inRCDATA) {
        this.state = State.InRCDATA
      } else {
        this.state = State.Text
      }
      this.sectionStart = this.index + 1
    } else if (c === CharCodes.Slash) {
      this.state = State.InSelfClosingTag
      if ((__DEV__ || !__BROWSER__) && this.peek() !== CharCodes.Gt) {
        this.cbs.onerr(ErrorCodes.UNEXPECTED_SOLIDUS_IN_TAG, this.index)
      }
    } else if (c === CharCodes.Lt && this.peek() === CharCodes.Slash) {
      // special handling for </ appearing in open tag state
      // this is different from standard HTML parsing but makes practical sense
      // especially for parsing intermediate input state in IDEs.
      this.cbs.onopentagend(this.index)
      this.state = State.BeforeTagName
      this.sectionStart = this.index
    } else if (!isWhitespace(c)) {
      if ((__DEV__ || !__BROWSER__) && c === CharCodes.Eq) {
        this.cbs.onerr(
          ErrorCodes.UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME,
          this.index,
        )
      }
      this.handleAttrStart(c)
    }
  }
```

**后续的解析说明：** 通过上面的分析，大家应该直观地了解了`tokenizer`就是通过逐个扫描输入源码字符串，通过设置状态来区分当前分析的`token`类别。然后通过特定的条件控制状态流转，直到分析出源码中所有的`token`为止。

上面我们介绍了`tokenizer`通过`this.cbs.onopentagname(this.sectionStart, this.index)`调用来将解析出的`token`（打开是template标签）交给`parser`处理。

在`this.stateBeforeAttrName(c)`中，因为接收到`>`符号，因此会调用`this.cbs.onopentagend(this.index)`方法来结束打开节点标签的解析。

接下来，我们试着以此为起点来分析一下**语法分析器**是如何在收到一个`token`的时候，进行语法分析并将对应的节点添加到`Vue AST`树上的。

### （二）语法分析器的实现分析

在接着分析之前，我们先看看语法分析器在初始化时，设置的两个个关键变量和一个工具函数。

* **stack：** 用于在语法分析时，存储当前`token`所在语法树的父节点和祖先节点 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/parser.ts#L95)

```ts
const stack: ElementNode[] = []
```

* **root：** `Vue AST`的根节点 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/parser.ts#L1066)

```ts
const root = (currentRoot = createRoot([], input))
```

* **addNode：** 用于将一个`Vue AST节点`添加到`Vue AST树`中的工具函数 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/parser.ts#L909)
```ts
function addNode(node: TemplateChildNode) {
  ;(stack[0] || currentRoot).children.push(node)
}
```

* 接下来，我们来看看parser实现的`onopentagname`和`onopentagend`方法 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/parser.ts#L136)

```ts
...
  onopentagname(start, end) {
    const name = getSlice(start, end)
    currentOpenTag = {
      type: NodeTypes.ELEMENT,
      tag: name,
      ns: currentOptions.getNamespace(name, stack[0], currentOptions.ns),
      tagType: ElementTypes.ELEMENT, // will be refined on tag close
      props: [],
      children: [],
      loc: getLoc(start - 1, end),
      codegenNode: undefined,
    }
  },

  onopentagend(end) {
    endOpenTag(end)
  },
...
function endOpenTag(end: number) {
  if (tokenizer.inSFCRoot) {
    // in SFC mode, generate locations for root-level tags' inner content.
    currentOpenTag!.innerLoc = getLoc(end + 1, end + 1)
  }
  addNode(currentOpenTag!)
  const { tag, ns } = currentOpenTag!
  if (ns === Namespaces.HTML && currentOptions.isPreTag(tag)) {
    inPre++
  }
  if (currentOptions.isVoidTag(tag)) {
    onCloseTag(currentOpenTag!, end)
  } else {
    stack.unshift(currentOpenTag!)
    if (ns === Namespaces.SVG || ns === Namespaces.MATH_ML) {
      tokenizer.inXML = true
    }
  }
  currentOpenTag = null
}
```

通过上面的代码，我们看到，当我们收到一个打开的标签时，会新建一个标签节点对应的`Vue AST Node`对象，并将其保存在`currentOpenTag`变量中，直到接收到`onopentagend`回调的时候，才通过`addNode`方法将当前打开的节点添加到`Vue AST树中`，然后再通过`stack.unshift(currentOpenTag!)`将当前节点添加到栈顶，接着处理当前打开节点内部的情况。

* 我们上面例子中的代码，最终转换出来的最终生成的`Vue AST`结构如下

```js
{
  "type": 0,
  "source": "<template>\n<div>{{ a }}</div>\n</template>\n<script setup>\nimport { ref } from 'vue'\n\nconst a = ref('a')\n</script>",
  "children": [
    {
      "type": 1,
      "tag": "template",
      "ns": 0,
      "tagType": 0,
      "props": [],
      "children": [
        {
          "type": 1,
          "tag": "div",
          "ns": 0,
          "tagType": 0,
          "props": [],
          "children": [
            {
              "type": 5,
              "content": {
                "type": 4,
                "loc": {
                  "start": {
                    "column": 9,
                    "line": 2,
                    "offset": 19
                  },
                  "end": {
                    "column": 10,
                    "line": 2,
                    "offset": 20
                  },
                  "source": "a"
                },
                "content": "a",
                "isStatic": false,
                "constType": 0
              },
              "loc": {
                "start": {
                  "column": 6,
                  "line": 2,
                  "offset": 16
                },
                "end": {
                  "column": 13,
                  "line": 2,
                  "offset": 23
                },
                "source": "{{ a }}"
              }
            }
          ],
          "loc": {
            "start": {
              "column": 1,
              "line": 2,
              "offset": 11
            },
            "end": {
              "column": 19,
              "line": 2,
              "offset": 29
            },
            "source": "<div>{{ a }}</div>"
          }
        }
      ],
      "loc": {
        "start": {
          "column": 1,
          "line": 1,
          "offset": 0
        },
        "end": {
          "column": 12,
          "line": 3,
          "offset": 41
        },
        "source": "<template>\n<div>{{ a }}</div>\n</template>"
      },
      "innerLoc": {
        "start": {
          "column": 11,
          "line": 1,
          "offset": 10
        },
        "end": {
          "column": 1,
          "line": 3,
          "offset": 30
        },
        "source": "\n<div>{{ a }}</div>\n"
      }
    },
    {
      "type": 1,
      "tag": "script",
      "ns": 0,
      "tagType": 0,
      "props": [
        {
          "type": 6,
          "name": "setup",
          "nameLoc": {
            "start": {
              "column": 9,
              "line": 4,
              "offset": 50
            },
            "end": {
              "column": 14,
              "line": 4,
              "offset": 55
            },
            "source": "setup"
          },
          "loc": {
            "start": {
              "column": 9,
              "line": 4,
              "offset": 50
            },
            "end": {
              "column": 14,
              "line": 4,
              "offset": 55
            },
            "source": "setup"
          }
        }
      ],
      "children": [
        {
          "type": 2,
          "content": "\nimport { ref } from 'vue'\n\nconst a = ref('a')\n",
          "loc": {
            "start": {
              "column": 15,
              "line": 4,
              "offset": 56
            },
            "end": {
              "column": 1,
              "line": 8,
              "offset": 103
            },
            "source": "\nimport { ref } from 'vue'\n\nconst a = ref('a')\n"
          }
        }
      ],
      "loc": {
        "start": {
          "column": 1,
          "line": 4,
          "offset": 42
        },
        "end": {
          "column": 10,
          "line": 8,
          "offset": 112
        },
        "source": "<script setup>\nimport { ref } from 'vue'\n\nconst a = ref('a')\n</script>"
      },
      "innerLoc": {
        "start": {
          "column": 15,
          "line": 4,
          "offset": 56
        },
        "end": {
          "column": 1,
          "line": 8,
          "offset": 103
        },
        "source": "\nimport { ref } from 'vue'\n\nconst a = ref('a')\n"
      }
    }
  ],
  "helpers": {},
  "components": [],
  "directives": [],
  "hoists": [],
  "imports": [],
  "cached": 0,
  "temps": 0,
  "loc": {
    "start": {
      "column": 1,
      "line": 1,
      "offset": 0
    },
    "end": {
      "column": 10,
      "line": 8,
      "offset": 112
    },
    "source": "<template>\n<div>{{ a }}</div>\n</template>\n<script setup>\nimport { ref } from 'vue'\n\nconst a = ref('a')\n</script>"
  }
}
```

## 三、转换器的设计与实现

我们已经知道，转换器的功能是将`Vue AST`转换成`JS AST`，整个转换过程是比较复杂的，因为vue支持了的很多模板语法都需要经过合适的转换，再配合运行时才能正确地工作。

毕竟`Vue`的转换器除了要满足现有的转换需求，还需要考虑可能的更多语法支持，因此转换器一定要具有较好的可扩展性，并且能够灵活地让多种转换操作按照需求相互配合。

为了满足上面的需求，`Vue`的转换器使用了**责任链模式**（或者说是类似洋葱模型，本质就是过滤器），整个转换的过程被分解成多个**具有单一职责**的转换函数，每个转换函数负责转换的一个环节。

Vue3为转换函数定义了三个接口，分别用于`节点转换`、`指令转换`和在转换过程中存储上下文信息的接口:

* 节点转换器类型声明 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/transform.ts#L49)

```ts
export type NodeTransform = (
  node: RootNode | TemplateChildNode,
  context: TransformContext,
) => void | (() => void) | (() => void)[]
```

* 指令转换器类型声明 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/transform.ts#L57)

```ts
export type DirectiveTransform = (
  dir: DirectiveNode,
  node: ElementNode,
  context: TransformContext,
  // a platform specific compiler can import the base transform and augment
  // it by passing in this optional argument.
  augmentor?: (ret: DirectiveTransformResult) => DirectiveTransformResult,
) => DirectiveTransformResult
```

* 转换上下文(TransformContext) [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/transform.ts#L85)

```ts
export interface TransformContext
  extends Required<Omit<TransformOptions, keyof CompilerCompatOptions>>,
    CompilerCompatOptions {
  selfName: string | null
  root: RootNode
  helpers: Map<symbol, number>
  components: Set<string>
  directives: Set<string>
  hoists: (JSChildNode | null)[]
  imports: ImportItem[]
  temps: number
  cached: number
  identifiers: { [name: string]: number | undefined }
  scopes: {
    vFor: number
    vSlot: number
    vPre: number
    vOnce: number
  }
  parent: ParentNode | null
  childIndex: number
  currentNode: RootNode | TemplateChildNode | null
  inVOnce: boolean
  helper<T extends symbol>(name: T): T
  removeHelper<T extends symbol>(name: T): void
  helperString(name: symbol): string
  replaceNode(node: TemplateChildNode): void
  removeNode(node?: TemplateChildNode): void
  onNodeRemoved(): void
  addIdentifiers(exp: ExpressionNode | string): void
  removeIdentifiers(exp: ExpressionNode | string): void
  hoist(exp: string | JSChildNode | ArrayExpression): SimpleExpressionNode
  cache<T extends JSChildNode>(exp: T, isVNode?: boolean): CacheExpression | T
  constantCache: WeakMap<TemplateChildNode, ConstantTypes>

  // 2.x Compat only
  filters?: Set<string>
}
```

* `Vue Transform`运行过程如下图所示：

![](/blog/vue3/transform.svg)

整个过程就是，首先将转换`Vue AST`和`TransformContext`传入`Transform链`，`Transform`链中每个节点分两个阶段（图中的`transformFn`和`exitFn`），乍看起来好像没对，不是说了有两种转换器吗？上图中却只有`NodeTransform`，`DirectiveTransform`在哪里呢？

其实，这个`DirectiveTransform`的解析是在`transformElement`的`exitFn`中执行的，下面我们摘取关键源码进行说明。

* 下面是`transform`调用入口的代码，我们可以看到我们传入了`nodeTransforms`和`directiveTransforms`的具体参数，由于代码非常清晰这里就不赘述了

```ts
export function getBaseTransformPreset(
  prefixIdentifiers?: boolean,
): TransformPreset {
  return [
    [
      // 带有v-once指令的节点转换
      transformOnce,
      // 带有v-if指令的节点转换
      transformIf,
      transformMemo,
      transformFor,
      ...(__COMPAT__ ? [transformFilter] : []),
      ...(!__BROWSER__ && prefixIdentifiers
        ? [
            // order is important
            trackVForSlotScopes,
            transformExpression,
          ]
        : __BROWSER__ && __DEV__
          ? [transformExpression]
          : []),
      transformSlotOutlet,
      // 节点转换
      transformElement,
      trackSlotScopes,
      transformText,
    ],
    {
      on: transformOn,
      bind: transformBind,
      model: transformModel,
    },
  ]
}
...
const [nodeTransforms, directiveTransforms] =
    getBaseTransformPreset(prefixIdentifiers)
  ...
  transform(
    ast,
    extend({}, resolvedOptions, {
      // 设置 nodeTransforms
      nodeTransforms: [
        ...nodeTransforms,
        ...(options.nodeTransforms || []), // user transforms
      ],
      // 设置 directiveTransforms
      directiveTransforms: extend(
        {},
        directiveTransforms,
        options.directiveTransforms || {}, // user transforms
      ),
    }),
  )
  ...
```

* 接下来，我们再看看`transform`函数的代码实现 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/transform.ts#L319)

通过下面的代码，可以看出整体流程为：

1. 创建转换上下文  
2. 遍历所有节点进行转换  
3. 创建根节点的代码生成节点，因为这里需要用到内部节点已经转换的结果，所以放到第三步
4. 转换完成之后再进行静态提升和将元信息（这些元信息，在代码生成阶段会用到）设为终态，并将transformed设成true

```ts
export function transform(root: RootNode, options: TransformOptions) {
  // 创建上下文
  const context = createTransformContext(root, options)

  // 遍历Vue AST所有节点，进行相应的转换
  traverseNode(root, context)

  // 静态提升
  if (options.hoistStatic) {
    hoistStatic(root, context)
  }

  // 创建根节点的代码生成节点
  if (!options.ssr) {
    createRootCodegen(root, context)
  }

  // finalize meta information
  root.helpers = new Set([...context.helpers.keys()])
  root.components = [...context.components]
  root.directives = [...context.directives]
  root.imports = context.imports
  root.hoists = context.hoists
  root.temps = context.temps
  root.cached = context.cached
  root.transformed = true

  // 兼容vue2
  if (__COMPAT__) {
    root.filters = [...context.filters!]
  }
}
```

接下来，我们重点看一下`transformElement`这个比较“特殊”的转换器，说它特殊，是因为它是将`Vue AST`转换成`JS AST`的关键转换器。

* `transformElement`转换器 [查看源码](https://github.com/vuejs/core/blob/f66a75ea75c8aece065b61e2126b4c5b2338aa6e/packages/compiler-core/src/transforms/transformElement.ts#L73)

这里有两个特殊的地方：

1. 它的`transformFn`阶段什么都没做，因为这些前置的处理都交给了其它的节点转换器先进行处理了，它直接返回了一个`postTransformElement`函数，直到其它的处理器都执行完了之后，就会回到这里。  
2. 最后通过`createVNodeCall`会生成一个创建`vnode`节点的`JS AST`节点，并赋值给当前节点的`codegenNode`属性。

```ts
export const transformElement: NodeTransform = (node, context) => {
  // perform the work on exit, after all child expressions have been
  // processed and merged.
  return function postTransformElement() {
    node = context.currentNode!

    // 此处省略100多行
    ...

    node.codegenNode = createVNodeCall(
      context,
      vnodeTag,
      vnodeProps,
      vnodeChildren,
      vnodePatchFlag,
      vnodeDynamicProps,
      vnodeDirectives,
      !!shouldUseBlock,
      false /* disableTracking */,
      isComponent,
      node.loc,
    )
  }
}
```


到此为止，我们对`Vue transform`已经有了较为宏观的认识，对于转换的很多其它细节，这里就先不深究了。

## 四、代码生成器的设计与实现

上文提到在执行`transformElement`的时候，`node.codegenNode`保存了创建一个`vnode`节点的`JS AST`节点，那么，接下来，我们就看看代码生成器是怎样处理这个节点，最终生成一个创建`vnode`节点的函数的。

在分析代码生成的过程之前，我们还是先看看代码生成器的一些关键设计。

* 我们还是从代码生成器的入口函数(`generate`)开始接下来的分析

```ts
export function generate(
  ast: RootNode,
  options: CodegenOptions & {
    onContextCreated?: (context: CodegenContext) => void
  } = {},
): CodegenResult {
  const context = createCodegenContext(ast, options)
  if (options.onContextCreated) options.onContextCreated(context)
  const {
    mode,
    push,
    prefixIdentifiers,
    indent,
    deindent,
    newline,
    scopeId,
    ssr,
  } = context

  const helpers = Array.from(ast.helpers)
  const hasHelpers = helpers.length > 0
  const useWithBlock = !prefixIdentifiers && mode !== 'module'
  const genScopeId = !__BROWSER__ && scopeId != null && mode === 'module'
  const isSetupInlined = !__BROWSER__ && !!options.inline

  // preambles
  // in setup() inline mode, the preamble is generated in a sub context
  // and returned separately.
  const preambleContext = isSetupInlined
    ? createCodegenContext(ast, options)
    : context

  if (!__BROWSER__ && mode === 'module') {
    // 模块模式，则生成 import 相关导入语句和导出语句
    genModulePreamble(ast, preambleContext, genScopeId, isSetupInlined)
  } else {
    // 函数模式，生成闭包函数
    genFunctionPreamble(ast, preambleContext)
  }
  // enter render function
  const functionName = ssr ? `ssrRender` : `render`
  
  // 形参列表
  const args = ssr ? ['_ctx', '_push', '_parent', '_attrs'] : ['_ctx', '_cache']
  if (!__BROWSER__ && options.bindingMetadata && !options.inline) {
    // binding optimization args
    args.push('$props', '$setup', '$data', '$options')
  }

  // 函数形参字符串
  const signature =
    !__BROWSER__ && options.isTS
      ? args.map(arg => `${arg}: any`).join(',')
      : args.join(', ')

  // 渲染函数声明开始部分
  if (isSetupInlined) {
    push(`(${signature}) => {`)
  } else {
    push(`function ${functionName}(${signature}) {`)
  }
  indent()

  // 忽略，一般不用这个
  if (useWithBlock) {
    push(`with (_ctx) {`)
    indent()
    // function mode const declarations should be inside with block
    // also they should be renamed to avoid collision with user properties
    if (hasHelpers) {
      push(
        `const { ${helpers.map(aliasHelper).join(', ')} } = _Vue\n`,
        NewlineType.End,
      )
      newline()
    }
  }

  // generate asset resolution statements
  // 解析组件相关的处理代码语句
  if (ast.components.length) {
    genAssets(ast.components, 'component', context)
    if (ast.directives.length || ast.temps > 0) {
      newline()
    }
  }
  // 解析指令相关的处理代码语句
  if (ast.directives.length) {
    genAssets(ast.directives, 'directive', context)
    if (ast.temps > 0) {
      newline()
    }
  }
  // 解析过滤器相关的处理代码语句
  if (__COMPAT__ && ast.filters && ast.filters.length) {
    newline()
    genAssets(ast.filters, 'filter', context)
    newline()
  }

  if (ast.temps > 0) {
    push(`let `)
    for (let i = 0; i < ast.temps; i++) {
      push(`${i > 0 ? `, ` : ``}_temp${i}`)
    }
  }
  if (ast.components.length || ast.directives.length || ast.temps) {
    push(`\n`, NewlineType.Start)
    newline()
  }

  // generate the VNode tree expression
  if (!ssr) {
    push(`return `)
  }

  
  if (ast.codegenNode) {
    // 生成节点代码，这里才是真正的JS AST转代码的核心部分
    genNode(ast.codegenNode, context)
  } else {
    push(`null`)
  }

  if (useWithBlock) {
    deindent()
    push(`}`)
  }

  deindent()
  push(`}`)

  // 最终返回生成后的js代码和sourcemap
  return {
    ast,
    code: context.code,
    preamble: isSetupInlined ? preambleContext.code : ``,
    map: context.map ? context.map.toJSON() : undefined,
  }
}
```

从上面的代码可以看出，代码生成经过了下面几个大步骤：

1. 创建代码生成器上下文对象，用于保存代码生成过程中的一些状态信息  
2. 根据模式不同，生成资源导入和前置代码
3. 生成渲染函数函数名、入参列表以及拼接最终的函数签名
4. 生成解析组件、指令和过滤器（`vue2`）相关的代码语句
5. 根据`Vue转换器`生成的`JS AST`转换JS代码，并将其拼接起来
6. 生成后置语句和块结束符等

整体来看，Vue3的**代码生成器**与**词法分析器和语法分析器**所做的事情正好相反，前者输入`JS AST`语法树，输出`js代码字符串`，而后者输入`vue sfc`字符串，输出`Vue AST`语法树。

## 总结

本文从整体入手分析了Vue3的编译器整体结构，而后又分别分析了Vue3的词法分析器、语法分析器和代码生成器的设计和实现。

整体看来，`Vue3编译器`的设计和代码结构都非常清晰易读，其难点在于编译、转换的过程中需要处理非常多的细节，而成败往往都是这些细节决定的。

**由于笔者的水平所限，源码中有很多优化地方都没能分享**（比如：在词法分析阶段，有部分场景会大段地跳过，以提升性能），**文章可能存在不足和谬误，还请大家不吝指正。**

> **【原创声明】**  
> 本作品（包括但不限于文字、图片、音频、视频等）为（原心<yunsin@vip.qq.com>）原创作品，版权归原作者所有。未经授权，任何组织、机构、企业、个人不得以任何形式进行复制、转载、摘编、发表、发布、散布、传播等任何行为。  
任何在未经授权的情况下使用本作品的行为均被视作侵权行为，我们将保留追究法律责任的权利。如需使用本作品，请联系（原心<yunsin@vip.qq.com>）并注明出处及署名，我们将酌情考虑授权。  
本声明的最终解释权归（原心<yunsin@vip.qq.com>）所有，如有疑问请联系（微信：iamyunsin &nbsp;&nbsp;&nbsp; 邮箱: yunsin@vip.qq.com）。