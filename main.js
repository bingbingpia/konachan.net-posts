const express = require('express');
const http = require('http');
const cheerio = require('cheerio');
const fs = require('fs');
const app = express();

// 请求参数设定
var setRequestParam = function (options) {
    // 入参 基本信息
    if (options.method.toUpperCase() == 'GET') {
        let params = [];
        options.path = options.path.split('?')[0];
        for (let pa in options.data) {
            params.push(pa + '=' + options.data[pa]);
        }
        options.path += '?' + params.join('&');
    }
    runRequestFun(options);
};

// 发送请求函数
var runRequestFun = function (options) {
    // 建立请求
    let data = options.data;
    delete options.data;
    let req = http.request(options, function (res) {
        // 返回数据需要拼接
        let contentTxt = '';
        switch (options.resType) {
            case 'img':
                res.setEncoding("binary");
                break;
            default:
                res.setEncoding('utf8');
                break;
        }
        res.on('data', (chunk) => {
            // 返回数据拼接
            contentTxt += chunk;
        });
        res.on('end', () => {
            responseRoute(contentTxt, options);
            contentTxt = '';
        });
    });
    options.data = data;
    req.on('error', (e) => {
        console.error(`请求遇到问题: ${e.message}`);
    });
    if (options.method.toUpperCase() == 'POST') {
        req.write(JSON.stringify(options.data));
    };
    req.end();
};

// 请求返回响应的处理
var responseRoute = function (text, options) {
    switch (options.resType) {
        case 'list':
            listFormat(text, options);
            break;
        case 'img':
            imgFormat(text, options);
            break;
        default: break;
    }
};

// 文件目录创建对应
var mkdirFun = function (path) {
    let disArr = path.split('/');
    for (let t = 0; t < disArr.length - 1; t++) {
        let index = path.indexOf(disArr[t]);
        let mk = `${path.substring(0, index)}${disArr[t]}`;
        if (disArr[t] && !fs.existsSync(mk)) {
            fs.mkdirSync(`./${mk}`);
        }
    }
}

// 处理图片数据
var imgFormat = function (imgData, options) {
    // 通过文件流操作保存图片
    var path = options.path.split('?')[0];
    mkdirFun(`public${path}`); // 校验文件夹
    fs.writeFile(`./public${path}`, imgData, 'binary', (error) => {
        if (error) {
            console.log('下载失败');
        } else {
            console.log('下载成功！')
        }
    });
};

// 处理列表数据
var listFormat = function (text, options) {
    let list = [];
    let $ = cheerio.load(text);
    $('#post-list-posts li a.thumb').each(function (index, item) {
        list.push({
            thumb: item.attribs.href,
            img: item.firstChild.attribs.src
        });
        // 获取图片
        let konachanImgData = {
            hostname: 'konachan.net',
            port: 80,
            path: item.firstChild.attribs.src.split('konachan.net')[1],
            method: 'GET',
            resType: 'img',
            data: {}
        };
        setRequestParam(konachanImgData);
    });
    if (!fs.existsSync('./public/page')) {
        fs.mkdirSync('./public/page');
    }
    fs.writeFile(`./public/page/${options.data.page}.json`, JSON.stringify({
        list: list,
        page: options.data.page
    }), 'utf8', error => {
        if (error) {
            console.log('保存失败');
        } else {
            options.data.page += 1;
            if (options.data.page < 11) {
                setRequestParam(options);
            }
        }
    });
};

// konachan.net(post/show)
var konachanPostShow = function () {

}

// konachan.net(/post)  resType: 返回后处理类型
var konachanData = {
    hostname: 'konachan.net',
    port: 80,
    path: '/post',
    method: 'GET',
    resType: 'list',
    data: {
        page: 1,
        tags: ''
    }
};

// all get
app.get('/', function (req, res) {
    res.send('Hello World!');
});
// listen
app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
    setRequestParam(konachanData);
});