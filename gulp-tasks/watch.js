const gulp = require("gulp");
const browserSync = require('browser-sync');
const {bundle} = require("./bundle");

function reload() {
    browserSync.reload();
}

function watch() {
    browserSync.create();

    browserSync.init({
        server: './dist/benchmark'
    });

    gulp.watch('/src/lib/scripts/**/*', gulp.series(bundle, reload));
}

module.exports = {watch}