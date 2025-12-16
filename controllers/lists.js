const express = require('express');
const router = express.Router();

const User = require('../models/user.js');
const List = require('../models/list.js');

const isSignedIn = require('../middleware/is-signed-in.js');



router.get('/new', isSignedIn, async (req, res) => {
  res.render('lists/new.ejs')
});

router.post('/', isSignedIn, async (req, res) => {
  try {
    const newList = new List(req.body);
    newList.owner = req.session.user._id;
    await newList.save();

    res.redirect('users/profile');

  } catch (error) {
    console.log(error);
    res.redirect('lists/new');
  }
});

router.put('/:listId', isSignedIn, async (req, res) => {
  console.log(req.params.listId)
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

router.get('/:listId', isSignedIn, async (req, res) => {
  try {
    const list = await List.findById(req.params.listId)
    .populate('owner')

    res.render('lists/show.ejs', {
      user: req.session.user,
      list,
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

    res.render('lists/edit.ejs', {
      list
    });
  } catch (error) {
    console.error(error);
    res.redirect('../users/profile');
  }
});

router.put('/:listId', isSignedIn, async (req, res) => {
  console.log(req.params.listId)
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