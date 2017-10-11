//事件管理器
class Event {
    //static方法只可在类上调用，不可在实例上调用
    static on(type, handler) {
        return document.addEventListener(type, handler)
    }
    static trigger(type, data) {
        //dispatchEvent为触发事件的方法
        return document.dispatchEvent(new CustomEvent(type, {
            detail: data
        }))
    }
}

//应用交互模块
 class Interaction {
    constructor(node) {
        this.$searchInput = node
        this.bind()
    }
    //事件绑定
    bind() {
        this.$searchInput.addEventListener('keyup',(event) =>{
            if(event.keyCode === 13){
                Event.trigger('search', this.$searchInput.value)
            }
        })
        document.body.onresize = this.throttle(() => Event.trigger('resize'), 300)
        document.body.onscroll = this.throttle(() => {
            if (Interaction.isToBottom()) {
                Event.trigger('bottom')
            }
            goTopBtn.showOrNot()
        },300)
    }
    //节流函数
    throttle(fn, delay) {
        let timer = null
        return () => {
            clearTimeout(timer)
            timer = setTimeout(() => fn.bind(this)(arguments), delay)
        }
    }
    //判断滚轮是否触底
    static isToBottom() {
        return document.body.scrollHeight - document.body.scrollTop - document.documentElement.clientHeight < 5
    }
}
new Interaction(document.querySelector('#search-input'))

//加载数据模块
class Loader{
    constructor(){
        this.page = 1
        this.per_page = 30
        this.keyword = ''
        this.total_hits = 0
        this.url = '//pixabay.com/api/'

        this.bind()
    }
    bind(){
        //绑定search事件
        Event.on('search',e =>{
            this.page = 1
            this.keyword = e.detail
            this.loadData()//返回promise对象
                .then(data => {
                    console.log(this)
                    this.total_hits = data.total_hits
                    Event.trigger('load_first',data)
                })
                .catch(err => console.log(err))
        })
        //绑定bottom事件
        Event.on('bottom', e => {
            if(this.loading) return
            if(this.page * this.per_page > this.total_hits) {
                Event.trigger('load_over')
                return
            }
            this.loading = true
            ++this.page
            this.loadData()
                .then(data => Event.trigger('load_more', data))
                .catch(err => console.log(err))
        })
    }
    //发送请求获取数据
    loadData() {
        return fetch(Loader.fullUrl(this.url, {
            key: '6686191-f6fcb6160196c2d75e4019447',
            q: this.keyword,
            image_type: 'photo',
            per_page: this.per_page,
            page: this.page
        }))
            .then((res) => {
                this.loading = false
                return res.json()
            })
    }
    //拼接url
    static fullUrl(url, json) {
        let arr = []
        for (let key in json) {
            arr.push(encodeURIComponent(key) + '=' + encodeURIComponent(json[key]))
        }
        return url + '?' + arr.join('&')
    }
}
new Loader()

//木桶布局模块
class Barrel{
    constructor(node){
        this.$node = node
        this.picHeightBase = 200
        this.rowTotalWidth = 0
        this.rowList = []
        this.allImgInfo = []

        this.bind()
    }
    bind() {
        Event.on('load_first', e => {
            this.$node.innerHTML = ''
            this.rowList = []
            this.rowTotalWidth = 0
            this.allImgInfo = [...e.detail.hits]

            this.render(e.detail.hits)
        })

        Event.on('load_more', e => {
            console.log('load_more')
            this.allImgInfo.push(...e.detail.hits)
            this.render(e.detail.hits)
        })

        Event.on('load_over', e => {
            this.layout(this.rowList, this.picHeightBase)
        })

        Event.on('resize', e => {
            this.$node.innerHTML = ''
            this.rowList = []
            this.rowTotalWidth = 0
            this.render(this.allImgInfo)
        })
    }
    //遍历图片、设置图片宽高
    render(data) {
        if(!data) return
        let mainNodeWidth = parseFloat(getComputedStyle(this.$node).width) - 20
        data.forEach(imgInfo => {
            imgInfo.ratio = imgInfo.webformatWidth / imgInfo.webformatHeight
            imgInfo.imgWidthAfter = imgInfo.ratio * this.picHeightBase

            if (this.rowTotalWidth + imgInfo.imgWidthAfter <= mainNodeWidth) {
                this.rowList.push(imgInfo)
                this.rowTotalWidth += imgInfo.imgWidthAfter
            } else {
                let rowHeight = (mainNodeWidth / this.rowTotalWidth) * this.picHeightBase
                this.layout(this.rowList, rowHeight)
                this.rowList = [imgInfo]
                this.rowTotalWidth = imgInfo.imgWidthAfter
            }
        })
    }

    //把一行图片放入页面
    layout(row, rowHeight) {
        row.forEach(imgInfo => {
            var figureNode = document.createElement('figure')
            var imgNode = document.createElement('img')
            imgNode.src = imgInfo.webformatURL
            figureNode.appendChild(imgNode)
            figureNode.style.height = rowHeight + 'px'
            figureNode.style.width = rowHeight * imgInfo.ratio  + 'px'
            this.$node.appendChild(figureNode)
        })

    }
}
new Barrel(document.querySelector('main'))

class Gotop{
    constructor(node){
        this.$node = node
        this.showOrNot()
    }
    showOrNot(){
        if(window.scrollY > 0)this.$node.classList.remove('hide')
        else this.$node.classList.add('hide')
    }
}
var goTopBtn = new Gotop(document.querySelector('#go-top'))
