const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const Candidate = require("./../models/UserModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("./../utils/email");
const axios = require("axios");

// ##########################
//        JWT creators
// ##########################
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  const expiry = new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  );
  res.cookie("jwt", token, {
    expires: expiry,
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  // Remove password from output
  user.password = expiry;

  res.status(statusCode).json({
    status: "success",
    token,
    user,
  });
};

// ##########################
//        Sign Up
// ##########################

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await Candidate.create({
    fullName: req.body.fullName,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  });

  const url = `${req.protocol}://${req.get("host")}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

// ##########################
//        Sign In
// ##########################
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // console.log(req.body);

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }
  // 2) Check if candidate exists && password is correct
  const candidate = await Candidate.findOne({ email }).select("+password");
  // console.log(candidate.password, password);
  if (
    !candidate ||
    !(await candidate.correctPassword(password, candidate.password))
  ) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(candidate, 200, req, res);
});

// ##########################
//        Sign Out
// ##########################
exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

// ##########################
//      Signed In Checker
// ##########################
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if candidate still exists
  const currentUser = await Candidate.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The candidate belonging to this token does no longer exist.",
        401
      )
    );
  }

  // 4) Check if candidate changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        "Candidate recently changed password! Please log in again.",
        401
      )
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.candidate = currentUser;
  res.locals.candidate = currentUser;
  next();
});

// ##################################
//       Authenticated Checker
// ###################################
// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if candidate still exists
      const currentUser = await Candidate.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if candidate changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.candidate = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// ##################################
//       Restriction Checker
// ###################################
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

// ##################################
//       Forgot Password
// ###################################
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get candidate based on POSTed email
  const candidate = await Candidate.findOne({ email: req.body.email });
  if (!candidate) {
    return next(new AppError("There is no candidate with email address.", 404));
  }

  // 2) Generate the random reset token
  const resetToken = candidate.createPasswordResetToken();
  await candidate.save({ validateBeforeSave: false });

  // 3) Send it to candidate's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/users/resetPassword/${resetToken}`;
    await new Email(candidate, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    candidate.passwordResetToken = undefined;
    candidate.passwordResetExpires = undefined;
    await candidate.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

// ##################################
//       Reset Password
// ###################################
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get candidate based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const candidate = await Candidate.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is candidate, set the new password
  if (!candidate) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  candidate.password = req.body.password;
  candidate.passwordConfirm = req.body.passwordConfirm;
  candidate.passwordResetToken = undefined;
  candidate.passwordResetExpires = undefined;
  await candidate.save();

  // 3) Update changedPasswordAt property for the candidate
  // 4) Log the candidate in, send JWT
  createSendToken(candidate, 200, req, res);
});

// ##################################
//       Update Password
// ###################################
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get candidate from collection
  const candidate = await Candidate.findById(req.candidate.id).select(
    "+password"
  );

  // 2) Check if POSTed current password is correct
  if (
    !(await candidate.correctPassword(
      req.body.passwordCurrent,
      candidate.password
    ))
  ) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  // 3) If so, update password
  candidate.password = req.body.password;
  candidate.passwordConfirm = req.body.passwordConfirm;
  await candidate.save();
  // Candidate.findByIdAndUpdate will NOT work as intended!

  // 4) Log candidate in, send JWT
  createSendToken(candidate, 200, req, res);
});

// ##################################
//       GOOGLE OAuth
// ###################################
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.googleLogin = (req, res) => {
  const { idToken } = req.body;

  client
    .verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
    .then((response) => {
      const { email_verified, name, email } = response.payload;
      if (email_verified) {
        Candidate.findOne({ email }).exec((err, candidate) => {
          if (candidate) {
            const url = `${req.protocol}://${req.get("host")}/me`;
            new Email(candidate, url).sendWelcome();
            createSendToken(candidate, 200, req, res);
          } else {
            let password = email + process.env.JWT_SECRET;

            candidate = new Candidate({
              email,
              password,
              confirmPassword: password,
              fullName: name,
            });
            candidate.save((err, data) => {
              if (err) {
                console.log("ERROR GOOGLE LOGIN ON USER SAVE", err);
                return res.status(400).json({
                  error: "Candidate signup failed with google",
                });
              }
              const url = `${req.protocol}://${req.get("host")}/me`;
              new Email(data, url).sendWelcome(emailErr);
              createSendToken(data, 200, req, res);
            });
          }
        });
      } else {
        return res.status(400).json({
          error: "Google login failed. Try again",
        });
      }
    });
};

// ##################################
//       FACEBOOK OAuth
// ###################################
exports.facebookLogin = (req, res) => {
  console.log("FACEBOOK LOGIN REQ BODY", req.body);
  const { userID, accessToken } = req.body;

  const url = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`;

  return axios(url, {
    method: "GET",
  })
    .then((response) => response.json())
    .then((response) => {
      const { email, name } = response;
      Candidate.findOne({ email }).exec((err, candidate) => {
        if (candidate) {
          createSendToken(candidate, 200, req, res);
        } else {
          let password = email + process.env.JWT_SECRET;
          candidate = new Candidate({ name, email, password });
          candidate.save((err, data) => {
            if (err) {
              console.log("ERROR FACEBOOK LOGIN ON USER SAVE", err);
              return res.status(400).json({
                error: "Candidate signup failed with facebook",
              });
            }
            createSendToken(data, 200, req, res);
          });
        }
      });
    })
    .catch((error) => {
      res.json({
        error: "Facebook login failed. Try later",
      });
    });
};
