const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { database } = require('../../../../config/vars');

let db = null;
let connect = null;

exports.configureDatabaseAndConnect = (_db, _connect) => {
  db = _db;
  connect = _connect;
};

// to check for unique username
const isUniqueUser = username =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }

    try {
      db.collection(database.userCollection)
        .find({ username: username })
        .toArray()
        .then(response => {
          // console.log('checking username :',response);
          if (response.length > 0) return reject();
          resolve();
        })
        .catch(error => {
          console.log('error finding a unique user');
          reject();
        });
    } catch (error) {
      reject();
    }
  });

const userSignup = user =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }

    try {
      bcrypt.hash(user.password, saltRounds).then(hash => {
        // Store hash in your password DB.
        //console.log('hash :', hash);
        delete user.password;
        delete user.confirmPassword;
        user['hash'] = hash;

        // console.log('user before signup :', user);

        db.collection(database.userCollection)
          .insertOne(user)
          .then(resolve)
          .catch(reject);
      });
    } catch (error) {
      reject();
    }
  });

// NOTE: unused method

// const userLogin = user =>
//   new Promise(async (resolve, reject) => {
//     if (!db) {
//       await connect();
//     }

//     try {
//       db.collection(database.userCollection)
//         .findOne({ username: user.username })
//         .then(response => {
//           // response is user object from mongodb
//           bcrypt.compare(user.password, response.hash).then(result => {
//             //  result is output of bcrypt : true or false
//             if (result) {
//               delete response.hash;
//               resolve(response);
//             } else {
//               reject();
//             }
//           });
//         })
//         .catch(error => {
//           console.log('error finding user for login, -->', error);
//           reject();
//         });
//     } catch (error) {
//       reject();
//     }
//   });

const getUserById = userId =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }

    try {
      const query = { _id: new ObjectId(userId) };
      db.collection(database.userCollection)
        .findOne(query)
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          console.log(
            'either user doesnot exist or multiple user with given userId exists.',
            error,
          );
          reject();
        });
    } catch (error) {
      console.log('INVALID ARGUMENT : USERID');
      reject();
    }
  });

const getUserByUsername = username =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }
    try {
      db.collection(database.userCollection)
        .findOne({ username })
        .then(response => {
          // console.log('response ---> ', response);
          resolve(response);
        })
        .catch(reject);
    } catch (error) {
      reject();
    }
  });

const updatePassword = (userId, hash) =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }
    try {
      const query = { _id: new ObjectId(userId) };
      const operation = {
        $set: {
          hash: hash,
        },
      };

      db.collection(database.userCollection)
        .updateOne(query, operation)
        .then(response => {
          // console.log('response from mongo :',response);
          resolve(response);
        })
        .catch(reject);
    } catch (error) {
      console.log('some err', error);
      reject();
    }
  });

const addToFavourites = (userId, docId) =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }
    try {
      const query = { _id: new ObjectId(userId) };
      const operation = {
        $addToSet: {
          favouriteDocuments: new ObjectId(docId),
        },
      };
      db.collection(database.userCollection)
        .update(query, operation)
        .then(response => {
          resolve(response);
        })
        .catch(reject);
    } catch (error) {
      console.log('something went wrong', error);
    }
  });

const removeFromFavourites = (userId, docId) =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }
    try {
      const query = { _id: new ObjectId(userId) };
      const operation = {
        $pull: {
          favouriteDocuments: new ObjectId(docId),
        },
      };
      db.collection(database.userCollection)
        .update(query, operation)
        .then(response => {
          resolve(response);
        })
        .catch(reject);
    } catch (error) {
      console.log('something went wrong', error);
    }
  });

const getFavouriteDocuments = userId =>
  new Promise(async (resolve, reject) => {
    if (!db) {
      await connect();
    }

    try {
      const query = { _id: new ObjectId(userId) };
      console.log('exec query');
      db.collection(database.userCollection)
        .aggregate([
          { $match: query },
          { $unwind: '$favouriteDocuments' },
          {
            $lookup: {
              from: database.documentCollection,
              foreignField: '_id',
              localField: 'favouriteDocuments',
              as: 'favouriteDocuments',
            },
          },
          { $unwind: '$favouriteDocuments' },
          { $group: { _id:  "$_id", favouriteDocuments: { $push: "$favouriteDocuments" }  } },
        ])
        .toArray()
        .then(response => {
          resolve(response);
        })
        .catch(reject);
    } catch (error) {
      console.log('something went wrong', error);
    }

    //   db.users.aggregate([
    //     { $match: { _id: ObjectId("5b4f11711abffd3cdb313967") } },
    //     { $unwind: "$favouriteDocuments" },
    //     { $lookup: {
    //             from: "documents",
    //             foreignField: "_id",
    //             localField: "favouriteDocuments",
    //             as: "favouriteDocuments"
    //     } },
    //     { $unwind: "$favouriteDocuments" },
    //     { $group: { _id:  "$_id", favouriteDocuments: { $push: "$favouriteDocuments" }, username: { $first: "$username" }  } }

    // ])
  });

exports.queries = {
  userSignup,
  isUniqueUser,
  getUserById,
  getUserByUsername,
  updatePassword,
  getFavouriteDocuments,
  addToFavourites,
  removeFromFavourites,
};
