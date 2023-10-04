import sha1 from 'sha1';
import { v4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const auth = req.header('Authorization');
    const [email, password] = Buffer.from(auth.split(' ')[1], 'base64')
      .toString('ascii')
      .split(':');
    // get users collection
    // console.log(email, password);
    const usersCollection = await dbClient.db.collection('users');
    const hashedPassword = sha1(password);
    const user = await usersCollection.findOne({
      email,
      password: hashedPassword,
    });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (user.password !== hashedPassword) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = v4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 60 * 60 * 24);
    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    // get the token from the the headers
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    await redisClient.del(`auth_${token}`);
    return res.status(204).json({});
  }
}

module.exports = AuthController;
