const { ApolloServer, gql } = require('apollo-server-lambda');
const AWS = require('aws-sdk');

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
        const params = {
          Bucket: process.env.BUCKET,
          Key: file.filename,
          Body: file.createReadStream(),
          ContentType: file.mimetype,
          ContentEncoding: file.encoding
        };
        return uploadFileToS3(params, file);
      });
  }
}
};

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