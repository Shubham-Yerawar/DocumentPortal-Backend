const pathModule = require('path');
const fs = require('fs');

// ----------------------------------
// some helper functions
// -----------------------------------
const _removeFiles = files => {
  if (files instanceof Array) {
    files.forEach(file => {
      const filePath = pathModule.join(__dirname, `../../../../${file.path}`);

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
  console.log('----file:------------------');
  console.log(file);
  console.log('---------------------------');
  if (allowedFileTypes.includes(file.type)) {
    return true;
  } else {
    // remove file which is not supported
    _removeFiles(file);
    return false;
  }
};

const _generateFileInfo = files => {
  let fileInfo = [];
  let currentFiles = []; // stores the names of all files
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
      let path = pathModule.basename(files.path);
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

  return fileInfo;
};

// not used as of now
const _moveFiles = files => {
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

module.exports = {
    _generateFileInfo,
    _isFileTypeAllowed,
    _moveFiles,
    _removeFiles
};
