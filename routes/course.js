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
		.then(course => res.json(course))
		.catch(err => next(err))
});

router.get('/:courseId', function(req, res, next) {
	Course.findOne({_id: req.params.courseId})
		.populate({
        	path:'reviews',
       		model:'Review'
    	})
		.populate('user')
		.exec((err, course) => err ? next(err) : res.json(course));
});

router.post('/:courseId/reviews', authenticateUser, function(req, res, next) {
	if (!req.body.hasOwnProperty('postedOn')) {
		req.body.postedOn = new Date()
	}
	const userEmail = auth(req).name;
	User.findOne({ emailAddress: userEmail })
		.then(user => {
			const newReview = new Review({
				user: user.id,
				...req.body
			});
			newReview.save(err => {
			  if (err) return next(err);
			  else {
			  	console.log("Document saved.");
			  	Review.findOne({...req.body})
					.then(review => {
						Course.findOne({ _id: req.params.courseId })
						 .then(course => {
						 	const reviewIds = course.reviews.filter(review => review != null);
						 	reviewIds.push(review.id);
						 	Course.update(
								{ _id: req.params.courseId },
								{ reviews: reviewIds },
								(err, numAffected) => {
									if (err) {
										return next(err)
									} else {
										res.status(201);
										res.location(`/${req.params.courseId}`);
										return res.end();
									}
								}
							).catch(err => next(err))
						 }).catch(err => next(err))
					}).catch(err => next(err))
			}})
		}).catch(err => next(err))
});

router.post('/', authenticateUser, function(req, res, next) {
	if (req.body.hasOwnProperty('reviews')) {
		const reviewsToAdd = req.body.reviews;
		delete req.body.reviews;
	}
	const newCourse = new Course({...req.body});
	newCourse.save(
		/*err => {
	  if (err) return next(err);
	  else {
	  	console.log("Document saved.");
	  	res.status(201);
	  	res.location('/');
		return res.end();
	  }
	}*/).then(savedCourse => {
		if (reviewsToAdd.length > 0) {
			const courseId = savedCourse._id;
			// add code to add reviews in reviewsToAdd here
		}
	})
});

router.put('/:courseId', authenticateUser, function(req, res, next) {
	if (Object.entries(req.body).length === 0 && req.body.constructor === Object) {
		const error = {
			message: "Please provide updated course properties in the request body.",
			status: 400
		};
		return next(error);
	} else if (req.body.title === "" || req.body.description === "") {
		const error = {
			message: "Course title and course description cannot be empty.",
			status: 400
		};
		return next(error);
	}
	if (req.body.hasOwnProperty('reviews') && req.body.reviews.length > 0) {
		const allReviewIds = [];
		const reviewsLength = req.body.reviews.length - 1;
		for (let reviewCount = 0; reviewCount <= reviewsLength; reviewCount++) {
			// When updating a course with multiple reviews, occasionally some reviews were not being added.
			// I believe that this bug was caused by the forEach loop firing faster than the nested asynchronous
			// database calls. This caused later reviews in req.body.reviews to overwrite earlier reviews 
			// when the loop started adding a later review to the database before an earlier review was 
			// finished being added. Adding a closure within the forEach loop should preserve the value of
			// reviewToAddAsync 
			// Try the sequential promise async method
			// I tried using the sequential promise async method by
			(function(reviewToAddAsync) {
				if (!reviewToAddAsync.hasOwnProperty('postedOn')) {
					reviewToAddAsync.postedOn = new Date();
				}
				const userEmail = auth(req).name;
				User.findOne({ emailAddress: userEmail })
					.then(user => {
						const newReview = new Review({
							user: user.id,
							...reviewToAddAsync
						});
						newReview.save().then(savedReview => {
						  	Review.findOne({...reviewToAddAsync})
								.then(review => {
									Course.findOne({ _id: req.params.courseId })
									 .then(course => {
									 	allReviewIds.push(review.id);
									 	Course.update(
											{ _id: req.params.courseId },
											{ reviews: allReviewIds },
											(err, numAffected) => { if (err !== null) { console.log(err)}}
										).catch(err => next(err));
									 }).catch(err => next(err));
								}).catch(err => next(err));
								if (reviewCount === reviewsLength) {
									delete req.body.reviews;
									Course.update(
										{ _id: req.params.courseId },
										{ ...req.body },
										(err, numAffected) => {
											if(err) {
												res.send(err);
											} else {
												res.status(204);
												res.end();
											}
										}
									).catch(err => next(err));
								}
						}).catch(err => next(err));
					})
			})(req.body.reviews[reviewCount]);
		}
	} else {
		Course.update(
			{ _id: req.params.courseId },
			{ ...req.body },
			(err, numAffected) => {
				if(err) {
					next(err);
				} else {
					res.status(204);
					res.end();
				}
			}
		).catch(err => next(err));
	}
});

module.exports = router;