const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://admin-will:fMswrK9eHKaxtCub@requests.iaqjw.mongodb.net/requestsDB?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

//Request Schema & Model
const requestsSchema = {
  fName: String,
  lName: String,
  email: String,
  phone: String,
  need: String,
  payment: String
};

const Request = mongoose.model('Request', requestsSchema);

const test = new Request({
  fName: "Yay!",
  lName: "",
  email: "",
  phone: "",
  need: "All the needs have been fulfilled! Yay!",
  payment: ""
});

app.get("/", function(req, res) {
  res.render("index");
});

app.get("/give", function(req, res) {
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
});

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

//Delete item from list once "Need Fulfilled!" button is clicked
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

app.get("/request", function(req, res) {
  res.render("request");
});

app.listen(3000, function() {
  console.log("Server has started on port 3000.");
});