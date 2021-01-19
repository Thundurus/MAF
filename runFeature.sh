#Runs one feature file and opens a Web page displaying the test report. Example: ./runFeature.sh S3.feature
mkdir -p ./test/report
node node_modules/cucumber/bin/cucumber-js -f json:test/report/cucumber_report.json --require "packages/$*/features/**/*.js" packages/$*/features
result=$?
node multiReport.js
exit $result
