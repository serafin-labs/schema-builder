var gulp = require('gulp');
var gulpTasks = require('@serafin/gulp-tasks');

gulp.task('default', ['dev']);
gulp.task('dev', ['watch', 'watch-build-done', 'test']);
gulp.task('watch', ['watch-typescript']);
gulp.task('build', ['build-typescript']);
gulp.task('build-done', ['test']);

gulpTasks.typescript(gulp, __dirname + '/src', __dirname + '/src/tsconfig.json', __dirname + '/lib', __dirname + '/lib');
gulpTasks.utils(gulp, __dirname + '/lib');
gulpTasks.runner(gulp, null, __dirname + '/lib/build.txt', __dirname + '/lib/pid', true);
gulpTasks.test(gulp, __dirname + '/lib/**/test/*.js', __dirname + '/lib/coverage');