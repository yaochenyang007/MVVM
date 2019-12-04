# MVVM
<!-- [![NPM version](https://npmjs.org/package/MVVM-ES6)](https://npmjs.org/package/MVVM-ES6) -->
> 自己写的`MVVM`框架, [Demo](https://yaochenyang.xin/mvvm/mvvm.html)
## 注意：此项目仅供学习使用。

## Todos
 - [x] 双向绑定
 - [x] 事件绑定
 - [x] 计算属性
 - [x] 自定义指令
 - [x] ES6语法
 - [x] 正则表达式
 - [x] Object.defineProperty


 - 引入js
``` html
<script src="./js/mvvm.js"></script>
```

## 使用
``` html
<div id="app">
    <input class="input" type="text" v-model="school.name">
    <p>{{school.name}}</p>
    <!-- <p>{{school.age}}</p> -->
    {{getyaochenyang}}
    <button v-on:click="clickBtn">更新数据</button>
    <div v-html="message"></div>
</div>
```
``` js
    var vm = new MVVM({
        el: '#app',
        data: {
            school: {
                name:'ycy',
                age:'25'
            },
            message:'<h1>ycy</h1>'
        },
        computed: {
            getyaochenyang:function(){
                return this.school.name + '-https://yaochenyang.xin'; 
            }
        },
        methods: {
            clickBtn: function(e) {
                this.school.name = "https://github.com/yaochenyang007"
            }
        }
    });

```


效果：
![MVVM](https://yaochenyang.xin/img/mvvm-b.gif "MVVM")
### 1、实现Observer

我们知道可以利用`Obeject.defineProperty()`来监听属性变动
那么将需要observe的数据对象进行递归遍历，包括子属性对象的属性，都加上`setter`和`getter`
这样的话，给这个对象的某个值赋值，就会触发`setter`，那么就能监听到了数据变化。。相关代码可以是这样：
```javascript
class Oberver {   //实现数据劫持
    constructor(data) {
        // //console.log(data)
        this.oberver(data);
    }
    oberver(data) {
        //如果有对象才观察
        if (data && typeof data == 'object') {
            for (let key in data) {
                this.defineReactive(data, key, data[key])
            }
        }
    }
    defineReactive(obj, key, value) {
        this.oberver(value);
        let dep = new Dep();  //给每一个属性 都加上一个具有发布订阅功能

        Object.defineProperty(obj, key, {
            get() {
                //创建watcher 时 会取到对应的内容，并且把watcher 放到了全局上
                Dep.target && dep.addsub(Dep.target)
                return value;
            },
            set: (newVal) => {
                if (newVal === value) {
                    return;
                }
                if (newVal != value) {
                    value = newVal;
                    // 新的值是object的话，进行监听
                    this.oberver(newVal);
                       // 通知订阅者
                    dep.notify();
                }

            }
        })
    }
}
```
这样我们已经可以监听每个数据的变化了，那么监听到变化之后就是怎么通知订阅者了，所以接下来我们需要实现一个消息订阅器，很简单，维护一个数组，用来收集订阅者，数据变动触发notify，再调用订阅者的update方法，代码改善之后是这样：
```javascript
// ... 省略
class Dep {
    constructor() {
        this.subs = [];  // 存放所有的watcher
    }
    //订阅
    addsub(watcher) {  //添加  watcher
        this.subs.push(watcher)
    }
    //发布
    notify() {
        this.subs.forEach(watcher => watcher.updater())
    }
}
```


### 2、实现Compile
compile主要做的事情是解析模板指令，将模板中的变量替换成数据，然后初始化渲染页面视图，并将每个指令对应的节点绑定更新函数，添加监听数据的订阅者，一旦数据有变动，收到通知，更新视图，因为遍历解析的过程有多次操作dom节点，为提高性能和效率，会先将vue实例根节点的`el`转换成文档碎片`fragment`进行解析编译操作，解析完成，再将`fragment`添加回原来的真实dom节点中

```javascript
//编译器
class Compiler {
    constructor(el, vm) {
        //判断el属性是不是元素，不是元素 就获取他
        this.el = this.isElementNode(el) ? el : document.querySelector(el);
        this.vm = vm;
        //console.log(this.el,vm);

        //把当前节点中得文档放在内存中

        let fragment = this.node2fragment(this.el);
        //console.log(fragment)

        //把节点中得内容进行替换

        //编译模板  用数据编译
        this.Compiler(fragment);

        //把内容再塞到页面中
        this.el.appendChild(fragment);

    }
    isElementNode(node) {
        return node.nodeType == 1;
    }
    isDirective(attrName) {
        return attrName.startsWith('v-');

    }
    //编译元素的
    compileElement(node) {
        let attributes = node.attributes;
        // //console.log(attributes);
        [...attributes].forEach(attr => {   // type="text"
            let { name, value: expr } = attr;
            if (this.isDirective(name)) {   //  v-model  v-html v-bind
                //console.log(node)
                let [, directive] = name.split("-");
                //需要调用不同的指令来处理
                let [directiveName, eventName] = directive.split(":");  //v-on:click
                CompileUtil[directiveName](node, expr, this.vm, eventName)

            }
        })
    }
    //编译文本的
    compileText(node) { //判断当前文本节点中内容是否包含 {{}}
        let content = node.textContent;
        //console.log(content)
        if (/\{\{(.+?)\}\}/.test(content)) {  //过滤剩下 {{}}
            //console.log(content);
            //文本节点
            CompileUtil['text'](node, content, this.vm)

        }
    }
    //核心编译方法
    Compiler(node) {  //用来编译内中得dom节点
        let childNodes = node.childNodes;
        //console.log(childNodes);
        [...childNodes].forEach(child => {
            if (this.isElementNode(child)) {
                this.compileElement(child);
                //如果是元素的话，需要把自己传进去，再去遍历子节点
                this.Compiler(child)
            } else {
                this.compileText(child);
            }
        })
    }
    node2fragment(node) {
        //创建一个文档碎片
        let fragment = document.createDocumentFragment();
        let firstChild;
        while (firstChild = node.firstChild) {
            // appendChild具有移动性
            fragment.appendChild(firstChild);
        }
        return fragment;

    }
}
```

compileElement方法将遍历所有节点及其子节点，进行扫描解析编译，调用对应的指令渲染函数进行数据渲染，并调用对应的指令更新函数进行绑定，详看代码及注释说明：

```javascript
CompileUtil = {
    //根据表达式取到对应的值
    getVal(vm, expr) { // vm.$data   'school.name'

        return expr.trim().split('.').reduce((data, current) => {
            //console.log(data,current)
            return data[current];
        }, vm.$data)
    },
    setValue(vm, expr, value) {

        return expr.trim().split('.').reduce((data, current, index, arr) => {
            console.log(arr)
            if (index == arr.length - 1) {
                return data[current] = value
            }

            return data[current]

        }, vm.$data)
    },
    model(node, expr, vm) { //node为节点， expr为表达式，vm是当前实例
        //给输入框赋予value属性  node.value = xxx
        let fn = this.updater['modelUpdater'];
        //console.log(expr)
        new Watcher(vm, expr, (newVal) => {   //给输入框加一个观察者，如果数据更新了会触发此方法，会拿新值给输入框赋值
            fn(node, newVal)
        })
        node.addEventListener('input', (e) => {
            let value = e.target.value;
            console.log(value)
            console.log(this.setValue(vm, expr, value))
            this.setValue(vm, expr, value);
        })
        let value = this.getVal(vm, expr);
        console.log(value)
        fn(node, value)
    },
    html(node, expr, vm) {
        //给输入框赋予value属性  node.value = xxx
        let fn = this.updater['htmlUpdater'];
        new Watcher(vm, expr, (newVal) => {   //给输入框加一个观察者，如果数据更新了会触发此方法，会拿新值给输入框赋值
            fn(node, newVal)
        })

        let value = this.getVal(vm, expr);
        fn(node, value)

    },
    getContentValue(node, expr) {
        //遍历表达式，讲内容重新替换成一个完整内容，返还回去
        return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
            return this.getVal(vm, args[1]);
        })
    },
    on(node, expr, vm, eventName) {
        node.addEventListener(eventName, (e) => {
            // alert("44445");
            vm[expr].call(vm, e);
        })
    },
    //处理文本节点
    text(node, expr, vm) {  // expr => {{school.name}} {{b}}
        //console.log(expr)
        let fn = this.updater['textUpdater'];
        let content = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {

            //给表达式每 {{}} 都加上观察者
            new Watcher(vm, args[1], () => {
                fn(node, this.getContentValue(vm, expr)); // 返回了一个全字符串
            })
            return this.getVal(vm, args[1]);
        })
        // textUpdater
        fn(node, content)
    },
    updater: {
        modelUpdater(node, value) {
            node.value = value;
        },
        htmlUpdater(node, value) {
            node.innerHTML = value;
        },
        textUpdater(node, value) {
            node.textContent = value;
        }
    }
}

```
这里通过递归遍历保证了每个节点及子节点都会解析编译到，包括了{{}}表达式声明的文本节点。指令的声明规定是通过特定前缀的节点属性来标记，
监听数据、绑定更新函数的处理是在`compileUtil.bind()`这个方法中，通过`new Watcher()`添加回调来接收数据变化的通知
[完整代码](https://github.com/yaochenyang007/MVVM/blob/master/js/mvvm.js)。接下来要看看Watcher这个订阅者的具体实现了

### 3、实现Watcher
Watcher订阅者作为Observer和Compile之间通信的桥梁，主要做的事情是:
1、在自身实例化时往属性订阅器(dep)里面添加自己
2、自身必须有一个update()方法
3、待属性变动dep.notice()通知时，能调用自身的update()方法，并触发Compile中绑定的回调，则功成身退。

```javascript
class Watcher {         // 观察者 （发布订阅）
    constructor(vm, expr, cb) {
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;

        //默认存放老值
        this.oldValue = this.get();
    }
    get() {
        Dep.target = this;  //先把自己放在this上
        let value = CompileUtil.getVal(this.vm, this.expr);
        Dep.target = null;   //不取消任何值 取值 ，都会添加watcher
        return value;
    }
    updater() { //更新操作  数据变化后  会调用观察者的update方法
        let newVal = CompileUtil.getVal(this.vm, this.expr);
        if (newVal !== this.oldValue) {
             this.oldValue = newVal;  //新值赋值给老值
            this.cb(newVal)
        }
    }

}
```
实例化`Watcher`的时候，调用`get()`方法，通过`Dep.target = this`标记订阅者是当前watcher实例，强行触发属性定义的`getter`方法，`getter`方法执行的时候，就会在属性的订阅器`dep`添加当前watcher实例，从而在属性值有变化的时候，就能收到更新通知。
~

### 4、实现MVVM
MVVM作为数据绑定的入口，整合Observer、Compile和Watcher三者，通过Observer来监听自己的model数据变化，通过Compile来解析编译模板指令，最终利用Watcher搭起Observer和Compile之间的通信桥梁，达到数据变化 -> 视图更新；视图交互变化(input) -> 数据model变更的双向绑定效果。

一个简单的MVVM构造器是这样子：
```javascript
function MVVM(options) {
    this.$options = options;
    var data = this._data = this.$options.data;
    observe(data, this);
    this.$compile = new Compile(options.el || document.body, this)
}
```

但是这里有个问题，从代码中可看出监听的数据对象是options.data，每次需要更新视图，则必须通过`var vm = new MVVM({data:{name: 'ycy'}}); vm._data.name = 'yyy'; `这样的方式来改变数据。

显然不符合我们一开始的期望，我们所期望的调用方式应该是这样的：
`var vm = new MVVM({data: {name: 'ycy'}}); vm.name = 'yyy';`

所以这里需要给MVVM实例添加一个属性代理的方法，使访问vm的属性代理为访问vm._data的属性，改造后的代码如下：

```javascript
class MVVM {
    constructor(options) {
        //this.$el 

        this.$el = options.el;
        this.$data = options.data;
        let computed = options.computed;
        let methods = options.methods;
        //这个根元素存在  编译模板
        if (this.$el) {

            //把 数据 全部转化成用Object.defineProperty来定义
            new Oberver(this.$data)

            //console.log(computed)
            //console.log(this,this.$data)

            // {{getyaochenyang}} reduce vm.$data.getName
            for (let key in computed) {   //有依赖关系
                Object.defineProperty(this.$data, key, {
                    get: () => {
                        return computed[key].call(this);
                    },
                    set: (newVal) => {


                    }
                })
            }

            for (let key in methods) {
                Object.defineProperty(this, key, {
                    get: () => {
                        return methods[key];
                    },
                    set: (newVal) => {


                    }
                })
            }

            //把数据获取操作 vm上的取值操作 都代理到vm.$data;
            this.proxyVm(this.$data);

            new Compiler(this.$el, this)

        }
    }
    proxyVm(data) {
        //console.log(this)
        for (let key in data) {
            Object.defineProperty(this, key, {  // 去掉了 data （实现了通过vm 取到 vm.data的内容） 
                get() {
                    return data[key]; //进行了  转化操作

                },
                set: (newVal) => {

                    data[key] = newVal
                }
            })
        }
    }
}

```
这里主要还是利用了`Object.defineProperty()`这个方法来劫持了vm实例对象的属性的读写权，使读写vm实例的属性转成读写了`vm._data`的属性值，达到去掉 data的效果



### 总结
本文主要围绕“实现Observer”、“实现Compile”、“实现Watcher”、“实现MVVM”，来实现MVVM原理



## 特别感谢

- [DMQ](https://github.com/DMQ)
