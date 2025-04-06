// Add info from .env file to process.env
require('dotenv').config() 

// get server configuration
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
const extract = require('extract-zip')
const {Downloader} = require("nodejs-file-downloader")

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

// Use MongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
// Construct URL used to connect to database from info in the .env file
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@${process.env.DB_HOST}/?retryWrites=true&w=majority`
// Create a MongoClient
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
})

// Try to open a database connection
client.connect()
  .then(() => {
    console.log('Database connection established')
  })
  .catch((err) => {
    console.log(`Database connection error - ${err}`)
    console.log(`For uri - ${uri}`)
  })

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
        fs.renameSync(configFile, configFile + '.bak')   
        fs.copyFileSync(uploadedFile, configFile)   
        fs.rmSync(uploadedFile)   

        res.redirect("/config?saved=ok")
    } catch (error) {
        fs.rmSync(uploadedFile)  
        res.redirect("/config/restore?saved=error")
    }
})

app.get('/models', isAuthenticated, (req, res) => {
    const saved = xss(req.query.saved)
    res.render('models.ejs', {saved: saved, userName: req.session.userName, curPage: "models"})
})

app.post('/models/upload/objects-tm', isAuthenticated, upload.single('modelfile'), async (req, res) => {
    const uploadedFile = path.join(__dirname, 'upload', req.file.filename)
    const destinationPath = path.join(__dirname, myServer.config.DIR_STATIC, 'convert', req.file.filename)
    const userModelDir = path.join(__dirname, myServer.config.DIR_STATIC, myServer.config.DIR_USERS, slugify(req.session.userName, {lower: true}), myServer.config.DIR_MODELS, "objects" )

    let labelURL
    let modelURL
    let modelFileName
    const prefix = xss(req.body.name) + '-'
    
    fs.renameSync(uploadedFile, uploadedFile + '.zip')
    const zipFile = uploadedFile + '.zip'

    try {
        await extract(zipFile, { 
            dir: destinationPath, 
            onEntry: (entry, zipfile) => {
                if (entry.fileName == 'labels.txt') { labelURL = `${process.env.HOSTNAME}/convert/${req.file.filename}/${entry.fileName}` }
                if (path.extname(entry.fileName) == '.tflite') {
                    modelURL = `${process.env.HOSTNAME}/convert/${req.file.filename}/${entry.fileName}` 
                    modelFileName = entry.fileName
                }
            } 
        })
    } catch (err) {
        console.error(err)
    }

    fs.rm(zipFile, (err) => {
        if (err) { return console.error(err) }  
    })

    if (!modelURL || !labelURL) {
        res.redirect("/models?saved=error")
    } else {
        // console.log('Extraction complete', labelURL, modelURL)
        res.render('model-processed.ejs', {userName: req.session.userName, curPage: "models"})

        const url = process.env.UTILS_HOSTNAME + "/add-metadata/image-segmentation"
        const options = {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json;charset=UTF-8",
          },
          body: JSON.stringify({
            labelFile: labelURL,
            modelFile: modelURL,
            modelFileName: modelFileName,
            newModelFileName: prefix + modelFileName
          })
        }

        fetch(url, options)
          .then((response) => response.json())
          .then(async (data) => {
            // console.log(data.url)
            fs.copyFileSync( path.join(destinationPath, 'labels.txt'), path.join(userModelDir, prefix + 'labels.txt'))

            const downloader = new Downloader({
                url: data.url,
                directory: userModelDir
              })

              try {
                await downloader.download()
                console.log("Downloaded: "+ data.url) 
              } catch (err) {
                console.error("Download from Avocado Utils failed\n", err)
              }

            fs.rm(destinationPath, {recursive: true}, (err) => {
                if (err) { return console.error(err) }  
            }) 
          })
          .catch (err => {
            console.error("Error processing response from Avocado Utils\n", err)
          })

    }

})

app.get('/login', (req, res) => {
    const error = xss(req.query.error)
    res.render('login.ejs', {error: error, userName: req.session.userName, curPage: "login"})
})
  
app.post('/login', async (req, res) => {
    const userName = xss(req.body.name)
    const collection = client.db(process.env.DB_NAME).collection('users')
    const myUser = await collection.findOne({ name: { $regex: new RegExp(userName, 'i') } })

    if (myUser && myUser.password === xss(req.body.password) && myUser.active) {

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