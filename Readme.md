# MVVM
<!-- [![NPM version](https://img.shields.io/npm/v/buejs.svg)](https://npmjs.org/package/buejs) -->
> 自己写的`MVVM`框架, [Demo](https://github.com/yaochenyang007/MVVM)
## 注意：此项目仅供学习使用。

## Todos
 - [x] 事件绑定
 - [x] 双向绑定
 - [x] 计算属性
 - [x] 事件绑定
 - [x] ES6语法
 - [x] 正则表达式
 - [x] Object.defineProperty数据劫持


<!-- ## 安装
 - 使用 npm
``` bash
npm i buejs
``` -->
 - 在浏览器中
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
![img1][img1]



[img1]: ./img/mvvm.gif