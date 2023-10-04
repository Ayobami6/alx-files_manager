import sha1 from 'sha1';
import { ObjectID } from 'mongodb';
import Queue from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const userQueue = new Queue('userQueue', 'redis://127.0.0.1:6379');

class UsersController {
  static async postNew(req, res) {
    try {
      const { email, password } = req.body;
      if (!email) return res.status(400).json({ error: 'Missing email' });
      if (!password) return res.status(400).json({ error: 'Missing password' });

      const users = await dbClient.db.collection('users');
      const user = await users.findOne({ email });
      if (user) return res.status(400).json({ error: 'Already exist' });

      const hashedPassword = sha1(password);
      const result = await users.insertOne({
        email,
        password: hashedPassword,
      });
      userQueue.add({ userId: result.insertedId });
      return res.status(201).json({ id: result.insertedId, email });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMe(req, res) {
    try {
      // get token from headers
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const users = await dbClient.db.collection('users');
      const objID = new ObjectID(userId);
      const user = await users.findOne({ _id: objID });
      if (!user) {
        return res.status(404).json({ error: 'Unauthorized' });
      }
      return res.status(200).json({ id: user._id, email: user.email });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = UsersController;
