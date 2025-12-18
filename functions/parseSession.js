// parse req object and store in session object
function parseSession(reqBody) {
  // transforms list of zips from string to list of objects
  function parseList(locationsString) {
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
  draft = {
    name: reqBody.name.trim(),
    description: reqBody.description,
    locations: parseList(reqBody.locations),
    zip: reqBody.zip,
    source: reqBody.source,
  }
  return draft
}

module.exports = parseSession