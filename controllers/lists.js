const express = require('express')
const router = express.Router()

const User = require('../models/user.js')
const List = require('../models/list.js')

const isSignedIn = require('../middleware/is-signed-in.js')
const validateZip = require('../functions/validateZip.js')
const parseSession = require('../functions/parseSession.js')
const validateListName = require('../functions/validateListName.js')

router.get('/new', isSignedIn, async (req, res) => {
  try {
    let output = await validateZip(req)
    let draft = output[0]
    let message = output[1]

    res.render('lists/new.ejs', { draft, message })
    
  } catch (error) {
    console.log(error)
    res.redirect('/lists/new?draft=1')
  }
})

router.post('/', isSignedIn, async (req, res) => {
  try {
    console.log(req.body)
    req.session.draft = await parseSession(req.body)

    if (req.body.add || req.body.remove) {
      if (req.body.remove) req.session.draft.locations.splice(Number(req.body.remove), 1)
      return res.redirect(`/lists/new?draft=1`)
    }

    let nameValid = await validateListName(req.body, req.session)
    if (!nameValid[0]) return res.redirect(nameValid[1])
    
    const newList = new List(req.session.draft)
    newList.owner = req.session.user._id
    await newList.save()

    res.redirect('users/profile')

  } catch (error) {
    console.log(error)
    res.redirect('/lists/new?draft=1')
  }
})

router.get('/:listId', isSignedIn, async (req, res) => {
  try {
    const list = await List.findById(req.params.listId).populate('owner')

    let weatherData = []
    for (let location of list.locations) {
      const url = `https://api.openweathermap.org/data/2.5/weather?zip=${location['zip']},us&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`
      const response = await fetch(url)
      const data = await response.json()
      weatherData.push(data)
    }
    res.render('lists/show.ejs', {
      user: req.session.user,
      list,
      data: weatherData,
    })
  } catch (error) {
    console.log(error)
    res.redirect('../users/profile')
  }
})

router.delete('/:listId', isSignedIn, async (req, res) => {
  try {
    const list = await List.findById(req.params.listId)
    if (list.owner.equals(req.session.user._id)) {
      await list.deleteOne()
      res.redirect('../users/profile')
    } else {
      res.send("You don't have permission to do that.")
    }
  } catch (error) {
    console.error(error)
    res.redirect('../users/profile')
  }
})

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
    })
  } catch (error) {
    console.error(error)
    res.redirect('../users/profile')
  }
})

router.put('/:listId', isSignedIn, async (req, res) => {
  try {
    req.session.draft = await parseSession(req.body)

    if (req.body.add || req.body.remove) {
      if (req.body.remove) req.session.draft.locations.splice(Number(req.body.remove), 1)
      return res.redirect(`${req.body.source}?draft=1`)
    }

    let nameValid = await validateListName(req.body, req.session)
    if (!nameValid[0]) return res.redirect(nameValid[1])

    const currentList = await List.findById(req.params.listId)
    if (currentList.owner.equals(req.session.user._id)) {
      await currentList.updateOne(req.session.draft)
      res.redirect(`/lists/${req.params.listId}`)
    } else {
      res.send("You don't have permission to do that.")
    }
  } catch (error) {
    console.log(error)
    res.redirect(`/lists/${req.params.listId}`)
  }
})

module.exports = router