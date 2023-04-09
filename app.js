require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const _ = require('lodash');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

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

userSchema.plugin(passportLocalMongoose);

// userSchema.plugin(encrypt, { secret: process.env.SECRET , encryptedFields: ["password"] });

// collection creation 
const User = mongoose.model('User' , userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.route('/')
.get((req , res) => {
    res.render('home');
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
        res.render('secrets');
    } else {
        console.log('User is not authenticated!');
        res.redirect('/register');
    }

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



// const md5 = require('md5');
    // // const bcrypt = require('bcrypt');
    // const encrypt = require('mongoose-encryption');
// // const saltRounds = 11;


// const username = req.body.username;
    // const password = req.body.password;
    // // const hashpassword = md5(req.body.password);

    // User.findOne({email: username})
    //     .then((foundUser) => {
    //         if (foundUser) {
    //             bcrypt.compare(password, foundUser.password)
    //                 .then( (result) => {
    //                     if (result === true) {
    //                         res.render('secrets');
    //                     } else {
    //                         res.send("Wrong Password!");
    //                    }
    //                 })
    //                 .catch((error) => {
    //                     console.log(error);
    //             })
    //         } else {
    //             res.send("you are not registered");
    //         }
    //     })
    //     .catch((err) => {
    //         console.log(err);
// });


// bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //     });
    //     newUser.save()
    //         .then(() => {
    //             res.render('secrets');
    //         })
    //         .catch((err) => {
    //             console.log(err);
    //     });
// });




// const authenticate = User.authenticate();
            // authenticate(req.body.username, req.body.password, (err, result) => {
            //     if (err) {
            //         res.redirect('/register');
            //         console.log("Authentication err!");
            //     }   else {
            //         res.redirect('/secrets');
            //         console.log("authentication successful!")
            //     }
// });