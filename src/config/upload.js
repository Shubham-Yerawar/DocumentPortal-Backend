module.exports = {
  multipart: true,
  multiple: true,
  urlencoded: true,
  patchNode: true,
  patchKoa: true,
  formidable: {
    uploadDir: 'uploads', // uploaded file will be stored in upload folder relative to package.json
    keepExtensions: true,
    maxFieldSize: 100 * 1024 * 1024, //100 MB
  },
};
