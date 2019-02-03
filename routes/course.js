const express = require('express');
const auth = require('basic-auth');
const bcryptjs = require('bcryptjs');
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

router.get('/', function(req, res, next) {
	Course.find({})
		.then(course => course.map(course => ({_id: course._id, title: course.title})))
		.then(course => res.json(course));
});

router.get('/:courseId', function(req, res, next) {
	Course.findOne({_id: req.params.courseId})
		.populate({
        	path:'reviews',
       		model:'Review'
    	})
		.populate('user')
		.exec((err, course) => err ? res.send(err) : res.json(course));
});

router.post('/:courseId/reviews', authenticateUser, function(req, res, next) {
	const timePosted = new Date();
	const userEmail = auth(req).name;
	User.findOne({ emailAddress: userEmail })
		.then(user => {
			const newReview = new Review({
				user: user.id,
				postedOn: timePosted,
				...req.body
			});
			newReview.save(err => {
			  if (err) return next(err);
			  else {
			  	console.log("Document saved.");
			  	Review.findOne({postedOn: timePosted})
					.then(review => {
						Course.findOne({ _id: req.params.courseId })
						 .then(course => {
						 	const reviewIds = course.reviews.map(review => review._id);
						 	reviewIds.push(review.id);
						 	Course.update(
								{ _id: req.params.courseId },
								{ reviews: reviewIds },
								(err, numAffected) => {
									if (err) {
										res.send(err)
									} else {
										res.location('/');
										res.end();
									}
								}
							).catch(err => next(err));
						 })
					})
			}})
		})
});

router.post('/', authenticateUser, function(req, res, next) {
	const newCourse = new Course({...req.body});
	newCourse.save(err => {
	  if (err) return next(err);
	  else {
	  	console.log("Document saved.");
	  	res.location('/');
		res.end();
	  }
	});
});

router.put('/:courseId', authenticateUser, function(req, res, next) {
	console.log(req.params);
	if (Object.entries(req.body).length === 0 && req.body.constructor === Object) {
		const error = {
			message: "Please provide updated course properties in the request body.",
			status: 400
		};
		return next(error);
	} else if (req.body.title === "" || req.body.description === ""){
		const error = {
			message: "Course title and course description cannot be empty.",
			status: 400
		};
		return next(error);
	}
	Course.update(
		{ _id: req.params.courseId },
		{ ...req.body },
		(err, numAffected) => err ? res.send(err) : res.end()
	).catch(err => next(err));
});

module.exports = router;