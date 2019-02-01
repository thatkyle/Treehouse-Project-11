const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  emailAddress: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    required: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address.'],
  },
  password: {
    type: String,
    required: true,
  },
});

userSchema.statics.authenticate = (email, password, callback) => {
	User.findOne({ emailAddress: email })
		.exec((err, user) => {
      if (err) {
        return callback(err);
      } else if ( !user ) {
				const err404 = {
          message: "User not found.",
          status: 404
        }
				return callback(err404);
			};
			bcrypt.compare(
				password,
				user.password,
				(error, result) => {
          if (result === true) {
            callback(null, user)
          } else {
            const error = {
              message: "Invalid credentials",
              status: 401
            }
            callback(error);
          }
        }
		)});
}

userSchema.pre('save', function(next) {
  const user = this;
  bcrypt.hash(user.password, 10, function(err, hash) {
    if (err) return next(err);
    user.password = hash;
    next();
  })
});

userSchema.post('save', function(error, doc, next) {
  next(error);
});

const User = mongoose.model('User', userSchema);

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  postedOn: {
    type: Date,
    default: new Date(),
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: String,
});

const Review = mongoose.model('Review', reviewSchema);

// const reviewIds = [];
// Review.find({}).lean().exec(function(error, records) {
//   records.forEach(record => reviewIds.push(record._id));
// });
const getReviewIds = () => {
	const reviewIds = [];
	Review.find({}).lean().exec(function(error, records) {
	  records.forEach(record => reviewIds.push(record._id));
	});
	return reviewIds;
};

const courseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  estimatedTime: String,
  materialsNeeded: String,
  steps: [{
    stepNumber: Number,
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true
    }
  }],
  reviews: getReviewIds()
});

courseSchema.post('save', function(error, doc, next) {
  next(error);
});

const Course = mongoose.model('Course', courseSchema);

module.exports.User = User;
module.exports.Review = Review;
module.exports.Course = Course;