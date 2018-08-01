
const koaRouter = require('koa-router');

const userRoutes = require('./user.route');
const documentRoutes = require('./document.route');

var router = new koaRouter({
    prefix: '/v1'
  });

/**
 * GET v1/status
 */
router.get('/status', (ctx) => ctx.body ="Hello");


router.use(userRoutes.routes());
router.use(userRoutes.allowedMethods());

router.use(documentRoutes.routes());
router.use(documentRoutes.allowedMethods());


module.exports = router;
