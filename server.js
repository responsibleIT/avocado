// Add info from .env file to process.env
require('dotenv').config() 

// get user accounts
const users = require('./accounts.json') 

// Initialise Express webserver
const express = require('express')
const app = express()

const xss = require('xss')
const path = require('path')
const fs = require('fs')
const slugify = require('slugify')

let session = require('express-session')
app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET
}))

app
  .use(express.urlencoded({extended: true}))    // middleware to parse form data from incoming HTTP request and add form fields to req.body
  .use(express.static(process.env.DIR_STATIC))  // Allow server to serve static content such as images, stylesheets, fonts or frontend js from the directory named static
  .set('view engine', 'ejs')                    // Set EJS to be our templating engine
//   .set('views', 'views')                     // And tell it the views can be found in the directory named views

// middleware to test if authenticated
function isAuthenticated (req, res, next) {
    if (req.session.userName) next()
    else res.redirect('/login')
}

function initUserDir (userDir) {
    fs.mkdir(userDir, (err) => {
        if (err) { 
            return console.error(err)
        }

        fs.mkdir(path.join(userDir, process.env.DIR_MODELS), (err) => {
            if (err) {  return console.error(err) }

            // copy default available models to user's directory
            fs.cp(path.join(__dirname, process.env.DIR_MODELS), path.join(userDir, process.env.DIR_MODELS), {recursive: true}, (err) => {
                if (err) { return console.error(err) }  
            })
        })

        fs.mkdir(path.join(userDir, process.env.DIR_CONFIG), (err) => {
            if (err) { return console.error(err) }

            // copy default config to user's directory
            fs.cp(path.join(__dirname, process.env.DIR_CONFIG), path.join(userDir, process.env.DIR_CONFIG), {recursive: true}, (err) => {
                if (err) { return console.error(err) }  
            })
        })

        console.log('New user drectories created: ' + userDir )
    })
}

function convertLabelFile(labels) {
    let labelString = '['
    const allLabels = labels.split("\n")
    for (l of allLabels) {
        labelString += "'" + l + "',"
    }
    labelString = labelString.substring(0, labelString.length - 1);
    labelString += ']'

    return labelString
}

// routes
app.get('/', isAuthenticated, (req, res) => {
    const userPath = './' + process.env.DIR_USERS + '/' + slugify(req.session.userName, {lower: true}) + '/'
    const userDir = path.join(__dirname, process.env.DIR_STATIC, process.env.DIR_USERS, slugify(req.session.userName, {lower: true}) )
    const configFile = path.join(userDir, process.env.DIR_CONFIG, 'config.json')
    const configTXT = fs.readFileSync(configFile, 'utf8');
    config = JSON.parse(configTXT)
    detectionScript = './script/' + config.detectionType + '.js'

    res.render('recognise.ejs', {userName: req.session.userName, userPath: userPath, config: configTXT, detectionScript: detectionScript})
})

app.get('/config', isAuthenticated, (req, res) => {
    const userDir = path.join(__dirname, process.env.DIR_STATIC, process.env.DIR_USERS, slugify(req.session.userName, {lower: true}) )
    const configFile = path.join(userDir, process.env.DIR_CONFIG, 'config.json')
    const configTXT = fs.readFileSync(configFile, 'utf8');
    config = JSON.parse(configTXT)

    const objectLabelFile = path.join(userDir, process.env.DIR_MODELS, 'objects', config.modelPath.objects.substring(config.modelPath.objects.lastIndexOf('/') + 1) + '.labels.txt')
    const objectLabels = fs.readFileSync(objectLabelFile, 'utf8');
    var objectLabelsTXT = convertLabelFile(objectLabels)

    const gestureLabelFile = path.join(userDir, process.env.DIR_MODELS, 'gestures', config.modelPath.gestures.substring(config.modelPath.gestures.lastIndexOf('/') + 1) + '.labels.txt')
    const gestureLabels = fs.readFileSync(gestureLabelFile, 'utf8');
    var gestureLabelsTXT = convertLabelFile(gestureLabels)


    const saved = xss(req.query.saved)
    res.render('configure.ejs', {saved: saved, userName: req.session.userName, config: configTXT, detectionType: config.detectionType, objectLabels: objectLabelsTXT, gestureLabels: gestureLabelsTXT})
})

app.post('/config', isAuthenticated, (req, res) => {
    const userDir = path.join(__dirname, process.env.DIR_STATIC, process.env.DIR_USERS, slugify(req.session.userName, {lower: true}) )
    const configFile = path.join(userDir, process.env.DIR_CONFIG, 'config.json')
    
    fs.writeFileSync(configFile, req.body.configTXT, 'utf8');

    res.redirect("/config?saved=true")
})

app.get('/login', (req, res) => {
    const error = xss(req.query.error)
    res.render('login.ejs', {error: error, userName: req.session.userName})
})
  
app.post('/login', async (req, res) => {

    const myUser = users.users.find(x => x.name === xss(req.body.name))
    if (myUser && myUser.password === xss(req.body.password)) {

        // check if a directory for this user's data already exists, otherwise create it and it's subdirectories
        const userDir = path.join(__dirname, process.env.DIR_STATIC, process.env.DIR_USERS, slugify(myUser.name, {lower: true}) )
        try {
            await fs.promises.access(userDir)
        } catch (error) {
            initUserDir(userDir)
            // wait a bit for the filesystem to finish
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // save userName in session
        req.session.regenerate((err) => {
            if (err) console.log('Error regenerating session on login', err)
            req.session.userName = myUser.name
    
            req.session.save((err) => {
                if (err) console.log('Error saving session on login', err)
                res.redirect('/')
            })
        })

    } else {
        res.redirect("/login?error=true")
    }
    
})

app.get('/logout', (req, res) => {
    req.session.userName = null

    req.session.save((err) => {
      if (err) console.log('Error saving session on logout', err)
      req.session.regenerate((err) => {
        if (err) console.log('Error regenerating session on logout', err)
        res.redirect('/login')
      })
    })
})

// Middleware to handle not found errors - error 404
app.use((req, res) => {
  // log error to console
  console.error('404 error at URL: ' + req.url)
  // send back a HTTP response with status code 404
  res.status(404).send('404 error at URL: ' + req.url)
})

// Middleware to handle server errors - error 500
app.use((err, req, res) => {
  // log error to console
  console.error(err.stack)
  // send back a HTTP response with status code 500
  res.status(500).send('500: server error')
})

// Start the webserver and listen for HTTP requests at specified port
app.listen(process.env.PORT, () => {
  console.log(`Webserver is listening at port ${process.env.PORT}`)
})