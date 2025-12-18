const User = require('../models/user.js');
const List = require('../models/list.js');

async function validateListName(reqBody, reqSession) {
  // reject nameless list while retaining draft data, GET /new
  if (!reqBody.name || !reqBody.name.trim()) {
    return [false, `${reqBody.source}?draft=1&error=name`]
  }

  // reject if user already has a list with this name, GET /new
  const selectedUser = await User.findOne({ _id: reqSession.user._id });
  const populatedLists = await List.find({
    owner: selectedUser })
    .populate('owner');
  for (let list of populatedLists) {
    if (list.name.toLowerCase() == reqSession.draft.name.toLowerCase()) {
      // allow duplicate name if it is the name of the list the user is editing
      if (list._id == reqBody.source.split('/')[2]) break
      return [false, `${reqBody.source}?draft=1&error=duplicate`]
    }
  }
  return [true]
}

module.exports = validateListName