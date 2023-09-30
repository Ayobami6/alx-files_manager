import { MongoClient } from 'mongodb';

const HOST = process.env.DB_HOST || 'localhost';
const PORT = process.env.DB_PORT || 27017;
const DB_NAME = process.env.DB_DATABASE || 'files_manager';
const conString = `mongodb://${HOST}:${PORT}`;

class DBClient {
  constructor() {
    try {
      this.client = new MongoClient(conString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      this.client.connect();
      this.db = this.client.db(DB_NAME);
    } catch (error) {
      console.log(error);
    }
  }

  isAlive() {
    return this.client.isConnected();
  }

  // get number of user from the db

  async nbUsers() {
    const users = await this.db.collection('users').countDocuments();
    return users;
  }

  //   get files

  async nbFiles() {
    const files = await this.db.collection('files').countDocuments();
    return files;
  }
}

// create a new db client instance
const dbClient = new DBClient();

export default dbClient;
