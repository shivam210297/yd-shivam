const {Pool} = require('pg');

const pool2 = new Pool({
    user:"postgres",
    host:"yd-dev.cvkv1tylogbw.ap-south-1.rds.amazonaws.com",
    database : "yourdaily",
    password : "password123",
    port :"5432"
});

module.exports = {pool2};