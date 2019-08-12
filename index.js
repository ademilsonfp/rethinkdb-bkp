
const ora = require('ora');
const r = require('rethinkdb');
const inquirer = require('inquirer');
const luxon = require('luxon');
const cliProgress = require('cli-progress');
const fs = require('fs');
const archiver = require('archiver');

async function main() {
  try {
    let dbConn = await connect();
    let dbNames = await chooseDbs(dbConn);
    let dbTables = await getTables(dbConn, dbNames);
    let docsCount = await countDocs(dbConn, dbTables);

    let timestamp = luxon.DateTime.local().toFormat('yyyyMMddHHmmss');
    let destPath = await chooseDest(`/tmp/db-${timestamp}Z.zip`);

    await dumpDocs(destPath, docsCount, dbConn, dbTables);
    await dbConn.close();
  } catch (error) {
    console.error(error);
  }
}

async function connect() {
  const feedback = ora('Connecting to local RethinkDB...').start();
  var dbConn;

  try {
    dbConn = await r.connect();
    feedback.succeed('Connected to local RethinkDB');
  } catch (error) {
    feedback.fail('Can not connect to local RethinkDB');
    throw error;
  }

  return dbConn;
}

async function chooseDbs(dbConn) {
  const feedback = ora('Listing databases...').start();
  var dbNames;

  try {
    let choices = await r.dbList().run(dbConn);
    feedback.stop();

    ({ dbNames } = await inquirer.prompt({
      choices,
      name: 'dbNames',
      type: 'checkbox',
      message: 'Select one or more databases:'
    }));
  } catch (error) {
    if (feedback.isSpinning) {
      feedback.fail('Can not list databases');
    }

    throw error;
  }

  return dbNames;
}

async function getTables(dbConn, dbNames) {
  const feedback = ora('Finding tables...').start();
  const dbTables = {};

  try {
    let count = 0;

    for (let i = 0, name; i < dbNames.length; i++) {
      name = dbNames[i];
      dbTables[name] = await r.db(name).tableList().run(dbConn);
      count += dbTables[name].length;
    }

    feedback.succeed(`${count} tables found`);
  } catch (error) {
    feedback.fail('Can not find tables');
  }

  return dbTables;
}

async function countDocs(dbConn, dbTables) {
  const feedback = ora('Counting documents...').start();
  var count = 0;

  try {
    let tables;

    for (let dbName in dbTables) {
      tables = dbTables[dbName];

      for (let i = 0, name; i < tables.length; i++) {
        name = tables[i];
        count += await r.db(dbName).table(name).count().run(dbConn);
      }
    }

    feedback.succeed(`${count} documents found`);
  } catch (error) {
    feedback.fail('Can not count documents');
  }

  return count;
}

async function chooseDest(defaul) {
  const { destPath } = await inquirer.prompt({
    default: defaul,
    name: 'destPath',
    message: 'Select the destination file:'
  });

  return destPath;
}

async function dumpDocs(destPath, docsCount, dbConn, dbTables) {
  const progress = new cliProgress.SingleBar({},
      cliProgress.Presets.shades_classic);

  progress.start(docsCount, 0);

  try {
    let output = fs.createWriteStream(destPath);
    let archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    let tables, cursor, doc, buffer;

    for (let dbName in dbTables) {
      tables = dbTables[dbName];

      for (let i = 0, name; i < tables.length; i++) {
        name = tables[i];
        cursor = await r.db(dbName).table(name).run(dbConn);

        while (cursor.hasNext()) {
          doc = await cursor.next();
          buffer = Buffer.from(JSON.stringify(doc, null, 2));

          archive.append(buffer, { name: `${dbName}/${name}/${doc.id}.json` });
          progress.increment();
        }
      }
    }

    await archive.finalize();

    progress.stop();
  } catch (error) {
    progress.stop();
    throw error;
  }
}

main();
