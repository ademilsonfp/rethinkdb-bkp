
const ora = require('ora');
const r = require('rethinkdb');
const inquirer = require('inquirer');
const archiver = require('archiver');

var db;
var dbName;

async function main() {
  try {
    await connect();
    await chooseDb();
  } catch (error) {
    console.error(error);
  }
}

async function connect() {
  const feedback = ora('Connecting to local RethinkDB...').start();

  try {
    db = await r.connect();
    feedback.succeed('Connected to local RethinkDB');
  } catch (error) {
    feedback.fail('Can not connect to local RethinkDB');
    throw error;
  }
}

async function chooseDb() {
  const feedback = ora('Choosing database...').start();

  try {
    let names = await r.dbList().run(db);
    let choosen = await inquirer.prompt({ choices: names });

    console.log(chosen);
  } catch (error){
    ora.fail(`Can not use database ${dbName}`);
    throw error;
  }
}

main();
