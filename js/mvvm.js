// 观察器
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
// vm.$watch(vm,'school.name',(newVal)=>{
//         console.log(newVal)
// })

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

