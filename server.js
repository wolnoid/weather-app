const dotenv = require('dotenv')
dotenv.config()
const express = require('express')
const app = express()
const mongoose = require('mongoose')
const methodOverride = require('method-override')
const session = require('express-session')
const MongoStore = require("connect-mongo").default

const List = require('./models/list.js')
const User = require('./models/user.js')

const isSignedIn = require("./middleware/is-signed-in.js")
const passUserToView = require("./middleware/pass-user-to-view.js")
const parseSession = require('./functions/parseSession.js')

const authController = require('./controllers/auth.js')
const usersController = require('./controllers/users.js')
const listsController = require('./controllers/lists.js')

const port = process.env.PORT || '3000'
const path = require('path');

mongoose.connect(process.env.MONGODB_URI)
mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`)
})

app.use(express.urlencoded({ extended: false }))
app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
    }),
  })
)

app.use(passUserToView)
app.use('/auth', authController)
app.use('/users', usersController)
app.use('/lists', listsController)



app.get("/", (req, res) => {
  res.render("index.ejs", {
    message: req.query.error
  })
})

app.post('/', (req, res) => {
  const zip = req.body.zip
  res.redirect(`/weather/${zip}`)
})

app.get('/weather/:zip', async (req, res) => {
  try {
    const zip = req.params.zip
    const url = `https://api.openweathermap.org/data/2.5/weather?zip=${zip},us&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.cod !== 200) {
      return res.redirect('/?error=' + encodeURIComponent('invalid location'))
    }

    let populatedLists = []
    if (req.session.user && req.session.user._id) {
      const selectedUser = await User.findById(req.session.user._id)
      populatedLists = await List.find({ owner: selectedUser }).populate('owner')
    }

    let message = null
    if (req.query.error == 'duplicate') message = 'Location is already in list'
    if (req.query.message == 'added') message = 'Location added to list'

    res.render('show.ejs', {
      name: data.name,
      zip,
      main: data.main,
      weather: data.weather[0],
      lists: populatedLists,
      message
    })
  } catch (err) {
    console.log(err)
    res.redirect('/')
  }
})

app.post('/weather/:zip', async (req, res) => {
  const zip = req.params.zip

  if (req.body.listId == 'new list') {
    // add zip to sessions object, GET /new
    req.session.draft = await parseSession(req.body)
    req.session.draft.name = null
    res.redirect(`/lists/new?draft=1`)
  } else {
    // Add new location to existing list
    const currentList = await List.findById(req.body.listId)
    if (currentList.owner.equals(req.session.user._id)) {
      for (let location of currentList.locations) {
        if (location.zip == zip) {
          return res.redirect(`/weather/${zip}?error=duplicate`)
        }
      }
      currentList.locations.push({name: req.body.name, zip})
      await currentList.save()
      res.redirect(`/weather/${zip}?message=added`)
    } else {
      res.send("You don't have permission to do that.")
    } 
  }
})

app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`)
})