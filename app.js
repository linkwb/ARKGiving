require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require('passport-facebook').Strategy;
const flash = require('connect-flash');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: 'Our little secret.',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

mongoose.connect("mongodb+srv://admin-will:fMswrK9eHKaxtCub@requests.iaqjw.mongodb.net/requestsDB?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set('useCreateIndex', true);

/* Request & User Schemas
 ***********************************/
const requestsSchema = {
  fName: String,
  lName: String,
  email: String,
  phone: String,
  need: String,
  payment: String
};

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

/* Request & User Models
 ***********************************/
const Request = mongoose.model('Request', requestsSchema);
const User = new mongoose.model("User", userSchema);

const test = new Request({
  fName: "Yay!",
  lName: "",
  email: "",
  phone: "",
  need: "All the needs have been fulfilled!",
  payment: ""
});

passport.use(User.createStrategy());


/* Serialize & Deserialize User
 ***********************************/
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

/* Authentication Strategies
 ***********************************/
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    //callbackURL: "http://localhost:3000/auth/google/arkgiving",
    callbackURL: "https://arkgiving.herokuapp.com/auth/google/arkgiving",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      username: profile.displayName,
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FB_APP_ID,
    clientSecret: process.env.FB_APP_SECRET,
    //callbackURL: "http://localhost:3000/auth/facebook/arkgiving",
    callbackURL: "https://arkgiving.herokuapp.com/auth/facebook/arkgiving"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      username: profile.displayName,
      facebookId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

/* Get Requests
 ***********************************/
app.get("/", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("index")
  } else {
    res.redirect("/login");
  }
});

app.get("/login", function(req, res) {
  res.render("login")
});

app.get("/register", function(req, res) {
  res.render("register", {
    message: req.flash('error')
  });
});

app.get("/give", function(req, res) {
  if (req.isAuthenticated()) {
    Request.find({}, function(err, foundRequests) {
      //First time rendering, if no items in database, add test item. Otherwise, render the list of items.
      //Prevents continual addition of the default items.
      if (foundRequests.length === 0) {
        test.save(function(err) {
          if (err) {
            console.log(err)
          } else {
            console.log("Successfully saved test items to DB.");
          }
        });
        res.redirect("/give");
      } else { //Did not add test item to DB. Successful setup.
        res.render("give", {
          newRequests: foundRequests
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/request", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("request");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res) {
  req.logout();
  res.render("logout");
});

app.get('/flash', function(req, res) {
  req.flash('error', 'That username is already taken.')
  res.redirect('/register');
});

//Google
app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile"]
}));

app.get("/auth/google/arkgiving",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
  });

//Facebook
app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/arkgiving',
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

/* Give Post Request
 ***********************************/
app.post("/give", function(req, res) {

  const fName = req.body.fName;
  const lName = req.body.lName;
  const phone = req.body.phone;
  const email = req.body.email;
  const need = req.body.need;
  const payment = req.body.payment;

  const request = new Request({
    fName: fName,
    lName: lName,
    phone: phone,
    email: email,
    need: need,
    payment: payment
  });

  request.save();
  res.redirect("/give");

});

/* Delete Post Request
 ***********************************/
app.post("/delete", function(req, res) {

  const sentRequestId = req.body.submit;

  Request.findByIdAndRemove(sentRequestId, function(err) {
    if (err) {
      console.log(err);
    } else { //Successfully removed request
      res.redirect("/give");
    }
  });
});

/* Register & Login Post Requests
 ***********************************/
app.post("/register", function(req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/flash")
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      })
    }
  })
});

app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });
});

/* Port Settings
 ***********************************/
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started successfully.");
});