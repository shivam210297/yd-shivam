const express = require('express');
const route = require('./routes/dashboard');
const categories_route = require('./routes/category')
const jwt = require('jsonwebtoken');
const jwt_decode = require('jwt-decode')
const {pool} = require('./db/testdb');
const bcrypt = require('bcrypt')

const app = express();

app.use(express.json());
app.use((req, res, next) => {
    console.log(req.url)
    next()
})
app.use("/dashboard", route);
app.use("/dashboard/category",categories_route);

app.listen(3000, () => {
    console.log("listening at 3000");
})
