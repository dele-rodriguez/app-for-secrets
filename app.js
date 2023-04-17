require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const _ = require('lodash');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'Our little secret.',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false}
}));
app.use(passport.initialize());
app.use(passport.session());

const clusterUsername = process.env.CLUSTER_USERNAME;
const clusterPassword = process.env.CLUSTER_PASSWORD;

const atlasUrl = "mongodb+srv://" + clusterUsername + ":" + clusterPassword + "@cluster0.p0vhcs6.mongodb.net/userDB";

const localUrl = "mongodb://127.0.0.1:27017/userDB"

// connection to mongodb database 
mongoose.connect(atlasUrl)
.then (() => {
    console.log("connected");
})
.catch((err) => {
    console.log(err);
});

// Schema creation 
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, { secret: process.env.SECRET , encryptedFields: ["password"] });

// collection creation 
const User = mongoose.model('User' , userSchema);

passport.use(User.createStrategy());

// passport general quthentication method 
passport.serializeUser((user , done) => {
    done(null , user.id);
});
passport.deserializeUser((id, done) => {
    User.findById(id)
        .then((user) => {
            done(null, user);
        })
        .catch ((err) => {
            done(err, null);
            console.log(err);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.route('/')
.get((req , res) => {
    res.render('home');
});

app.route('/auth/google')
.get(passport.authenticate('google' , { scope: ['profile'] }));

app.route('/auth/google/secrets')
.get(passport.authenticate('google', { failureRedirect: '/login' }) , (req , res) => {
    res.redirect('/secrets');
});

app.route('/login')
.get((req ,res) => {
    res.render('login');
})
.post((req , res) => {
    const user = new User({
        username: req.body.username ,
        password: req.body.password
    });

    req.login(user , function(err){
        if(err) {
            console.log(err);
        } else {
            passport.authenticate('local')(req, res, () => {
                res.redirect('/secrets');
            });
        }
    });
});

app.route('/register')
.get((req , res) => {
    res.render('register');
})
.post((req , res) => {
    User.register({username: req.body.username }, req.body.password , (err, user) => {
        if (err) {
            console.log(err);
            res.redirect('/register');
        } else {
            console.log('successfully registered')

            passport.authenticate('local')(req, res, function() {
                res.redirect('/secrets');
            });
        }
    });
});

app.route('/secrets')
.get((req , res) => {
    if (req.isAuthenticated()){
        console.log('User is authenticated!');
        User.find({"secret": {$ne: null}})
            .then((foundUsers) => {
                res.render('secrets' , {usersWithSecrets: foundUsers});
            })
            .catch((err) => {
                console.log(err);
        });
    } else {
        console.log('User is not authenticated!');
        res.redirect('/register');
    }

});

app.route('/submit')
.get((req , res) => {
    if (req.isAuthenticated()){
        console.log('User is authenticated!');
        res.render('submit');
    } else {
        console.log('User is not authenticated!');
        res.redirect('/register');
    }
})
.post((req , res) => {
    const submittedSecret = req.body.secret;
    // console.log(req.user);

    User.findById(req.user.id)
        .then((foundUser) => {
            foundUser.secret = submittedSecret;
            foundUser.save().then(() => {
                res.redirect('/secrets');
            });

        })
        .catch((err) => {
            console.log(err);
    });
});

app.route('/logout')
.get((req , res) => {
    req.logout(() => {
        console.log('User logged out');
    });
    res.redirect('/');
});


app.listen(3000 , () => {
    console.log("Server is up and running!");
});
