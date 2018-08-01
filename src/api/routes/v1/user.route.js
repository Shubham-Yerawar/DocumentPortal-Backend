const koaRouter = require('koa-router');
const validate = require('koa-joi-validate');
const bcrypt = require('bcrypt');
const passport = require('koa-passport');
const LocalStrategy = require('passport-local').Strategy;

const controller = require('../../controllers/user.controller');
const validation = require('../../validations/user.validation');

const { getUserByUsername } = require('./../../repository');

const router = new koaRouter({
  prefix: '/user',
});

router.get('/check', ctx => {
  ctx.body = 'ok';
});

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await getUserByUsername(username);
      // console.log('user ---->:',user);
      bcrypt.compare(password, user.hash).then(result => {
        if (result) {
          delete user.hash;
          console.log('user verified');
          return done(null, user);
        } else {
          return done(null, false, { message: 'Invalid credentials' });
        }
      });
    } catch (error) {
      // console.log('user not found :',error);
      return done(null, false, { message: 'Unknown user' });
    }
  }),
);

passport.serializeUser((user, done) => {
  done(null, user.username);
});

passport.deserializeUser(async (username, done) => {
  getUserByUsername(username)
    .then(user => {
      // console.log('user deserialized :',user);
      done(null, user);
    })
    .catch(error => {
      console.log('error deserializing user', error);
    });
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
  .post('/signup', validate(validation.signup), controller.signup)
  .post('/login', validate(validation.login), passport.authenticate('local'), controller.login)
  .post(
    '/changePassword',
    validate(validation.changePassword),
    ensureAuthenticated,
    controller.changePassword,
  )
  .post('/favourites/add',validate(validation.favourites),ensureAuthenticated,controller.addToFavourites)
  .post('/favourites/remove',validate(validation.favourites),ensureAuthenticated,controller.removeFromFavourites)
  .get('/:userId/favourites',validate(validation.getFavourites),ensureAuthenticated,controller.getFavouriteDocuments)
  .get('/logout', controller.logout);

module.exports = router;
