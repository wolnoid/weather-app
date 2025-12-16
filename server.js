const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const session = require('express-session');
const MongoStore = require("connect-mongo").default;



const List = require('./models/list.js');
const User = require('./models/user.js');




const isSignedIn = require("./middleware/is-signed-in.js");
const passUserToView = require("./middleware/pass-user-to-view.js");

const authController = require('./controllers/auth.js');
const usersController = require('./controllers/users.js');
const listsController = require('./controllers/lists.js');

const port = process.env.PORT || '3000';

mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});

app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
    }),
  })
);

app.use(passUserToView);
app.use('/auth', authController);
app.use('/users', usersController);
app.use('/lists', listsController);





app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.post('/weather', async (req, res) => {
  try {
    const zip = req.body.zip
    const url = `https://api.openweathermap.org/data/2.5/weather?zip=${zip},us&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`
    
    const response = await fetch(url);
    const data = await response.json();

    console.log(data)
    console.log(typeof data)
    console.log(data.coord)
    console.log(typeof data.coord)

    const selectedUser = await User.findOne({ _id: req.session.user._id });
    const populatedLists = await List.find({
      owner: selectedUser
    }).populate('owner');

    res.render('show.ejs', {
        name: data.name,
        main: data.main,
        weather: data.weather[0],
        lists: populatedLists,
    });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`);
});