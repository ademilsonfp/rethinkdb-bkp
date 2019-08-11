
const ora = require('ora');
const r = require('rethinkdb');
const inquirer = require('inquirer');
const archiver = require('archiver');

var db;

async function main() {
  try {
    await connect();
  } catch (error) {
    console.error(error);
  }
}

async function connect() {
  const feedback = ora('Connecting to local RethinkDB');

  try {
    db = await r.connect();
    feedback.succeed('Connected to local RethinkDB');
  } catch (error) {
    feedback.fail('Can not connect to local RethinkDB');
    throw error;
  }
}

async function chooseDb() {

}

main();
