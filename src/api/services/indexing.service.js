const constants = require('../../config/vars');
const logger = require('../utils/logger');
const path = require('path');

const ElasticService = require('./elastic.service');
const { getDocumentsToUpdateInES, markAttachmentAsIndexed } = require('../repository');

const Indexing = function Indexing() {
  _queue = [];
  //   _pending = [];
  _isQueueBeingProcessed = false;

  this.init = async () => {
    console.log('init indexing service');

    // fetch all documents from mongo which are not yet indexed completely in ES
    // check for isIndexedInES: false

    try {
      const response = await getDocumentsToUpdateInES();
      console.log('---response from getDocumentsto Update in ES : ----',response);
      console.log('----------------------------------------');
      response.forEach(document => {
           console.log(document);
           console.log('----------------------------------------');
        document.attachments.forEach(file => {
          const fileDocument = {
            file,
            body: {
              title: document.title,
              authorId: document.authorId,
              authorName: document.authorName,
              description: document.description,
              searchTags: document.searchTags,
              category: document.category,  
              mongoId: document._id,
              originalFileName: file.fileName,
              claps: document.claps,
              downloadCount: file.downloadCount,
              views: document.views
            },
          };

          _queue.push(fileDocument);
        });
      });

      // console.log("documents to be indexed :",_queue);
    } catch (error) {
      console.log('error fetching documents from mongo to be indexed in elastic');
    }
  };

  // A document is 'attchment' + 'req.body'
  // This will called for the number of attachments
//   this.addDocumentToIndex = document => {
//     _queue.push(document);
//   };

  const processDocumentQueue = async () => {
    await this.init();

    if (_isQueueBeingProcessed) {
      logger.info('Indexing queue is already being process, skipping queue processing.');
      return;
    }

    //check if any pending documents to index
    // if (_pending.length > 0) {
    //   _queue = _queue.concat(_pending);
    //   _pending = [];
    // }

    if (_queue.length === 0) {
      logger.info('No documents to be indexed');
      return;
    }
    _isQueueBeingProcessed = true;

    logger.info(`Starting the indexing of the documents. Queue has ${_queue.length} documents.`);
    while (_queue.length !== 0) {
      const aDocumentToIndex = _queue.shift();
      // console.log(aDocumentToIndex);
      const docId = path.basename(aDocumentToIndex.file.fileUrl);
      const docBody = aDocumentToIndex.body;
      // console.log('indexing :', docId);
      // Index in elastic
      let result = await ElasticService.addDataToDocument(docId, docBody);
      // console.log('received from  ES service:', result);
      if (!result) {
        // add to queue again to check next time
        // _pending.push(aDocumentToIndex);
        console.log('received false .. so not updating status in mongo');
      } else {
        try {
          await markAttachmentAsIndexed(docBody.mongoId , aDocumentToIndex.file.fileUrl , true);
        } catch (error) {
          console.log('error updating indexed_in_ES for',docBody.mongoId);
        }
      }
    }
    logger.info(`Indexing finished.`);
    _isQueueBeingProcessed = false;
  };

  _timer = setInterval(processDocumentQueue, constants.indexing.timeout);
};

module.exports = new Indexing();
