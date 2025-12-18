const express = require('express');
const router = express.Router();

const User = require('../models/user.js');
const List = require('../models/list.js');

const isSignedIn = require('../middleware/is-signed-in.js');

// transforms list of zips from string to list of objects
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

// validates zip codes for /new and /edit
async function validateZip(req) {
  let draft = null
  req.query.draft ? draft = req.session.draft : req.session.draft = null
  let message = null
  if (req.query.error === 'name') message = 'List must have a valid name'
  if (req.query.error === 'duplicate') message = 'You already have a list with this name'

  if (!req.query.error && draft && draft.zip) {
    // reject duplicate zips in list
    for (let location of draft.locations) {
      if (location.zip == draft.zip) {
        message = 'location is already in list'
        return [draft, message]
      }
    }
    // verify valid zip and add to list of zips
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
  return [draft, message]
}



router.get('/new', isSignedIn, async (req, res) => {
  try {
    let output = await validateZip(req)
    let draft = output[0]
    let message = output[1]

    // if (draft && (draft.source !== '/lists/new')) {
    //   return res.render('lists/edit.ejs', { list: draft, message })
    // }
    res.render('lists/new.ejs', { draft, message })
  } catch (error) {
    console.log(error);
    res.redirect('/lists/new?draft=1');
  } 
})

router.post('/', isSignedIn, async (req, res) => {
  try {
    // store draft data in sessions object
    req.session.draft = {
      name: req.body.name.trim(),
      description: req.body.description,
      locations: parser(req.body.locations),
      zip: req.body.zip,
      source: req.body.source,
    }

    // potentially remove location from draft, GET /new
    if (req.body.add || req.body.remove) {
      if (req.body.remove) {
        req.session.draft.locations.splice(Number(req.body.remove), 1)
      }
      if (req.session.draft.source !== '/lists/new') {
        return res.redirect(`${req.body.source}?draft=1`)
      }
      return res.redirect(`/lists/new?draft=1`)
    }

    // reject nameless list while retaining draft data, GET /new
    if (!req.body.name || !req.body.name.trim()) {
      return res.redirect('/lists/new?draft=1&error=name');
    }

    // reject if user already has a list with this name, GET /new
    const selectedUser = await User.findOne({ _id: req.session.user._id });
    const populatedLists = await List.find({
      owner: selectedUser })
      .populate('owner');
    for (let list of populatedLists) {
      if (list.name.toLowerCase() == req.session.draft.name.toLowerCase()) {
        return res.redirect('/lists/new?draft=1&error=duplicate')
      }
    }
    
    // create and save list to database
    const newList = new List(req.session.draft);
    newList.owner = req.session.user._id;
    await newList.save();

    res.redirect('users/profile');

  } catch (error) {
    console.log(error);
    res.redirect('/lists/new?draft=1');
  }
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
    const output = await validateZip(req)
    const draft = output[0]
    const message = output[1]
    let list = null

    if (!draft) {
      list = await List.findById(req.params.listId).populate('owner')
    } else draft._id = req.params.listId

    res.render('lists/edit.ejs', {
      list: draft || list,
      message
    });
  } catch (error) {
    console.error(error);
    res.redirect('../users/profile');
  }
});

router.put('/:listId', isSignedIn, async (req, res) => {
  try {
    console.log('req: ')
    console.log(req.body)
    console.log('listID: ')
    console.log(req.params.listId)

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