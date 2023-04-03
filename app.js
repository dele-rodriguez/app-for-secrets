require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const _ = require('lodash');
const ejs = require('ejs');
const encrypt = require('mongoose-encryption');
const app = express();


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// connection to mongodb database 
mongoose.connect('mongodb://127.0.0.1:27017/userDB')
.then (() => {
    console.log("connected");
})
.catch((err) => {
    console.log(err);
});

// Schema creation 
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


userSchema.plugin(encrypt, { secret: process.env.SECRET , encryptedFields: ["password"] });

// collection creation 
const User = mongoose.model('User' , userSchema);

app.route('/')
.get((req , res) => {
    res.render('home');
});

app.route('/login')
.get((req ,res) => {
    res.render('login');
})
.post((req , res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username})
        .then((foundUser) => {
            if (foundUser.password === password) {
                res.render('secrets');
            } else {
                res.send("you are not registered");
            }
        })
        .catch((err) => {
            console.log(err);
    });
});

app.route('/register')
.get((req , res) => {
    res.render('register');
})
.post((req , res) => {
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newUser.save()
        .then(() => {
            res.render('secrets');
        })
        .catch((err) => {
            console.log(err);
    });
});


app.listen(3000 , () => {
    console.log("Server is up and running!");
});