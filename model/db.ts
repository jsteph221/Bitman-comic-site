///<reference path='../types/node/node.d.ts'/>
///<reference path='../types/express/express.d.ts'/> 

var mongoose = require( 'mongoose' ),
    dbURI = 'mongodb://admin:admin@ds059125.mlab.com:59125/heroku_thfx33dg';
    //dbURI = 'mongodb://localhost/project';


// Create the database connection
mongoose.connect(dbURI);

// Define connection events
mongoose.connection.on('connected', function () {
  console.log('Mongoose connected to ' + dbURI);
});

mongoose.connection.on('error',function (err) {
  console.log('Mongoose connection error: ' + err);
});

mongoose.connection.on('disconnected', function () {
  console.log('Mongoose disconnected');
});

process.on('SIGINT', function() {
  mongoose.connection.close(function () {
    console.log('Mongoose disconnected through app termination');
    process.exit(0);
  });
});

// // SHARED VALIDATION FUNCTIONS
// var isNotTooShort = function(string) {
//   return string && string.length >= 5;
// };
// // The following two lines will do the same thing
// // var validateLength = [isNotTooShort, 'Too short' ];
// var validateLength = [{validator: isNotTooShort, msg: 'Too short'} ];


/* ********************************************
      BITMAN Account SCHEMA
   ******************************************** */
// var comicStripPanelSchema = new mongoose.Schema({
//     panelFileName: {type: String, required: true},
//     panelNo: {type: Number, required: true},
//     panelDialog: String
// });

var comicStripSchema = new mongoose.Schema({
    title: {type: String, unique: true, required: true},
    tags: {type: Array, default:[]},
    isPublic: {type: Boolean, default: false},
    author:{type:String},
    contributors:{type:Array, default:[]},
    dateUpdated: { type: Date, default: Date.now },
    likes:{type: Number, default:0},
    dislikes:{type: Number, default:0},
    edit:{type:Boolean},
    description: {type: String, default:" "},
    comments: { type: Array, default: [] },

    panelFileName1: {type: String},
    panelNo1: {type: Number},
    panelDialog1: String,

    panelFileName2:  {type: String},
    panelNo2:  {type: Number},
    panelDialog2: String,

    panelFileName3: {type: String},
    panelNo3: {type: Number},
    panelDialog3: String,

    panelFileName4: {type: String},
    panelNo4: {type: Number},
    panelDialog4: String

});



var AccountSchema = new mongoose.Schema({
    username: {type: String, unique: true, required: true },
    password: {type: String, required: true},
    userbio: {type: String, required: false},

    comicstrips: { type: Array, default: [] },
    comicsLiked: {type: Array, default:[]},
    comicsDisLiked: {type: Array, default:[]}
});

//text search
comicStripSchema.index({ title: "text", tags: "text", author:"text"});
// Build the BITMAN Account model
mongoose.model('Account', AccountSchema);
mongoose.model('Comic', comicStripSchema);

