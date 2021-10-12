const {Pool} = require('pg');

const pool = new Pool({
    user:"shivam",
    host:"localhost",
    database : "yd",
    password : "shivam",
    port :"5432"
});

module.exports = {pool};