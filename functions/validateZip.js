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

module.exports = validateZip