const httpStatus = require('http-status');
const bcrypt = require('bcrypt');
const {
  userSignup,
  isUniqueUser,
  getUserById,
  updatePassword,
  getDocumentById,
  addToFavourites,
  removeFromFavourites,
  getFavouriteDocuments
} = require('../repository');

exports.login = async ctx => {

  console.log('login called');
  // koa-passport saves the verified user in ctx.state after local authentication
  if (ctx.state.user) {
    ctx.body = ctx.state.user;
    ctx.status = httpStatus.OK;
  }
};

exports.signup = async ctx => {
  const body = ctx.request.body;
  let response = {};

  // console.log('signup :',body);

  if (body.password === body.confirmPassword) {
    try {
      await isUniqueUser(body.username,body.employeeId);
      try {
         body.favouriteDocuments = [];

        await userSignup(body);

        response = {
          message: 'Signup successful',
        };
        ctx.body = response;
        ctx.status = httpStatus.OK;
      } catch (error) {
        response = {
          message: 'INTERNAL SERVER ERROR',
        };
        ctx.body = response;
        ctx.status = httpStatus.INTERNAL_SERVER_ERROR;
      }
    } catch (error) {
      response = {
        message: 'User already exists. Try again with different username.',
      };
      ctx.status = httpStatus.BAD_REQUEST;
      ctx.body = response;
    }
  } else {
    response = {
      message: 'password and confirm password do not match',
    };
    ctx.status = httpStatus.BAD_REQUEST;
    ctx.body = response;
  }
};

exports.logout = ctx => {
  ctx.logout();
  ctx.status = httpStatus.OK;
};


exports.changePassword = async ctx => {
  const { userId, newPassword, password, newConfirmPassword } = ctx.request.body;
    if (newPassword === password) {
        ctx.status = httpStatus.BAD_REQUEST;
        ctx.body = { message: 'New password and old password should not be the same' };
        return;
    }

    if(newPassword !== newConfirmPassword){
        ctx.status = httpStatus.BAD_REQUEST;
        ctx.body = { message: 'New password and confirm password do not match' };
        return;
    }

    try{
        const user = await getUserById(userId);

        const result = await compare(password,user.hash);
        console.log('bcrypt result',result);
        if(result){
            const hash = await generateHash(newPassword,10);
            console.log('hash gen');

            await updatePassword(userId,hash);
            console.log('pass updated');

            ctx.status = httpStatus.OK;
            ctx.body = { message: 'password updated successfully' };

        }else{
            ctx.status = httpStatus.UNAUTHORIZED;
            ctx.body = { message: 'unauthorized' };
        }

    }catch(error){
        console.log('something went wrong',error);
        ctx.status = httpStatus.INTERNAL_SERVER_ERROR;
        ctx.body = {message:'Something went wrong'};
    }


};


exports.addToFavourites = async ctx =>{
  const { userId , docId } = ctx.request.body;
  try{
    await getDocumentById(docId);
    console.log('doc exist');
    try{
      await getUserById(userId);
      console.log('user exist');
      await addToFavourites(userId,docId);
      console.log('added');
      ctx.status = httpStatus.OK;
      ctx.body= {message : 'document added to favourites successfully'};

    }catch(error){
      console.log('user doesnot exist in records');
      ctx.status = httpStatus.BAD_REQUEST;
      ctx.body= {message : 'user doesnot exist in records'};
    }

  }catch(error){
    console.log('document doesnot exist in records');
    ctx.status = httpStatus.BAD_REQUEST;
    ctx.body= {message : 'document doesnot exist in records'};
  }
};


exports.removeFromFavourites = async ctx =>{
  const { userId , docId } = ctx.request.body;
  try{
    await getDocumentById(docId);
    try{
      await getUserById(userId);

      await removeFromFavourites(userId,docId);
      ctx.status = httpStatus.OK;
      ctx.body= {message : 'document removed from favourites successfully'};

    }catch(error){
      console.log('user doesnot exist in records');
      ctx.status = httpStatus.BAD_REQUEST;
      ctx.body= {message : 'user doesnot exist in records'};
    }

  }catch(error){
    console.log('document doesnot exist in records');
    ctx.status = httpStatus.BAD_REQUEST;
    ctx.body= {message : 'document doesnot exist in records'};
  }
};

exports.getFavouriteDocuments = async ctx =>{
  const userId = ctx.params.userId;

  try{
    await getUserById(userId);
    console.log('user found');
    const response = await getFavouriteDocuments(userId);
      ctx.body = response;
      ctx.status = httpStatus.OK;

  }catch(error){
    ctx.status = httpStatus.BAD_REQUEST;
    ctx.body= { message : 'user not found'};
  }

};

// ------------------------------------
// helper methods
// ------------------------------------

const compare = (password, hash)=>new Promise((resolve,reject)=>{
    bcrypt.compare(password,hash).then(result=>{
        resolve(result);
    })
});

const generateHash = (password, saltRounds = 10) => new Promise((resolve,reject)=>{
    bcrypt.hash(password,saltRounds).then(hash =>{
        resolve(hash);
    })
});
