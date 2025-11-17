const {src, dest, series, parallel} = require('gulp');
const del = require('del');
const { bundle } = require("./gulp-tasks/bundle");
const {watch} = require("./gulp-tasks/watch");

function cleanDistFolder() {
    return del('dist', {force: true});
}

function cleanNodeModules() {
    return del('node_modules', {force: true});
}

function cleanPackageLock() {
    return del('yarn-lock.json', {force: true});
}

function copyExampleFolder() {
    return src('./src/benchmark/**/*').pipe(dest('./dist/benchmark'));
}

function copyLibFileToExample() {
    return src('./dist/library/esm/spcd3.js').pipe(dest('./dist/benchmark/lib/'));
}

exports.clean = cleanDistFolder;

exports.cleanAll = parallel(cleanDistFolder, cleanNodeModules, cleanPackageLock);

exports.build = series(cleanDistFolder, copyExampleFolder, bundle, copyLibFileToExample);

exports.serve = series(exports.build, watch);