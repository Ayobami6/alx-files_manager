import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import ObjectID from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');
const userQueue = new Queue('userQueue', 'redis://127.0.0.1:6379');

const thumbnail = async (width, localPath) => {
  const out = await imageThumbnail(localPath, { width });
  return out;
};

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;
  if (!fileId) {
    done(new Error('Missing fileId'));
  }
  if (!userId) {
    done(new Error('Missing userId'));
  }
  const file = await dbClient
    .collection('files')
    .findOne({ _id: ObjectID(fileId) });
  if (!file) {
    done(new Error('File not found'));
  } else {
    try {
      const thumbnailPath = await thumbnail(100, file.localPath);
      fs.writeFileSync(`${file.localPath}_100`, thumbnailPath);
      done(null, file);
    } catch (err) {
      done(err);
    }
  }
});

userQueue.process(async (job, done) => {
  const { userId } = job.data;
  if (!userId) done(new Error('Missing userId'));
  const users = dbClient.db.collection('users');
  const user = await users.findOne({ _id: ObjectID(userId) });
  if (!user) done(new Error('User not found'));
  console.log(`Welcome ${user.email}`);
});
