const { ObjectId } = require('mongodb');

const { database } = require('../../../../config/vars');

let db = null;
let connect = null;

exports.configureDatabaseAndConnect = (_db, _connect) => {
  db = _db;
  connect = _connect;
};

const addNewDocument = document =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }
    try {
      db.collection(database.documentCollection)
        .insertOne(document)
        .then(resolve)
        .catch(reject);
    } catch (error) {
      reject();
    }
  });

const getDocumentsToUpdateInES = () =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }
    try {
      db.collection(database.documentCollection)
        .find({ 'attachments.indexed_in_ES': false })
        .toArray()
        .then(resolve)
        .catch(reject);
    } catch (error) {
      reject();
    }
  });

const getDocumentById = mongoId =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }
    try {
      var query = { _id: new ObjectId(mongoId) };
      // console.log('query', query);
      db.collection(database.documentCollection)
        .findOne(query)
        .then(res => {
          // console.log('doc from mongo :', res);
          resolve(res);
        })
        .catch(error => {
          //   console.log("error in fetch doc by id :",error);
          reject(error);
        });
    } catch (error) {
      reject();
    }
  });

const updateDocumentById = (mongoId, newDocument) =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }
    try {
      var query = { _id: new ObjectId(mongoId) };
      var newValues = { $set: newDocument };

      // console.log('query :',query);
      // console.log('newValues :',newValues);

      db.collection(database.documentCollection)
        .updateOne(query, newValues)
        .then(resolve())
        .catch(reject);
    } catch (error) {
      reject();
    }
  });

const markAttachmentAsIndexed = (mongoId, fileUrl, indexed = true) =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }
    try {
      var query = { _id: new ObjectId(mongoId), 'attachments.fileUrl': fileUrl };
      var newValues = { $set: { 'attachments.$.indexed_in_ES': indexed } };

      // console.log('query :',query);
      // console.log('newValues :',newValues);

      db.collection(database.documentCollection)
        .updateOne(query, newValues)
        .then(resolve())
        .catch(reject);
    } catch (error) {
      reject();
    }
  });

const markDocumentToBeIndexedInES = docId =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }

    try {
      let query = { _id: new ObjectId(docId) };
      let operation = {
        $set: {
          'attachments.$[].indexed_in_ES': false,
        },
      };

      db.collection(database.documentCollection)
        .update(query, operation, { multi: true })
        .then(resolve())
        .catch(reject);
    } catch (error) {
      reject();
    }
  });

  const markAttachmentToBeIndexedInES = fileUrl =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }

    try {
      var query = { 'attachments.fileUrl' : fileUrl };
      var operation = { $set:{'attachments.$.indexed_in_ES': false}};

      db.collection(database.documentCollection)
        .update(query, operation)
        .then(resolve())
        .catch(reject);
    } catch (error) {
      reject();
    }
  });

const incrementDownloadCount = (fileUrl) =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }
    try {
      var query = { 'attachments.fileUrl' : fileUrl };
      var operation = { $inc:{'attachments.$.downloadCount':1}};
      db.collection(database.documentCollection)
        .updateOne(query, operation)
        .then(resolve())
        .catch(reject);
    } catch (error) {
      reject();
    }
  });

  const incrementDocumentViewCount = (mongoId) =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }
    try {
      let query = { _id: new ObjectId(mongoId) };
      let operation = { $inc:{'views':1}};
      db.collection(database.documentCollection)
        .updateOne(query, operation)
        .then(resolve())
        .catch(reject);
    } catch (error) {
      reject();
    }
  });

  const getDocumentsForSpecificIds = (idArray) =>new Promise(async(resolve,reject)=>{
    if (!db) {
      await connect();
    }
    try{

      var mongoIds = idArray.map(id => {
        return {
          '_id' : new ObjectId(id)
        };
      })

      var query = { '$or': mongoIds };

      db.collection(database.documentCollection)
        .find(query)
        .toArray()
        .then(resolve())
        .catch(reject);

    }catch(error){
      reject();
    }
  });

  const getAttachmentDetails = (fileUrl) => new Promise(async(resolve,reject)=>{
    if (!db) {
      await connect();
    }

    try{
      let query = {"attachments.fileUrl": fileUrl };
      let projection = {"attachments.$.fileName":1 };

      db.collection(database.documentCollection)
        .findOne(query,{projection})
        .then(response=>{
          // console.log('--mongo repo---',response);
          resolve(response);
        })
        .catch(reject);

    }catch(error){
      reject();
    }

  })

exports.queries = {
  addNewDocument,
  getDocumentById,
  updateDocumentById,
  getDocumentsToUpdateInES,
  markAttachmentAsIndexed,
  markDocumentToBeIndexedInES,
  incrementDownloadCount,
  markAttachmentToBeIndexedInES,
  getDocumentsForSpecificIds,
  incrementDocumentViewCount,
  getAttachmentDetails
};
