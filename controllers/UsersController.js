import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

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

      return res.status(201).json({ id: result.insertedId, email });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMe(req, res) {
    try {
      // get token from headers
      const token = req.headers('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });
      const userId = redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const users = await dbClient.db.collection('users');
      const user = await users.findOne({ _id: ObjectId(userId) });
      if (!user) {
        return res.status(404).json({ error: 'Unauthorized' });
      }
      return res.status(200).json({ id: user.id, email: user.email });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = UsersController;
