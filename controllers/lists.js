const express = require('express');
const router = express.Router();

const User = require('../models/user.js');
const List = require('../models/list.js');

const isSignedIn = require('../middleware/is-signed-in.js');

function parser(locationsString) {
  if (locationsString && locationsString.includes('#')) {
    let locationsList = []
    let split = locationsString.split('#')
    for (let i = 0; i < split.length; i++) {
      if (!split[i]) continue

      let splitLocation = split[i].split('@')
      let location = {
        name: splitLocation[0],
        zip: splitLocation[1]
      }
      locationsList.push(location)
    }
    return locationsList
  } else {
    return []
  }
}



router.get('/new', isSignedIn, async (req, res) => {
  try {
    const draft = req.session.draft
    req.session.draft = null
    let message = null
    let tryFetch = true

    console.log(draft)

    if (draft && draft.zip) {
      for (let location of draft.locations) {
        if (location.zip == draft.zip) {
          message = 'location is already in list'
          tryFetch = false
          break
        }
      }
      if (tryFetch) {
        const url = `https://api.openweathermap.org/data/2.5/weather?zip=${draft.zip},us&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod !== 200) {
          message = 'invalid location'
        } else {
          draft.locations.push({
            name: data.name,
            zip: draft.zip
          })
        }
      }
    }
    res.render('lists/new.ejs', {
      draft,
      message,
    })
  } catch (error) {
    console.log(error);
    res.redirect('/lists/new');
  } 
})

router.post('/', isSignedIn, async (req, res) => {
  try {
    req.body.locations = parser(req.body.locations)

    const newList = new List(req.body);
    newList.owner = req.session.user._id;
    await newList.save();

    res.redirect('users/profile');

  } catch (error) {
    console.log(error);
    res.redirect('/lists/new');
  }
});

router.post('/new_add', isSignedIn, (req, res) => {
  req.session.draft = {
    name: req.body.name,
    description: req.body.description,
    locations: req.body.locations,
    zip: req.body.zip,
  }
  req.session.draft.locations = parser(req.body.locations)

  res.redirect(`/lists/new`);
});

router.post('/new_remove', isSignedIn, (req, res) => {
  req.session.draft = {
    name: req.body.name,
    description: req.body.description,
    locations: req.body.locations,
    zip: req.body.zip,
  }
  req.session.draft.locations = parser(req.body.locations)
  req.session.draft.locations.splice(Number(req.body.remove), 1)

  res.redirect(`/lists/new`);
});

router.get('/:listId', isSignedIn, async (req, res) => {
  try {
    const list = await List.findById(req.params.listId).populate('owner')

    let weatherData = []
    for (let location of list.locations) {
      const url = `https://api.openweathermap.org/data/2.5/weather?zip=${location['zip']},us&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      weatherData.push(data)
    }
    res.render('lists/show.ejs', {
      user: req.session.user,
      list,
      data: weatherData,
    })
  } catch (error) {
    console.log(error);
    res.redirect('../users/profile');
  }
});

router.delete('/:listId', isSignedIn, async (req, res) => {
  try {
    const list = await List.findById(req.params.listId);
    if (list.owner.equals(req.session.user._id)) {
      await list.deleteOne();
      res.redirect('../users/profile');
    } else {
      res.send("You don't have permission to do that.");
    }
  } catch (error) {
    console.error(error);
    res.redirect('../users/profile');
  }
});

router.get('/:listId/edit', isSignedIn, async (req, res) => {
  try {
    const list = await List.findById(req.params.listId)
    .populate('owner')
    let message = undefined

    res.render('lists/edit.ejs', {
      list,
      message
    });
  } catch (error) {
    console.error(error);
    res.redirect('../users/profile');
  }
});

router.put('/:listId', isSignedIn, async (req, res) => {
  try {
    const currentList = await List.findById(req.params.listId);
    
    if (currentList.owner.equals(req.session.user._id)) {
      await currentList.updateOne(req.body);
      res.redirect(`/lists/${req.params.listId}`);
    } else {
      res.send("You don't have permission to do that.");
    }
  } catch (error) {
    console.log(error);
    res.redirect(`/lists/${req.params.listId}`);
  }
});

module.exports = router;