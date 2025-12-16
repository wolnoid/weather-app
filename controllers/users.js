const express = require('express');
const router = express.Router();

const User = require('../models/user.js');
const List = require('../models/list.js');

const isSignedIn = require('../middleware/is-signed-in.js');



router.get('/profile', isSignedIn, async (req, res) => {
  try {
    const selectedUser = await User.findOne({ _id: req.session.user._id });
    const populatedLists = await List.find({
      owner: selectedUser })
      .populate('owner');
    
    res.render('lists/index.ejs', {
      user: req.session.user,
      lists: populatedLists,
    });
  } catch (error) {
    console.log(error);
    res.redirect('/');
  }
});

module.exports = router;