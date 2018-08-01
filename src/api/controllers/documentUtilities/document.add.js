/**
 *
 * To add a new document,
 * a document can contain at max 5 attachments.
 *
 * Every attachment will be indexed in ES by fscrawler and then form data will be
 * replicated over it by indexing service.
 *
 * steps to add a document:
 * 1. check the length of attachments (should not be more than 5 and atleast 1)
 * 2. generate fileInfo array for files received
 * 3. searchTags -> array of strings
 * 4. document {
 *      title, description, category, authorId, authorName, searchTags, views:0
 *      attachments{
 *        fileName, fileUrl, type, extension, indexed_in_ES:false, downloadCount:0
 *      },
 *      claps{
 *       totalClaps:0
 *       }
 * }
 *
 * 5. add this document to mongodb
 */

const httpStatus = require('http-status');
const pathModule = require('path');
const { _generateFileInfo } = require('./document.helper');
const { addNewDocument } = require('../../repository');

// this will be called only by authenticated user
exports.addDocument = (formFields, files) =>
  new Promise(async (resolve, reject) => {
    console.log('------add document---------');

    if (!files.attachments) {
      console.log('---no files .. rejecting');
      reject({
        status: httpStatus.BAD_REQUEST,
        body: { message: 'No attachments found' },
      });
      return;
    }

    if (files.attachments.length > 5) {
      console.log('---too many files .. rejecting');
      reject({
        status: httpStatus.BAD_REQUEST,
        body: { message: 'Too many files. Maximum 5 files allowed per document.' },
      });
      return;
    }

    let fileInfo = await _generateFileInfo(files.attachments);

    if (fileInfo.length === 0) {
      console.log('---no supported files .. rejecting');
      reject({
        status: httpStatus.BAD_REQUEST,
        body: { message: 'Unsupported files' },
      });
      return;
    }

    const { searchTags, ...body } = formFields;

    let searchTagsArray = [];
    if (searchTags instanceof Array) {
      searchTagsArray = searchTagsArray.concat(searchTags);
    } else {
      searchTagsArray = searchTags.split(',');
    }

    const document = {
      ...body,
      searchTags: searchTagsArray,
      attachments: fileInfo,
      views: 0,
      claps: {
        totalClaps: 0,
      },
    };

    console.log('-------document ----------', document);
    console.log('---------------------------------');

    // adding to mongodb
    try {
      await addNewDocument(document);
      console.log('----doc : added-------');
    } catch (error) {
      console.log('--error ----:', error);
      reject({
        status: httpStatus.INTERNAL_SERVER_ERROR,
        body: { message: 'Error while adding document to mongo' },
      });
      return;
    }

    console.log('---resolved---');
    resolve({
      status: httpStatus.OK,
      body: { message: 'Document Added Successfully. It will take some time to get rolling.' },
    });
  });

  
// ------------------- old implementation: kept only for reference-------------------------------

// to add a new document
// exports.add = async ctx => {
//   let authorised = false;
//   const files = ctx.request.files.attachments;
//   // console.log('----files added ----',files);
//   try {
//     // check for valid user
//     await getUserById(ctx.request.body.authorId);
//     authorised = true;

//     if(files.length > 5 || files.length < 0){
//       ctx.status = httpStatus.BAD_REQUEST;
//       ctx.body = {message:'Too many files. Maximum 5 files allowed per document.'};
//       return;
//     }

//     // atleast one file should be present
//     if (files) {
//       let fileInfo = [];
//       let currentFiles = []; // stores the names of all files
//       if (files instanceof Array) {
//         // for multiple files
//         files.forEach(file => {
//           if (_isFileTypeAllowed(file)) {
//             let name = file.name;
//             let extension = name.substr(name.lastIndexOf('.') + 1);
//             let path = pathModule.basename(file.path);
//             let type = file.type;
//             if (!currentFiles.includes(name)) {
//               fileInfo.push({
//                 fileName:name,
//                 fileUrl:path,
//                 type,
//                 extension,
//                 indexed_in_ES: false,
//                 downloadCount: 0,
//               });
//               currentFiles.push(name);
//             }
//           }
//         });
//       } else {
//         if (_isFileTypeAllowed(files)) {
//           // for single file
//           let name = files.name;
//           let extension = name.substr(name.lastIndexOf('.') + 1);
//           let path = pathModule.basename(files.path);
//           let type = files.type;
//           fileInfo.push({
//             fileName:name,
//             fileUrl:path,
//             type,
//             extension,
//             indexed_in_ES: false,
//             downloadCount: 0,
//           });
//         }
//       }

//       if (fileInfo.length > 0) {
//         const { searchTags, ...body } = ctx.request.body;

//         let searchTagsArray = [];

//         // console.log('looking for array type:',typeof(searchTags));
//         if (searchTags instanceof Array) {
//           // console.log('array searchtags');
//           searchTagsArray = searchTagsArray.concat(searchTags);
//         } else {
//           // console.log('string searchtags');
//           searchTagsArray = searchTags.split(',');
//         }

//         const document = {
//           ...body,
//           searchTags: searchTagsArray,
//           attachments: fileInfo,
//           views: 0,
//           claps: {
//             totalClaps: 0,
//           },
//         };
//         var _id;
//         // adding to mongodb
//         await addNewDocument(document).then(response => {
//           _id = response.ops[0]._id;
//         });

//         const response = {
//           message: 'Document Added Successfully. It will take some time to get rolling.',
//         };
//         ctx.body = response;
//         ctx.status = httpStatus.OK;
//       } else {
//         // none of the uploaded files is supported so aborting with an error
//         ctx.status = httpStatus.BAD_REQUEST;
//         ctx.body = {
//           message: 'Unsupported files',
//         };
//       }
//     } else {
//       console.log('no files found');
//       const response = {
//         message: 'No attachments found.',
//       };
//       ctx.body = response;
//       ctx.status = httpStatus.BAD_REQUEST;
//     }
//   } catch (error) {
//     console.log('error:', error);

//     _removeFiles(files);
//     ctx.body = {
//       message: authorised ? 'INTERNAL_SERVER_ERROR' : 'UNAUTHORIZED',
//     };
//     ctx.status = authorised ? httpStatus.INTERNAL_SERVER_ERROR : httpStatus.UNAUTHORIZED;
//   }
// };

// ------------------------ old implementation : ends -----------------------------------------------
