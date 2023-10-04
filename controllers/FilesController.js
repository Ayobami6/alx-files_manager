/* eslint-disable comma-dangle */
/* eslint-disable object-curly-newline */
/* eslint-disable consistent-return */
import { ObjectID } from 'mongodb';
import fs from 'fs';
import { v4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class FilesController {
  static async getUser(req) {
    try {
      // get token from header
      const token = req.header('X-Token');
      console.log(token);
      // get user id from mem storage redis
      const userId = await redisClient.get(`auth_${token}`);
      if (userId) {
        // get user from db
        const user = await dbClient.db
          .collection('users')
          .findOne({ _id: new ObjectID(userId) });
        // return user
        return user;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  static async postUpload(req, res) {
    try {
      const user = await FilesController.getUser(req);
      // send a json error if user is not found
      console.log(user);
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
        });
      }

      //   get post data from request body

      const { name, type, parentId, data } = req.body;
      const isPublic = !!req.body.isPublic;
      const newData = {
        userId: user._id,
        name,
        type,
        parentId: parentId || 0,
        isPublic,
      };
      // validate and type
      if (!name) {
        return res.status(400).json({
          error: 'Missing name',
        });
      }
      if (!type) {
        return res.status(400).json({
          error: 'Missing type',
        });
      }
      if (!data && type !== 'folder') {
        return res.status(400).json({
          error: 'Missing data',
        });
      }
      const files = await dbClient.db.collection('files');
      if (parentId) {
        const objId = new ObjectID(parentId);
        const parent = await files.findOne({ _id: objId, userId: user._id });
        if (!parent) {
          return res.status(404).json({
            error: 'Parent not found',
          });
        }
        if (parent.type !== 'folder') {
          return res.status(400).json({
            error: 'Parent is not a folder',
          });
        }
      }
      if (type === 'folder') {
        const result = await files.insertOne({ ...newData });
        res.status(201).json({ ...newData, id: result.insertedId });
      } else {
        const filePath = process.env.FOLDER_PATH || '/tmp/uploads';
        const fileName = `${filePath}/${v4()}`;
        const buf = Buffer.from(data, 'base64');
        if (!fs.existsSync(filePath)) await fs.promises.mkdir(filePath);
        await fs.promises.writeFile(fileName, buf, 'utf-8');
        const result = await files.insertOne({
          ...newData,
          localPath: fileName,
          isPublic,
        });
        res.status(201).json({ ...newData, id: result.insertedId });
      }
    } catch (error) {
      console.log(error);
    }
  }

  static async getShow(req, res) {
    const user = await FilesController.getUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }
    const { id } = req.params;
    const files = await dbClient.db.collection('files');
    const objId = new ObjectID(id);
    const file = await files.findOne({ _id: objId, userId: user._id });
    if (!file) {
      return res.status(404).json({
        error: 'Not found',
      });
    }
    const cleanedFile = { ...file, id: file._id.toString() };
    delete cleanedFile._id;
    return res.status(200).json(cleanedFile);
  }

  static async getIndex(req, res) {
    const user = await FilesController.getUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }
    const { parentId, page } = req.query;
    const pageNum = parseInt(page, 10) || 0;
    const files = await dbClient.db.collection('files');
    const query = parentId
      ? { userId: user._id, parentId: new ObjectID(parentId) }
      : { userId: user._id };
    files
      .aggregate([
        { $match: query },
        { $sort: { _id: -1 } },
        { $skip: pageNum * 20 },
        { $limit: 20 },
      ])
      .toArray((err, result) => {
        if (err) {
          return res.status(500).json({
            error: 'Not found',
          });
        }
        const fileData = result.map((file) => {
          const processedFile = {
            ...file,
            id: file._id.toString(),
          };
          delete processedFile.localPath;
          delete processedFile._id;
          return processedFile;
        });
        return res.status(200).json(fileData);
      });
  }

  static async putPublish(req, res) {
    try {
      const user = await FilesController.getUser(req);
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
        });
      }
      const { id } = req.params;
      const files = await dbClient.db.collection('files');
      const objId = new ObjectID(id);
      const file = await files.findOne({ _id: objId, userId: user._id });
      const options = { returnOriginal: false };
      if (!file) {
        return res.status(404).json({
          error: 'Not found',
        });
      }
      if (file.isPublic) {
        return res.status(400).json({
          error: 'File is already public',
        });
      }
      file.isPublic = true;
      await files.updateOne(
        { _id: objId, userId: user._id },
        { $set: file },
        options
      );
      return res.status(200).json(file);
    } catch (error) {
      console.log(error.message);
    }
  }

  static async putUnpublish(req, res) {
    try {
      const user = await FilesController.getUser(req);
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
        });
      }
      const { id } = req.params;
      const files = await dbClient.db.collection('files');
      const objId = new ObjectID(id);
      const file = await files.findOne({ _id: objId, userId: user._id });
      const options = { returnOriginal: false };
      if (!file) {
        return res.status(404).json({
          error: 'Not found',
        });
      }
      if (file.isPublic) {
        file.isPublic = false;
      }
      await files.updateOne(
        { _id: objId, userId: user._id },
        { $set: file },
        options
      );
      return res.status(200).json(file);
    } catch (error) {
      console.log(error.message);
    }
  }
}

module.exports = FilesController;
