const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

// Database Name
const dbName = 'jwtDb';

async function connectToDb() {
  // Use connect method to connect to the server
  await client.connect();
  const db = client.db(dbName);
  const userCollection = db.collection('users');
  const postCollection = db.collection('posts')

  // the following code examples can be pasted here...

  return {userCollection,postCollection};
}

module.exports = connectToDb