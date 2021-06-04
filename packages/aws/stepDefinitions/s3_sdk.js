const fs = require('fs')
const pa = require("path")
const { getFilePath } = require('@ln-maf/core')
const { S3Client, CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, ListBucketsCommand, ListObjectsCommand, PutObjectCommand } = require("@aws-sdk/client-s3")
const ports = require('../awsPortMap')
const getHost = () => { return 'localhost'; }
const service = 's3'

const port = ports[service]
let url = `http://${getHost()}`
if (process.env.USEPORTMAP) { url += `:${port}` }
const s3 = new S3Client({ endpoint: url })

/**
 * Cleans the directory path for a bucket on S3
 * @param {string} path A directory path
 */
function buildPath(path) {
    if (!path) {
        return ''
    }
    return path + (path.charAt(path.length - 1) === '/' ? '' : '/')
}

/**
 * Returns true if the bucket exists on S3
 * @param {string} bucketName The name of the bucket
 * @returns {boolean} true if the bucket exists on S3
 */
async function bucketExists(bucketName) {
    try {
        const data = await s3.send(new ListBucketsCommand({}))
        return data.Buckets.some(bucket => bucket.Name === bucketName.toLowerCase())
    } catch (err) {
        throw ("Error", err)
    }
}

/**
 * Lists the files on the specified S3 bucket path
 * @param {string} bucketName The name of the bucket
 * @param {string} path The logical path to check on the bucket
 * @param {boolean} json Whether or not to include additional metadata for each file (i.e. size and date modified)
 * @returns {Array} file array from the specified logical directory on the bucket
 * Note that only the first 1000 files for the bucket can be retrieved this way.
 */
async function listBucketFiles(bucketName, path, json = false) {
    const bucketParams = { Bucket: bucketName };
    try {
        const data = await s3.send(new ListObjectsCommand(bucketParams))
        if (path === null) {
            return data.Contents.map(file => {
                const fullPath = file.Key.split('/')
                if (json) return { name: fullPath[fullPath.length - 1], size: file.Size, date: file.LastModified }
                else return fullPath[fullPath.length - 1]
            })
        } else path = buildPath(path)
        return data.Contents.filter(file => 
            file.Key.startsWith(path) && file.Key.substring(path.length).split('/').length == 1
        ).map(file => {
            if(json) return { name: file.Key.substring(path.length), size: file.Size, date: file.LastModified }
            else return file.Key.substring(path.length)
        })
    } catch (err) {
        throw ("Error", err)
    }
}

/**
 * Downloads a file from an S3 bucket
 * @param {string} file path to local file including the file name
 * @param {string} bucket the name of the bucket containing the specified file
 * @param {string} path the remote directory on the bucket containing the file
 */
async function downloadFile(file, bucket, path) {
    path = buildPath(path)

    const downloadParams = { Bucket: bucket, Key: path + file }

    try {
        const streamToString = (stream) =>
            new Promise((resolve, reject) => {
                const chunks = [];
                stream.on("data", (chunk) => chunks.push(chunk));
                stream.on("error", reject);
                stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
            });
        const data = await s3.send(new GetObjectCommand(downloadParams))
        const bodyContents = await streamToString(data.Body)
        fs.writeFile(file, bodyContents, { encoding: 'utf8' }, (err) => {
            if (err) throw (err)
        })
    } catch (err) {
        throw ("Error", err)
    }
}

/**
 * Creates a new bucket on S3
 * @param {string} bucketName the name of the new bucket
 * @returns {Object} An object containing details of creating the new bucket
 */
async function createBucket(bucketName) {
    const exists = await bucketExists(bucketName)
    if (exists === true) {
        const error = 'A bucket named ' + bucketName + ' already exists on S3'
        throw (error)
    }

    if (exists !== false) {
        throw (exists)
    }

    const bucketParams = { Bucket: bucketName };
    try {
        const data = await s3.send(new CreateBucketCommand(bucketParams))
        return data;
    } catch (err) {
        throw ("Error", err);
    }
}

/**
 * Uploads a file to an S3 bucket
 * @param {string} file path to local file including the file name
 * @param {string} bucket the name of the destination bucket
 * @param {string} path the remote destination directory on the bucket
 * @returns submission data
 */
async function uploadFile(file, bucket, path) {
    if (path === null) path = ''
    const filePath = getFilePath(file, this)
    const fileStream = fs.createReadStream(filePath)

    const uploadParams = { Bucket: bucket, Key: buildPath(path) + pa.basename(file), Body: fileStream }

    try {
        const data = await s3.send(new PutObjectCommand(uploadParams))
        return data
    } catch (err) {
        throw ("Current Directory: " + process.cwd() + "\nError", err)
    }
}

/**
 * Deletes a file from an S3 bucket
 * @param {string} file file name
 * @param {string} bucket the name of the bucket containing the specified file
 * @param {string} path the remote directory on the bucket containing the file
 */
 async function deleteFile(file, bucket, path) {
    path = buildPath(path)

    const deleteParams = { Bucket: bucket, Key: path + file }

    try {
        await s3.send(new DeleteObjectCommand(deleteParams))
    } catch (err) {
        throw ("Error", err)
    }
}

module.exports = { bucketExists, createBucket, deleteFile, downloadFile, listBucketFiles, uploadFile }