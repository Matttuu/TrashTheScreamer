var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

//Her er det nye

// Mongo URI
const mongoURI = 'mongodb://root:root1234@ds129914.mlab.com:29914/skraldespand_db';

// Create mongo connection
const conn = mongoose.createConnection(mongoURI, {useNewUrlParser: true});

// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('audiouploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'audiouploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });


// @route GET /
// @desc Loads form
router.get('/', (req, res, audio) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
     res.render('lyd', { files: false});
    } else {
      files.map(file  => {
        if (
          file.contentType === 'audio/mp3' ||
          file.contentType === 'audio/mp4' ||
          file.contentType === 'audio/x-m4a'||
          file.contentType === 'audio/m4a'
          
        ) {
          file.isAudio = true;
          audio = file.filename;          
        } else {
          file.isAudio = false;
        }
      });
     res.render('lyd', {files: files, audio: 'lyd/audio/' +audio});
    }
  });
});
// Her lagres beskrivelse til billedet i databasen. 
// Det bliver lagret til det specifikke filnavn.
/* Der bliver benyttet en async / await funktion for at
   sørge for koden bliver kørt asynkront. Dette resultere
   i at teksten bliver opdateret når den bliver sat ind
   med det samme.
*/
router.post('/files/:filename', (req, res, next) => {

  // Connect til database
  mongoose.connect('mongodb://root:root1234@ds129914.mlab.com:29914/skraldespand_db',{useNewUrlParser: true,}, function(err, db){
  if(err){throw err;}

  // Oprette nyt promise som bliver kørt senere i koden.
    function resolveDetteBagefter() {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(res.redirect('/lyd'));
        }, 0001);
      });
    }
    // Opretter async funktion 
    async function asyncCall () {
      var result = await resolveDetteBagefter();
    // Peger på database collection 
      var collection = db.collection('audiouploads.files')
    // Bruger collection.update metoden for at opdatere / give text til specifikt billede
      collection.updateOne(
      { filename: req.params.filename}, 
      { '$set': {'audio': req.body.audio}}  
      )
    }
  asyncCall();
 });
}); 
// @route POST /upload
// @desc  Uploads file to DB
router.post('/audioupload', upload.single('file'), (req, res) => {
  // res.json({ file: req.file });
  res.redirect('/lyd');
}); 


// @route GET /files
// @desc  Display all files in JSON
router.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
router.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
    
  });
});

// @route GET /audio/:filename
// @desc Display Audio
router.get('/audio/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if audio
    if (file.contentType === 'audio/mp3' || file.contentType === 'audio/mp4' || file.contentType === 'audio/x-m4a' || file.contentType === 'audio/amr' || file.contentType === 'audio/m4a') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not Audio'
      });
    }
  });
});

// @route DELETE /files/:id
// @desc  Delete file

router.post('/files/go/:id/', (req, res, next) => {
  gfs.remove({_id: req.params.id, root:'audiouploads'}, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect('/lyd');
  });
});


//Her slutter det nye

module.exports = router;