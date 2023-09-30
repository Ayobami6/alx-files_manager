import sha1 from 'sha1';
import { v4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const auth = req.headers.authorization;
    const [email, password] = Buffer.from(auth.split(' ')[1], 'base64')
      .toString()
      .split(':');
    // get users collection
    const usersCollection = await dbClient.collection('users');
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
    await redisClient.set(
      `auth_${token}`,
      user.id.toString(),
      'EX',
      24 * 60 * 60
    );
    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    // get the token from the the headers
    const token = req.headers('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    await redisClient.del(`auth_${token}`);
    return res.status(204).json({});
  }
}

module.exports = AuthController;