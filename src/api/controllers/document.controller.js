const fs = require('fs');
const pathModule = require('path');
const httpStatus = require('http-status');
const mime = require('mime');
const excelToJson = require('convert-excel-to-json');
var shortid = require('shortid');
// const fileType = require('file-type');

const {
  addNewDocument,
  getDocumentById,
  updateDocumentById,
  getUserById,
  markDocumentToBeIndexedInES,
  incrementDownloadCount,
  markAttachmentToBeIndexedInES,
  incrementDocumentViewCount,
  getAttachmentDetails,
} = require('../repository');

const { addDocument } = require('./documentUtilities/document.add');

const IndexingService = require('../services/indexing.service');
const ElasticService = require('../services/elastic.service');

// Asyncronously start indexing service
(async () => {
  try {
    await IndexingService.processDocumentQueue();
  } catch (error) {
    // logger.error(error);
    console.log('unable to start indexing service ');
  }
})();

// to get documents following search query
exports.get = async ctx => {
  const { query, size, offset } = ctx.query;
  let next = false;
  try {
    var rawResponse = await ElasticService.getDocuments(query, size, offset);
    // response is an array of separate documents stored in ElasticSearch
    // We need to merge the documents who have same mongoId

    const totalDocuments = rawResponse.total;
    let newOffset = 0;
    // console.log(totalDocuments);
    let _size = parseInt(size);
    let _offset = parseInt(offset);

    if (_size + _offset + 1 <= totalDocuments) {
      next = true;
      newOffset = _size + _offset;
    }

    const response = rawResponse.hits;
    var output = [];
    // let mongoIdArray = []; // to hold all the distinct mongoId
    let sendBack = {};

    console.log('response length', response.length);

    if (response.length > 0) {
      // TODO: Look for some good way of doing it. current is O(n2)
      response.forEach(document => {
        // check if mongoId is present in mongoIdArray
        // if not then add else get that object and just update the attachments field with
        // current document's file data
        let actualDocument = document._source;

        // document has user_defined_data -> document has been completely indexed.
        // if (actualDocument.user_defined_data) {
        //   // if (mongoIdArray.includes(actualDocument.user_defined_data.mongoId)) {
        //   //   // id is already present in mongoIdArray
        //   //   // get the object with that mongoId

        //   //   output.forEach(document => {
        //   //     if (document.id === actualDocument.user_defined_data.mongoId) {
        //   //       // this is our target document
        //   //       document.attachments.push({
        //   //         fileName: actualDocument.user_defined_data.originalFileName,
        //   //         extension: actualDocument.file.extension,
        //   //         fileUrl: actualDocument.file.filename,
        //   //         downloadCount: actualDocument.user_defined_data.downloadCount
        //   //       });
        //   //     }
        //   //   });

        //   } else {
        //     // id not present in mongoIdArray
        //     mongoIdArray.push(actualDocument.user_defined_data.mongoId);
        //     output.push({
        //       id: actualDocument.user_defined_data.mongoId,
        //       title: actualDocument.user_defined_data.title,
        //       authorId: actualDocument.user_defined_data.authorId,
        //       authorName: actualDocument.user_defined_data.authorName,
        //       description: actualDocument.user_defined_data.description,
        //       searchTags: actualDocument.user_defined_data.searchTags,
        //       category: actualDocument.user_defined_data.category,
        //       attachments: [
        //         {
        //           fileName: actualDocument.user_defined_data.originalFileName,
        //           extension: actualDocument.file.extension,
        //           fileUrl: actualDocument.file.filename,
        //           downloadCount: actualDocument.user_defined_data.downloadCount
        //         },
        //       ],
        //     });
        //   }
        // }

        console.log('found : ', actualDocument.user_defined_data.mongoId);
        if (actualDocument.user_defined_data) {
          output.push({
            id: actualDocument.user_defined_data.mongoId,
            title: actualDocument.user_defined_data.title,
            authorId: actualDocument.user_defined_data.authorId,
            authorName: actualDocument.user_defined_data.authorName,
            description: actualDocument.user_defined_data.description,
            searchTags: actualDocument.user_defined_data.searchTags,
            category: actualDocument.user_defined_data.category,
            claps: actualDocument.user_defined_data.claps,
            views: actualDocument.user_defined_data.views,
            attachments: [
              {
                fileName: actualDocument.user_defined_data.originalFileName,
                extension: actualDocument.file.extension,
                fileUrl: actualDocument.file.filename,
                downloadCount: actualDocument.user_defined_data.downloadCount,
              },
            ],
          });
          console.log('pushed:', actualDocument.user_defined_data.mongoId);
        }
      });

      console.log('here', output.length);
      sendBack = {
        message: 'Documents found.',
        documents: output,
        totalDocuments,
        next: next,
        newOffset: newOffset,
      };
    } else {
      sendBack = {
        message: 'No documents found. Please search something else.',
        documents: [],
      };
    }
    ctx.body = sendBack;
    ctx.status = httpStatus.OK;
  } catch (error) {
    console.log('werfdfvcd', error);
    ctx.status = httpStatus.INTERNAL_SERVER_ERROR;
    ctx.body = {
      message: 'Something went wrong',
    };
  }
};

//to get a single document by id
// assumption : id needs to be mongoId
exports.getOne = async ctx => {
  // console.log('get on ecalled');
  const { id } = ctx.params;

  try {
    await incrementDocumentViewCount(id);
    const document = await getDocumentById(id);
    console.log('document found', document);
    await markDocumentToBeIndexedInES(id);
    ctx.body = {
      message: 'document found',
      document,
    };
  } catch (error) {
    console.log('error fetching document from mongo', error);
    ctx.status = httpStatus.BAD_REQUEST;
    ctx.body = { message: 'Error fetching document' };
  }
};

exports.add = async ctx => {
  let authorised = false;
  try {
    // check for valid user
    await getUserById(ctx.request.body.authorId);
    authorised = true;
    // console.log('---check body---',ctx.request.body);
    // console.log('---check: file type---', typeof ctx.request.files.attachments);

    const { body, files } = ctx.request;

    const result = await addDocument(body, files);

    console.log('--doc : success---', result);

    ctx.status = result.status;
    ctx.body = result.body;
  } catch (error) {
    console.log('---error---', error);
    ctx.status = authorised ? error.status : httpStatus.UNAUTHORIZED;
    ctx.body = authorised ? error.body : { message: 'Unauthorised' };
  }
};

// to update a document
exports.update = async ctx => {
  let authorised = false;
  // id -> mongoId , userId -> user who is trying to update the document
  const { id, authorId, searchTags, ...body } = ctx.request.body;
  const files = ctx.request.files.attachments;

  try {
    // check for valid user
    await getUserById(authorId);
    authorised = true;

    if (files) {
      const oldDocument = await getDocumentById(id);
      // time to move old attachments to archive folder

      // console.log('old document in mongodb :', oldDocument);
      // check if user is authorised to perform the update
      if (authorId === oldDocument.authorId) {
        let oldFiles = oldDocument.attachments;
        // _moveFiles(oldFiles);

        let fileInfo = [];
        let currentFiles = [];

        if (files instanceof Array) {
          // for multiple files
          files.forEach(file => {
            if (_isFileTypeAllowed(file)) {
              let name = file.name;
              let extension = name.substr(name.lastIndexOf('.') + 1);
              let path = pathModule.basename(file.path);
              let type = file.type;

              if (!currentFiles.includes(name)) {
                fileInfo.push({
                  fileName: name,
                  fileUrl: path,
                  type,
                  extension,
                  indexed_in_ES: false,
                  downloadCount: 0,
                });
                currentFiles.push(name);
              }
            }
          });
        } else {
          if (_isFileTypeAllowed(files)) {
            // for single file
            let name = files.name;
            let extension = name.substr(name.lastIndexOf('.') + 1);
            let path = pathModule.basename(file.path);
            let type = files.type;
            fileInfo.push({
              fileName: name,
              fileUrl: path,
              type,
              extension,
              indexed_in_ES: false,
              downloadCount: 0,
            });
          }
        }

        if (fileInfo.length > 0) {
          let searchTagsArray = [];

          // console.log('looking for array type:',typeof(searchTags));
          if (searchTags instanceof Array) {
            // console.log('array searchtags');
            searchTagsArray = searchTagsArray.concat(searchTags);
          } else {
            // console.log('string searchtags');
            searchTagsArray = searchTags.split(',');
          }

          const newDocument = {
            ...body,
            searchTags: searchTagsArray,
            attachments: fileInfo,
            updated_At: new Date().getTime(),
          };

          try {
            await updateDocumentById(id, newDocument);
            oldFiles.forEach(file => {
              var oldPath = pathModule.join(__dirname, `../../../${file.path}`);
              // console.log(oldPath);
              var newPath = pathModule.join(
                __dirname,
                `../../../archive/${id}_${new Date().getTime()}_${file.name}`,
              );
              fs.rename(oldPath, newPath, function(err) {
                if (err) throw err;
                console.log('Successfully renamed - AKA moved!');
              });
            });
            const response = {
              message: 'Document Updated Successfully. It will take some time to get rolling.',
            };
            ctx.body = response;
          } catch (error) {
            console.log('error updating document in mongodb');
            ctx.status = httpStatus.INTERNAL_SERVER_ERROR;
          }
        } else {
          // none of the uploaded files is supported so aborting with an error
          ctx.status = httpStatus.BAD_REQUEST;
          ctx.body = {
            message: 'Unsupported files',
          };
        }
      } else {
        // user is unauthorised to perform the update
        const body = {
          message: 'UNAUTHORIZED',
        };
        _removeFiles(files);
        ctx.body = body;
        ctx.status = httpStatus.UNAUTHORIZED;
      }
    } else {
      console.log('no files found');
      const response = {
        message: 'No attachments found.',
      };
      ctx.body = response;
      ctx.status = httpStatus.BAD_REQUEST;
    }
  } catch (error) {
    console.log('error fetching document from mongodb');
    // console.log(files);
    _removeFiles(files);
    ctx.body = {
      message: authorised
        ? 'Specified document does not exist. Please create the document using add document form.'
        : 'Unauthorized',
    };
    ctx.status = authorised ? httpStatus.INTERNAL_SERVER_ERROR : httpStatus.UNAUTHORIZED;
  }
};

// not to be implemented as of now
exports.delete = async ctx => {
  ctx.body = 'Deleting not permitted. Please contact your adminstrator. ';
  // this id is mongoId

  // 1. fetch document from mongodb with id
  // 2. removefiles from uploads folder ... move to archive
};

exports.claps = async ctx => {
  const docId = ctx.request.body.docId;
  const clapsToAdd = ctx.request.body.claps;
  const userId = ctx.request.body.userId;

  try {
    try {
      // necessary checks
      const { claps, ...documentInMongo } = await getDocumentById(docId);
      await getUserById(userId);

      var documentClaps = claps;
      // console.log(documentClaps);

      // check if user has already clapped
      if (documentClaps[userId] !== undefined) {
        // user has already clapped
        let oldClapsByUser = documentClaps[userId];
        delete documentClaps[userId];
        documentClaps.totalClaps = documentClaps.totalClaps - oldClapsByUser;
      }

      documentClaps.totalClaps = documentClaps.totalClaps + clapsToAdd;
      documentClaps[userId] = clapsToAdd;

      // update document with new claps object
      const newDocument = {
        ...documentInMongo,
        claps: documentClaps,
      };

      try {
        await updateDocumentById(docId, newDocument);
        // mark indexed_in_ES as false for all the attachments of current document
        await markDocumentToBeIndexedInES(docId);
        ctx.status = httpStatus.OK;
        ctx.body = {
          message: 'clapps added successfully',
        };
      } catch (error) {
        console.log('error updating in mongo', error);
        ctx.status = httpStatus.INTERNAL_SERVER_ERROR;
        ctx.body = {
          message: 'unable to update in mongo',
        };
      }
    } catch (error) {
      console.log('error finding document in mongodb : ', error);
      ctx.status = httpStatus.BAD_REQUEST;
      ctx.body = {
        message: 'could not find the specified document',
      };
    }
  } catch (error) {
    console.log('something went wrong :', error);
    ctx.status = httpStatus.INTERNAL_SERVER_ERROR;
    ctx.body = {
      message: 'something went wrong',
    };
  }
};

exports.downloadFile = async ctx => {
  // console.log('download called:');
  var queryFile = ctx.query.file;
  try {
    var file = pathModule.join(__dirname, '../../../uploads/' + queryFile);
    const attachment = await getAttachmentDetails(queryFile);
    console.log('---file attachment---', attachment);
    // var filename = pathModule.basename(file);
    let fileName = attachment.attachments[0].fileName;
    let mimetype = mime.getType(file);

    try {
      //update in mongo
      await incrementDownloadCount(queryFile);
      await markAttachmentToBeIndexedInES(queryFile);
      ctx.body = fs.createReadStream(file);
      ctx.set('Content-disposition', 'attachment; filename=' + fileName);
      ctx.set('Content-type', mimetype);
      ctx.status = httpStatus.OK;
    } catch (error) {
      console.log('error updating download_count in mongo');
      ctx.status = httpStatus.INTERNAL_SERVER_ERROR;
      ctx.body = {
        message: 'Something went wrong. Please try again after some time.',
      };
    }
  } catch (err) {
    console.log('some err downloading ..', err);
    ctx.status = httpStatus.NOT_FOUND;
    ctx.body = {
      message: 'Specified file doesnot exist.',
    };
  }
};

exports.bulkUpload = async ctx => {
  // console.log('bulk called');
  // console.log('-----mappings------', ctx.request.files.mappings);
  // console.log('-------body--------', ctx.request.body);
  let mappings = ctx.request.files.mappings;
  let { authorId, authorName } = ctx.request.body;
  let filePath = pathModule.join(__dirname , "../../../"+mappings.path);
  // console.log('----filePath-----',filePath);
  const result = excelToJson({
    sourceFile: filePath ,
    header:{
      rows: 1
    },
    columnToKey: {
      A: 'title',
      B: 'description',
      C: 'searchTags',
      D: 'category',
      E: 'attachments'
    },
  });

  // console.log('----------------------');
  // console.log(result.Sheet1);
  // console.log('----------------------');

  // check for valid user
  // await getUserById(authorId);

  let documentArray = [];

  result.Sheet1.forEach(jsonDocument=>{
    documentArray.push(
      {
        formFields:{
          title: jsonDocument.title,
          description: jsonDocument.description,
          category : jsonDocument.category,
          authorId,
          authorName,
          searchTags: jsonDocument.searchTags.split(','),
        },
        fileNames: jsonDocument.attachments.split(','),
        files:{attachments:[]}
      }
    )
  });

  // console.log('-----done --------', documentArray);

  documentArray.forEach(document=>{
    document.fileNames.forEach(file=>{
      let extension = file.substr(file.lastIndexOf('.') + 1);
      let filePath = pathModule.join(__dirname , "../../../bulk_uploads/",file);
      let destinationPath = pathModule.join(__dirname,`../../../uploads/upload_${shortid.generate()}.${extension}`);
      document.files.attachments.push({
        name:file,
        path: destinationPath,
        type: mime.getType(filePath)
      });
    })
  });

  documentArray.forEach(async document =>{
    try{
      await addDocument(document.formFields,document.files);
      // move files so that fscrawler will work

      document.files.attachments.forEach(file=>{
        let oldPath = pathModule.join(__dirname , "../../../bulk_uploads/",file.name);
        let newPath = file.path;
        fs.rename(oldPath, newPath, function(err) {
          if (err) throw err;
          console.log('Successfully renamed - AKA moved!');
        });
      })
    }catch(error){
      console.log('----error------',error);
    }
  });

  //remove the mappings file
  fs.unlink(filePath, function(err) {
    if (err && err.code == 'ENOENT') {
      // file doens't exist
      console.info("File doesn't exist, won't remove it.");
    } else if (err) {
      // other errors, e.g. maybe we don't have enough permission
      console.error('Error occurred while trying to remove file');
    } else {
      console.info(`removed`);
    }
  });

  ctx.status = 200;
  ctx.body={message:'Documents added successfully. It will take more time than usual to get rolling'}

};

// ----------------------------------
// some helper functions
// -----------------------------------
const _removeFiles = files => {
  if (files instanceof Array) {
    files.forEach(file => {
      const filePath = pathModule.join(__dirname, `../../../${file.path}`);

      fs.unlink(filePath, function(err) {
        if (err && err.code == 'ENOENT') {
          // file doens't exist
          console.info("File doesn't exist, won't remove it.");
        } else if (err) {
          // other errors, e.g. maybe we don't have enough permission
          console.error('Error occurred while trying to remove file');
        } else {
          console.info(`removed`);
        }
      });
    });
  } else {
    const filePath = pathModule.join(__dirname, `../../../${files.path}`);

    fs.unlink(filePath, function(err) {
      if (err && err.code == 'ENOENT') {
        // file doens't exist
        console.info("File doesn't exist, won't remove it.");
      } else if (err) {
        // other errors, e.g. maybe we don't have enough permission
        console.error('Error occurred while trying to remove file');
      } else {
        console.info(`removed`);
      }
    });
  }
};

const _isFileTypeAllowed = file => {
  const allowedFileTypes = [
    'application/pdf', // pdf
    'application/json', // json
    'application/javascript', // javascript
    'application/vnd.ms-excel', // xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.oasis.opendocument.presentation', // odp
    'application/msword', //doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', //docx
    'application/rtf', //rtf
    'application/vnd.oasis.opendocument.text', //odt
    'application/vnd.ms-powerpoint', // ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', //pptx
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/bmp',
  ];
  if (allowedFileTypes.includes(file.type)) {
    return true;
  } else {
    // remove file which is not supported
    _removeFiles(file);
    return false;
  }
};

// not used as of now
const _moveFiles = (oldPath, newPath) => {
  files.forEach(file => {
    var oldPath = path.join(__dirname, `../../../${file.path}`);
    // console.log(oldPath);
    var newPath = path.join(__dirname, `../../../archive/${file.name}`);
    fs.rename(oldPath, newPath, function(err) {
      if (err) throw err;
      console.log('Successfully renamed - AKA moved!');
    });
  });
};
