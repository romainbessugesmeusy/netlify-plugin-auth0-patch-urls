const plugin = require('./index');

plugin.onPreBuild({
    utils: {
        build: {
            failPlugin(){
                console.error('Failed plugin')
            }
        }
    }
})