const koa = require('koa');
const koaBody = require('koa-body');
var json = require('koa-json');
const cors = require('@koa/cors');

const routes = require('../api/routes/v1');
const middlewares = require('../api/middlewares');
// const config  =require('./vars');
const uploadConfig = require('./upload');
/**
* Koa instance
* @public
*/
const app = new koa();
app.use(cors({credentials:true, origin:'http://localhost:8080'}));

// sessions
const session = require('koa-session');
app.keys = ['your-session-secret'];
app.use(session({}, app));

app.use(json());
app.use(koaBody(uploadConfig));

// authentication
const passport = require('koa-passport');
app.use(passport.initialize());
app.use(passport.session());

// mount api v1 routes
app.use(routes.routes());
app.use(routes.allowedMethods());

app.use(middlewares.error);

module.exports = app;
