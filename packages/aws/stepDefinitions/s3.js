const { Given, When, Then } = require('@cucumber/cucumber')
const fs = require('fs')
const assert = require('chai').assert
const runAWS = require('../awsL')
const { getFilePath, MAFWhen, filltemplate } = require('@ln-maf/core')
const fillTemplate = filltemplate
const { bucketExists, createBucket, deleteFile, downloadFile, listBucketFiles, uploadFile } = require('./s3_sdk')
/**
 * Returns the value of the variable if it exists in this.results.
 * @param {string} variable the variable to check
 * @returns {Object} the value of the variable if it exists in this.results. Returns the variable
 * itself if variable does not contain "${}"
 */
function getVal (variable, scenario) {
  if (!scenario.results) {
    scenario.results = {}
  }
  return fillTemplate(variable, scenario.results)
}

/**
 * Creates an S3 URL for aws-cli
 * @param {string} bucket the name of the bucket
 * @param {string} path The directory path of the S3 bucket
 */
function s3URL (bucket, path) {
  return 's3://' + bucket + '/' + buildPath(path)
}

/**
 * Cleans the directory path for a bucket on S3
 * @param {string} path A directory path
 */
function buildPath (path) {
  if (!path) {
    return ''
  }
  return path + (path.charAt(path.length - 1) === '/' ? '' : '/')
}

Given('bucket {string} exists on S3', async function (bucketName) {
  bucketName = getVal(bucketName, this)
  const exists = await bucketExists(bucketName)
  if (!exists) {
    throw new Error('Bucket ' + bucketName + ' does not exist on S3')
  }
})

Given('bucket {string} is not on S3', async function (bucketName) {
  bucketName = getVal(bucketName, this)
  const exists = await bucketExists(bucketName)
  if (exists) {
    throw new Error('Bucket ' + bucketName + ' does exist on S3')
  }
})

Then('bucket {string} exists', async function (bucketName) {
  bucketName = getVal(bucketName, this)
  const exists = await bucketExists(bucketName)
  assert(exists, 'The bucket does not exist on S3')
})

MAFWhen('file list of bucket {string} on path {string} is retrieved', function (bucketName, path) {
  bucketName = getVal(bucketName, this)
  path = getVal(path, this)
  return listBucketFiles.call(this, bucketName, path, false)
})

MAFWhen('file list of bucket {string} on path {string} is retrieved as json item', function (bucketName, path) {
  bucketName = getVal(bucketName, this)
  path = getVal(path, this)
  return listBucketFiles.call(this, bucketName, path, true)
})

MAFWhen('all files of bucket {string} is retrieved', function (bucketName) {
  bucketName = getVal(bucketName, this)
  return listBucketFiles.call(this, bucketName, null, false)
})

MAFWhen('all files of bucket {string} is retrieved as json item', function (bucketName) {
  bucketName = getVal(bucketName, this)
  return listBucketFiles.call(this, bucketName, null, true)
})

Then('file exists with name {string} at path {string} in bucket {string}', async function (fileName, path, bucketName) {
  fileName = getVal(fileName, this)
  bucketName = getVal(bucketName, this)
  path = getVal(path, this)
  const files = await listBucketFiles.call(this, bucketName, path, false)
  assert(files.some(file => file === fileName), 'The file does not exist in ' + bucketName + ' at path ' + path)
})

When('file {string} is uploaded to bucket {string} at path {string}', async function (file, bucket, path) {
  file = getVal(file, this)
  bucket = getVal(bucket, this)
  path = getVal(path, this)
  this.results.lastRun = await uploadFile.call(this, file, bucket, path)
})

When('file {string} is deleted from bucket {string} at path {string}', async function (fileName, bucketName, path) {
  fileName = getVal(fileName, this)
  bucketName = getVal(bucketName, this)
  path = getVal(path, this)
  await deleteFile.call(this, fileName, bucketName, path)
  const res = await listBucketFiles.call(this, bucketName, path, false)
  if (!this.results) {
    this.results = {}
  }
  this.results.lastRun = res
})

When('file {string} from bucket {string} at path {string} is retrieved', async function (fileName, bucketName, path) {
  fileName = getVal(fileName, this)
  bucketName = getVal(bucketName, this)
  path = getVal(path, this)
  await downloadFile.call(this, fileName, bucketName, path)
  const filePath = getFilePath(fileName, this)
  const fileContents = fs.readFileSync(filePath, 'utf8')
  if (!this.results) {
    this.results = {}
  }
  this.results.lastRun = fileContents
  this.attach(JSON.stringify({ lastRun: this.results.lastRun }, null, 2))
})

/**
 * This step definition should only be used for testing
 * This will create a new bucket on S3
 */
Given('bucket {string} is created on S3', async function (bucketName) {
  bucketName = getVal(bucketName, this)
  await createBucket(bucketName)
})

/**
 * This will create a test file for testing purposes.
 */
When('test file {string} is created', async function (fileName) {
  fileName = getVal(fileName, this)
  const filePath = getFilePath(fileName, this)
  fs.writeFileSync(filePath, 'this is a test file', function (err) {
    if (err) throw err
  })
})
