const fs = require('fs')
const path = require('path')
const OSS = require('ali-oss')
const globby = require("globby")
const ora = require('ora')
const { toArray, ofType, formatSize } = require('./utils')
const FileDescriptor = require('./file-descriptor')
const slash = require('slash')

const kPluginName = 'WebpacAliyunOsskPlugin'

const kDefaultTimeout = 60000

const kDefaultPublicPath = ''

const kDefaultAssetsSubDirectory = '/static'

// new WebpackAliyunOssPlugin({
//     accessKeyId: 'your access key',
//     accessKeySecret: 'your access key secret',
//     include: '../../dist/static/**',
//     exclude: [/\.html$/],
//     region: 'oss-cn-shenzhen',
//     bucket: 'gdjcywebdata001',
//     publicPath: '/test',
//     assetsSubDirectory: '/static',
//     timeout: 6000
// })
class WebpackAliyunOssPlugin {

    constructor(options = {}) {
        this.store = null
        this.options = options
        this.options.include = toArray(options.include)
    }

    apply(compiler) {
        if (compiler) {
            if (typeof compiler.plugin === 'function') {
                /// v3
                compiler.plugin('after-emit', (compilaton, cb) => {
                    this.run(compilaton, cb)
                })
            } else if (compiler.hooks && compiler.hooks.afterEmit) {
                /// v4
                compiler.hooks.afterEmit.tapAsync(kPluginName, (compilaton, cb) => {
                    this.run(compilaton, cb)
                })
            }
        }
    }

    run(compilaton, cb) {
        this._initOss()
        .then(() => this._collectFiles())
        .then(files => this._uploadFiles(files)) 
        .catch(err => {
            if (compilaton && compilaton.errors) compilaton.errors.push(new Error(`Webpack Aliyun Oss Plugin: ${err.message}`))
            else throw new Error(`Webpack Aliyun Oss Plugin: ${err.message}`)
        })
        .finally(() => {
            typeof cb === 'function' && cb()
        })
    }


    _initOss() {
        try {
            const { accessKeyId, accessKeySecret, bucket, region, timeout = kDefaultTimeout} = this.options 
            if (!accessKeyId) throw new Error('\'accessKeyId\' option is required.')
            if (!accessKeySecret) throw new Error('\'accessKeySecret\' option is required.')
            if (!bucket) throw new Error('\'bucket\' option is required.')
            if (!region) throw new Error('\'region\' option is required.')
            this.store = OSS({
                accessKeyId,
                accessKeySecret,
                bucket: bucket,
                region: region,
                secure: true,
                timeout
            })
            return Promise.resolve(this.store)
        } catch(e) {
            return Promise.reject(e)
        } 
    }

    async _collectFiles() {
        const { include, exclude, publicPath = kDefaultPublicPath,  bucket, region } = this.options
        let { assetsSubDirectory = kDefaultAssetsSubDirectory } = this.options
        if (!assetsSubDirectory.endsWith('/')) {
            assetsSubDirectory = assetsSubDirectory + '/.*'
        } else {
            assetsSubDirectory += '.*'
        }
        if (!include) {
            return Promise.reject(new Error('\'include\' option is required.'))
        }
        const targets = []
        for (let i = 0; i < include.length; ++i) {
            let exp = include[i]
            let files = await globby(exp)
            files.forEach(file => {
                if (exclude && file) {
                    if (ofType(exclude) === '[object RegExp]') {
                      if (exclude.test(file)) return
                    } else if (ofType(exclude) === '[object Array]') {
                      for (var i = 0; i < exclude.length; i++) {
                        if (exclude[i].test(file)) return
                      }
                    }
                }
                let matcher = file.match(new RegExp(assetsSubDirectory))
                if (matcher) {
                    let dest = matcher[0]
                    dest = slash(path.join(publicPath, dest))
                    targets.push(new FileDescriptor({
                        src: file,
                        dest,
                        size: fs.statSync(file).size
                    }))
                }
            })
        }
        targets.forEach(target => {
            console.log(`${target.src} => https://${bucket}.${region}.aliyuncs.com${target.dest}`)
        })
        return Promise.resolve(targets)
    }

    async _uploadFiles(files) {
        if (files.length === 0) return Promise.resolve(true)
        let totalSize = files.reduce((t, c) => t + c.size, 0)
        let current = 0
        const progress = ora(`uploading => 0.00% ${formatSize(0)}/${formatSize(totalSize)}`).start()
        for (let i = 0; i < files.length; ++i) {
            const file = files[i]
            try {
                await this.store.put(file.dest, file.src)
                current += file.size
                progress.text = `uploading => ${((current / totalSize) * 100).toFixed(2)}% ${formatSize(current)}/${formatSize(totalSize)} `
            } catch (err) {
                progress.fail(`upload ${file.src} failed：${err.message}`)
                throw new Error(`upload ${file.src} failed：${err.message}`)
            }
        }
        progress.succeed('all files have been uploaded successfully.')
        return Promise.resolve(true)
    }

}

module.exports = WebpackAliyunOssPlugin
