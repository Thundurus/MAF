npx preprocessor packages/$1 --packageLocation test
cd packages/$1
shift
node ../../node_modules/@cucumber/cucumber/bin/cucumber-js -f json:../../test/report/report.json cucumber-js $* --require "test/**/*.js" tmp/test
result=$?
cd -
npx multiReport
exit $result
