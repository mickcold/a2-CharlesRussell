const http = require('http'),
      fs   = require('fs'),
      // IMPORTANT: you must run `npm install` in the directory for this assignment
      // to install the mime library if you're testing this on your local machine.
      // On Render, make sure `npm install` is your build command.
      mime = require('mime'),
      dir  = 'public/',
      port = 3000


//Milliseconds per day
const MS_PER_DAY = 24 * 60 * 60 * 1000

const appdata = []

let nextId = 1

//Calculates the days remaining to complete the task from the creation date and the due date
const deriveDaysRemaining = function(row) {
  const created = new Date(row.created_date),
        due     = new Date(row.due_date)

  row.days_remaining = Math.round((due - created) / MS_PER_DAY)

  return row
}

//Builds the tasks with the user inputted data and the id
const buildRow = function(incoming, id) {
  //Verifies the datatype is a string if thats true whitespace is cut off, if false task equals an empty string
  const task = typeof incoming.task === 'string' ? incoming.task.trim() : ''

  //Checks if the task is empty and returns null if so
  if (task === '') {
    return null
  }

  //If the creation date is valid get the first 10 characters which form the date without a time, if its invalid it makes the creation date according to the system clock
  const created_date = isValidDate(incoming.created_date)
    ? incoming.created_date.slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  //If the due date is valid get the first 10 characters which form the date without a time, if its invalid it makes the due date seven days from the creation date
  const due_date = isValidDate(incoming.due_date)
    ? incoming.due_date.slice(0, 10)
    : addDays(created_date, 7)

  return deriveDaysRemaining({id, task, created_date, due_date})
}

//A helper function for buildRow for when there's an invalid due date, it adds days to dateString and returns just the month day and year
const addDays = function(dateString, days) {
  const date = new Date(dateString)

  date.setDate(date.getDate() + days)

  return date.toISOString().slice(0, 10)
}

//Returns a boolean after determining if a date is valid or not
const isValidDate = function(value) {
  //Checks that the type of value is a string and that Date.parse(value) succeeded by checking that a timestamp was created and not NaN
  return typeof value === 'string' && Number.isNaN(Date.parse(value)) === false
}

//Creates a server instance - starter code
const server = http.createServer(function(request, response) {
  if (request.method === 'GET') {
    handleGet(request, response)
  }
  else if (request.method === 'POST') {
    handlePost(request, response)
  }
})

//Sends the URL a browser requests
const handleGet = function(request, response) {
  const filename = dir + request.url.slice(1)

  //Routes to the home page
  if (request.url === '/') {
    sendFile(response, 'public/index.html')
  }
  //Retrieves appdata
  else if (request.url === '/data') {
    sendJSON(response, 200, appdata)
  }
  //Else its getting some other URL
  else {
    sendFile(response, filename)
  }
}

//Sends a request to the right handler
const handlePost = function(request, response) {
  let dataString = ''

  request.on('data', function(data) {
      dataString += data
  })

  request.on('end', function() {
    //Resets incoming so its clean on every run
    let incoming = null

    //Checking if the JSON body throws an error
    try {
      incoming = JSON.parse(dataString)
    }
    catch (err) {
      return sendJSON(response, 400, {error: 'body was not valid JSON'})
    }

    //Sending the request to the correct handler
    if (request.url === '/add') {
      handleAdd(incoming, response)
    }
    else if (request.url === '/delete') {
      handleDelete(incoming, response)
    }
    else if (request.url === '/modify') {
      handleModify(incoming, response)
    }
    else {
      sendJSON(response, 404, {error: 'unknown route ' + request.url})
    }
  })
}

//Handles adding a new row to the to do list
const handleAdd = function(incoming, response) {
  //Builds the row with the incoming JSON and the nextID
  const row = buildRow(incoming, nextId)

  //Check if the row is empty
  if (row === null) {
    return sendJSON(response, 400, {error: 'a task description is required'})
  }

  //Pushes the new row to appdata
  nextId += 1
  appdata.push(row)

  sendJSON(response, 200, appdata)
}

//Handles deleting a row from the to do list
const handleDelete = function(incoming, response) {
  //Checks each index in appdata for the row id that matches the incoming id
  const index = appdata.findIndex(row => row.id === incoming.id)

  //Checking the result of findIndex to see if there wasn't a match
  if (index === -1) {
    return sendJSON(response, 404, {error: 'no task with id: ' + incoming.id})
  }

  //Removes the row at index
  appdata.splice(index, 1)

  sendJSON(response, 200, appdata)
}

//Handles the modification of a row
const handleModify = function(incoming, response) {
  //Finds the specific row being modified
  const index = appdata.findIndex(row => row.id === incoming.id)

  //Checking the result of findIndex to see if there wasn't a match
  if (index === -1) {
    return sendJSON(response, 404, {error: 'no task with id ' + incoming.id})
  }

  //Builds the modified row
  const row = buildRow(incoming, incoming.id)

  //Checks row is valid
  if (row === null) {
    return sendJSON(response, 400, {error: 'a task description is required'})
  }

  //Overwrites the data at index with the modified row
  appdata[ index ] = row

  sendJSON(response, 200, appdata)
}

//Creates a HTTP response
const sendJSON = function(response, status, payload) {
  response.writeHead(status, {'Content-Type': 'application/json'})
  response.end(JSON.stringify(payload))
}

const sendFile = function(response, filename) {
   const type = mime.getType(filename)

   fs.readFile(filename, function(err, content) {

     //If the error = null, then we've loaded the file successfully
     if (err === null) {
       // status code: https://httpstatuses.com
       response.writeHeader(200, {'Content-Type': type})
       response.end(content)
     }
     else {
       //File not found, error code 404
       response.writeHeader(404)
       response.end('404 Error: File Not Found')
     }
   })
}

//Seeded tasks for testing functionality
const seed = [
  {task: 'finish a2 writeup',   created_date: '2026-09-15', due_date: '2026-09-18'},
  {task: 'read week 3 slides',  created_date: '2026-09-14', due_date: '2026-09-21'},
  {task: 'order new keyboard',  created_date: '2026-09-10', due_date: '2026-09-30'}
]

//Pushes the seeded tasks to the program
seed.forEach(function(row) {
  appdata.push(buildRow(row, nextId))
  nextId += 1
})

server.listen(process.env.PORT || port)
