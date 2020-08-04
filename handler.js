const { ApolloServer, gql } = require('apollo-server-lambda');
const AWS = require('aws-sdk');
var fs = require("fs");
var mime = require('mime-types');
const s3 = new AWS.S3({
  accessKeyId: process.env.SAMPLE_ID,
  secretAccessKey: process.env.SAMPLE_KEY
});
const typeDefs = gql`
  type File {
    filename: String!
    mimetype: String!
    encoding: String!
  }

  type Query {
    uploads: [File]
  }

  type Mutation {
    singleUpload(file: Upload!): File!
  }
`;

const resolvers = {
  Query: {
    uploads: (parent, args) => { },
  },
  Mutation: {
    singleUpload: (parent, args) => {
      return args.file.then(file => {
        if (isValidFile(file.filename) != true) {
          throw "Not a valid file";
        }

        var path = "/tmp/" + file.filename;
       return saveFileLocally(file, path).then(function (data) {
        const fileContent = fs.readFileSync(path);
        console.log(mime.lookup(path));
        var stats = fs.statSync(path)
        var fileSizeInBytes = stats["size"]
        console.log(fileSizeInBytes);
        const params = {
          Bucket: process.env.BUCKET,
          Key: file.filename,
          Body: fileContent,
          ContentType: file.mimetype,
          ContentEncoding: file.encoding
        };
        return uploadFileToS3(params, file);
      }).catch(function (err) {
      console.log("error");
      console.log(err);
      throw err;
    });
  })
}
}};

function isValidFile(filename) {
  console.log("Checking extension");
  var subnames = filename.split(".");
  console.log(subnames.length)
  if (subnames.length >= 2) {
    var extension = subnames[subnames.length - 1].toLowerCase()
    console.log(extension);
    if (extension == 'jpg' || extension == 'jpeg') {
      return true
    }
  }
  return false
}

function saveFileLocally(file, path) {
        var writeStream = fs.createWriteStream(path);
        var readStream = file.createReadStream();
        readStream.pipe(writeStream);
        return new Promise(function(resolve, reject) {
          readStream.on('end', () => {
            resolve();
          })
        })
}

function uploadFileToS3(params, file) {
  console.log("Going to upload");
  const s3upload = s3.upload(params, null).promise();
  return s3upload
    .then(function (data) {
      console.log(`File uploaded successfully at ${data.Location}`)
      return file;
    })
    .catch(function (err) {
      console.log("error");
      console.log(err);
      throw err;
    });
}

const server = new ApolloServer({ typeDefs, resolvers });
exports.graphqlHandler = server.createHandler();