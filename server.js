// Add info from .env file to process.env
require('dotenv').config() 

// get user accounts and server configuration
const users = require('./accounts.json') 
const myServer = require('./serverconfig.json')

// Initialise Express webserver
const express = require('express')
const app = express()

const helmet = require("helmet")
app.use(
    helmet({ contentSecurityPolicy: false })
)

const xss = require('xss')
const path = require('path')
const fs = require('fs')
const slugify = require('slugify')
const multer = require('multer')
const upload = multer({ dest: 'upload/' })

let session = require('express-session')
app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET
}))

app
  .use(express.urlencoded({extended: true}))    // middleware to parse form data from incoming HTTP request and add form fields to req.body
  .use(express.static(myServer.config.DIR_STATIC))  // Allow server to serve static content such as images, stylesheets, fonts or frontend js from the directory named static
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

        fs.mkdir(path.join(userDir, myServer.config.DIR_MODELS), (err) => {
            if (err) {  return console.error(err) }

            // copy default available models to user's directory
            fs.cp(path.join(__dirname, myServer.config.DIR_MODELS), path.join(userDir, myServer.config.DIR_MODELS), {recursive: true}, (err) => {
                if (err) { return console.error(err) }  
            })
        })

        fs.mkdir(path.join(userDir, myServer.config.DIR_CONFIG), (err) => {
            if (err) { return console.error(err) }

            // copy default config to user's directory
            fs.cp(path.join(__dirname, myServer.config.DIR_CONFIG), path.join(userDir, myServer.config.DIR_CONFIG), {recursive: true}, (err) => {
                if (err) { return console.error(err) }  
            })
        })

        console.log('New user drectories created: ' + userDir )
    })
}

function getTimestamp () {
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0') //January is 0!
    const yyyy = now.getFullYear()
    const hh = String(now.getHours()).padStart(2, '0')
    const ms = String(now.getMinutes()).padStart(2, '0')
    
    return dd + '-' + mm + '-' + yyyy + '_' + hh + ms

}

// function convertLabelFile(labels) {
//     let labelString = '['
//     const allLabels = labels.split("\n")
//     for (l of allLabels) {
//         labelString += "'" + l.replace("'", "\\'") + "',"
//     }
//     labelString = labelString.substring(0, labelString.length - 1);
//     labelString += ']'

//     return labelString
// }

// routes
app.get('/', isAuthenticated, (req, res) => {
    const userPath = './' + myServer.config.DIR_USERS + '/' + slugify(req.session.userName, {lower: true}) + '/'
    const userDir = path.join(__dirname, myServer.config.DIR_STATIC, myServer.config.DIR_USERS, slugify(req.session.userName, {lower: true}) )
    const configFile = path.join(userDir, myServer.config.DIR_CONFIG, 'config.json')
    const configTXT = fs.readFileSync(configFile, 'utf8');
    config = JSON.parse(configTXT)
    detectionScript = './script/' + config.detectionType + '.js'

    res.render('recognise.ejs', {userName: req.session.userName, userPath: userPath, config: configTXT, detectionScript: detectionScript, curPage: "detect"})
})

app.get('/config', isAuthenticated, (req, res) => {
    const userDir = path.join(__dirname, myServer.config.DIR_STATIC, myServer.config.DIR_USERS, slugify(req.session.userName, {lower: true}) )
    const userPath = '/' + myServer.config.DIR_USERS + '/' + slugify(req.session.userName, {lower: true})
    const configFile = path.join(userDir, myServer.config.DIR_CONFIG, 'config.json')
    const configURL = '/' + myServer.config.DIR_USERS + '/' + slugify(req.session.userName, {lower: true}) + '/' + myServer.config.DIR_CONFIG + '/' + 'config.json'
    const configTXT = fs.readFileSync(configFile, 'utf8');
    config = JSON.parse(configTXT)

    // const objectLabelFile = path.join(userDir, myServer.config.DIR_MODELS, 'objects', config.modelPath.objects.substring(config.modelPath.objects.lastIndexOf('/') + 1) + '.labels.txt')
    // const objectLabels = fs.readFileSync(objectLabelFile, 'utf8');
    // var objectLabelsTXT = convertLabelFile(objectLabels)

    // const gestureLabelFile = path.join(userDir, myServer.config.DIR_MODELS, 'gestures', config.modelPath.gestures.substring(config.modelPath.gestures.lastIndexOf('/') + 1) + '.labels.txt')
    // const gestureLabels = fs.readFileSync(gestureLabelFile, 'utf8');
    // var gestureLabelsTXT = convertLabelFile(gestureLabels)

    const objectModelPath = path.join(userDir, myServer.config.DIR_MODELS, 'objects')
    const objectFiles = fs.readdirSync(objectModelPath)
    const objectModels = objectFiles.filter(file => {
        return path.extname(file).toLowerCase() === '.tflite'
    })

    const gestureModelPath = path.join(userDir, myServer.config.DIR_MODELS, 'gestures')
    const gestureFiles = fs.readdirSync(gestureModelPath)
    const gestureModels = gestureFiles.filter(file => {
        return path.extname(file).toLowerCase() === '.task'
    })

    const saved = xss(req.query.saved)
    
    res.render('configure.ejs', {
        saved: saved, 
        userName: req.session.userName, 
        userPath: userPath,
        config: configTXT,
        configURL: configURL,
        detectionType: config.detectionType,
        currentModel: config.modelPath,
        nr: config.nr,
        confidence: config.confidence,
        objectModels: objectModels,
        gestureModels: gestureModels,
        timestamp: getTimestamp(),
        curPage: "config"
    })
})

app.post('/config', isAuthenticated, (req, res) => {
    const userDir = path.join(__dirname, myServer.config.DIR_STATIC, myServer.config.DIR_USERS, slugify(req.session.userName, {lower: true}) )
    const configFile = path.join(userDir, myServer.config.DIR_CONFIG, 'config.json')

    if (req.body.configTXT) {
        fs.writeFileSync(configFile, req.body.configTXT, 'utf8')
        res.redirect("/config?saved=ok")
    } else {
        res.redirect("/config?saved=error")
    }
})

app.get('/config/restore', isAuthenticated, (req, res) => {
    const configURL = '/' + myServer.config.DIR_USERS + '/' + slugify(req.session.userName, {lower: true}) + '/' + myServer.config.DIR_CONFIG + '/' + 'config.json'
    const saved = xss(req.query.saved)

    res.render('config-restore.ejs', {
        saved: saved, 
        userName: req.session.userName,
        configURL: configURL,
        timestamp: getTimestamp(),
        curPage: "config"
    })
})

app.post('/config/restore', isAuthenticated, upload.single('configfile'), (req, res) => {
    const userDir = path.join(__dirname, myServer.config.DIR_STATIC, myServer.config.DIR_USERS, slugify(req.session.userName, {lower: true}) )
    const configFile = path.join(userDir, myServer.config.DIR_CONFIG, 'config.json')
    const uploadedFile = path.join(__dirname, 'upload', req.file.filename)

    // check if uploaded file is valid JSON
    const configFileContents = fs.readFileSync(uploadedFile, 'utf8')
    try {
        JSON.parse(configFileContents)

        // backup current config and copy uploaded config to user dir
        fs.copyFileSync(configFile, configFile + '.bak')   
        fs.copyFileSync(uploadedFile, configFile)   
        fs.rmSync(uploadedFile)   

        res.redirect("/config?saved=ok")
    } catch (error) {
        res.redirect("/config/restore?saved=error")
    }
})

app.get('/models', isAuthenticated, (req, res) => {
    res.render('models.ejs', {userName: req.session.userName, curPage: "models"})
})



app.get('/login', (req, res) => {
    const error = xss(req.query.error)
    res.render('login.ejs', {error: error, userName: req.session.userName, curPage: "login"})
})
  
app.post('/login', async (req, res) => {
    const myUserName = xss(req.body.name.toLowerCase())

    const myUser = users.users.find(x => x.name.toLowerCase() === myUserName)
    if (myUser && myUser.password === xss(req.body.password)) {

        // check if a directory for this user's data already exists, otherwise create it and it's subdirectories
        const userDir = path.join(__dirname, myServer.config.DIR_STATIC, myServer.config.DIR_USERS, slugify(myUser.name, {lower: true}) )
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