'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const jsonParser = require("body-parser").json;
const session = require("express-session");

// Express setup
  // Routes setup
const courseRouter = require('../routes/course');
const userRouter = require('../routes/user');

const app = express();

// set our port
app.set('port', process.env.PORT || 5000);

// morgan gives us http request logging
app.use(morgan('dev'));

app.use(jsonParser());
app.use(session({
  secret: 'Treehouse',
  resave: true,
  saveUninitialized: false
}));

// TODO add additional routes here
app.use('/api/courses', courseRouter);
app.use('/api/users', userRouter);

// send a friendly greeting for the root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Course Review API'
  });
});

// uncomment this route in order to test the global error handler
// app.get('/error', function (req, res) {
//   throw new Error('Test error');
// });

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found'
  })
})

// global error handler
app.use((err, req, res, next) => {
  console.log(err);
  return res.status(err.status || 400).json({...err});
});


// connect mongodb
mongoose.connect('mongodb://localhost:27017/course-api', { useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("Connected to Mongo Database at mongodb://localhost:27017/course-api");
});

// start listening on our port
const server = app.listen(app.get('port'), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});
