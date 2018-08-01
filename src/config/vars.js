const path = require('path');

// import .env variables
require('dotenv-safe').load({
  path: path.join(__dirname, '../../.env'),
});

module.exports = {
  env: process.env.NODE_ENV,
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 3000,
  database: {
    uri: process.env.DB_URI,
    database: process.env.DB_DB_NAME,
    userCollection: process.env.DB_USER_COLLECTION,
    documentCollection: process.env.DB_DOCUMENT_COLLECTION,
  },
  indexing: {
    batchSize: 10, // Number of documents to be processed in a batch.
    timeout: 60 * 1000, //Numner of milliseconds in after which the indexing should happen
  },
  elasticSearch:{
    host:'http://localhost:9200',
    documentIndex:'document',
  }
};
