const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');
const express = require('express');
const router = express.Router();

const User = require("../models").User;
const Review = require("../models").Review;
const Course = require("../models").Course;

const authenticateUser = (req, res, next) => {
  const credentials = auth(req);
  if (credentials) {
    User.authenticate(credentials.name, credentials.pass, function(error, user){
      if (!error && user) {
        req.currentUser = user;
        next();
      } else {
        console.log(error);
        res.status(error.status || 401).json({ ...error });
      }
    });
  } else {
    const error = {
      message: "Credentials / Authorization Header not provided. Please provide and try again.",
      status: 401
    };
    next(error);
  }
};

router.get('/', authenticateUser, function(req, res, next) {
	  const user = req.currentUser;
	  const credentials = auth(req);
	  res.json({
	    name: user.fullName,
	    username: user.emailAddress,
	  });
});

router.post('/', function(req, res, next) {
	// const user = req.body;
	// user.password = bcryptjs.hashSync(user.password, 10);
	const newUser = new User({...req.body});
	newUser.save(err => {
	  if (err) return next(err);
	  else {
	  	console.log("Document saved.");
	  	res.location('/');
		  return res.status(201).end();
	  }
	});
});

module.exports = router;