const koaRouter = require('koa-router');
// const koaBody = require('koa-body');
// const path = require('path');
const validate = require('koa-joi-validate');

const controller = require('../../controllers/document.controller');
const validation = require('../../validations/document.validation');

const router = new koaRouter({
  prefix: '/document',
});

// check if user is authenticated
const ensureAuthenticated = (ctx, next) => {
  if (ctx.isAuthenticated()) {
    console.log('authenticated');
    return next();
  } else {
    console.log(' not authenticated');
    ctx.throw(401); // unauthorized
  }
};

router
  .get('/', validate(validation.get), ensureAuthenticated, controller.get)
  .post('/', validate(validation.post), ensureAuthenticated, controller.add)
  .put('/', validate(validation.put), ensureAuthenticated, controller.update)
  .post('/claps', validate(validation.claps), ensureAuthenticated, controller.claps)
  .get(
    '/download',
    validate(validation.downloadFile),
    // ensureAuthenticated,
    controller.downloadFile,
  )
  .post('/bulk', ensureAuthenticated, controller.bulkUpload)
  .get('/:id',validate(validation.getOne),ensureAuthenticated,controller.getOne)
  .delete('/:id', validate(validation.delete), ensureAuthenticated, controller.delete)

module.exports = router;
