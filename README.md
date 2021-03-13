# webpack-aliyun-oss-plugin
webpack上传阿里云oss插件，能够在文件输出到output.path之后自动将静态资源发布到阿里云

注意：这个插件应该在生产环境使用

## 安装

```bash
npm install @msidolphin/webpack-aliyun-oss-plugin --save-dev
```

## 使用

```js
const WebpackAliyunOssPlugin = require('@msidolphin/webpack-aliyun-oss-plugin')

module.exports = {
    /// ...
    plugins: [
        new WebpackAliyunOssPlugin({
            accessKeyId: 'your access key',
            accessKeySecret: 'your access key secret',
            /// 应该包含的文件
            include: './dist/static/**',
            /// 需要剔除的文件
            exclude: [/\.html$/],
            region: 'your region',
            bucket: 'you bucket',
            /// 阿里云oss发布路径
            /// 最终文件的访问地址为：https://[bucket].[region].aliyuncs.com/www/[file]
            publicPath: '/www',
            /// 静态资源路径 默认/static
            assetsSubDirectory: '/static',
            /// 文件上传超时时间 单位ms 默认60000
            timeout: 60000
        }),
        /// ...
    ]
    /// ...
}
```
