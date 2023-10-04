/* eslint-disable jest/valid-expect */
/* eslint-disable jest/prefer-expect-assertions */
/* eslint-disable no-unused-expressions */
/* eslint-disable jest/no-test-callback */
/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */
import { expect } from 'chai';
import { describe, it } from 'mocha';
import dbClient from '../../utils/db';

describe('dbClient', function () {
  it('should connect to the database', function (done) {
    expect(dbClient.client.isConnected()).to.be.false;
    done();
  });

  it('should check if the dbClient is alive', function (done) {
    expect(dbClient.isAlive()).to.be.true;
    done();
  });

  it('should retrieve the number of users from the database', async function () {
    const usersCount = await dbClient.nbUsers();
    expect(usersCount).to.be.a('number');
    expect(usersCount).to.be.at.least(0);
  });

  it('should retrieve the number of files from the database', async function () {
    const filesCount = await dbClient.nbFiles();
    expect(filesCount).to.be.a('number');
    expect(filesCount).to.be.at.least(0);
  });
});
