///<reference path='../types/node/node.d.ts'/>
///<reference path='../types/express/express.d.ts'/> 

class Router {
	constructor() { };
	start() {

		var express = require('express');

		var multer = require('multer');
		var router = express.Router();
		var util = require("util");
		var fs = require("fs");
		var Grid = require('gridfs-stream');

		var mongoose = require('mongoose');
		var conn = mongoose.connection;
		var UserDoc = mongoose.model('Account');
		var ComicDoc = mongoose.model('Comic');

		Grid.mongo = mongoose.mongo;
		var gfs = Grid(conn.db);

		var async = require('async');

		const assert = require('assert');

		var editCom;
		var viewedCom;
		var clearSession = function(session, callback) {
			session.destroy();
			callback();
		};


		// ====================
		// GET - login page ===
		// ====================
		router.get('/', function(req, res) {
			var arrErrors = [];
			var title = "Log In";
			//var title = "Log In or Create an Account";

			if (req.query) {
				if (req.query.username === 'invalid') {
					arrErrors.push('Please enter a valid username');
				}
				if (req.query.password === 'invalid') {
					arrErrors.push('Please enter a valid password');
				}
				if (req.query.notexist === 'invalid') {
					arrErrors.push("Username Or Password Incorrect--- Try Again or Create an account");
				}
			}
			res.render('login', { title, errors: arrErrors });
		});


		// =====================
		// POST - login page ===
		// =====================
		router.post('/Login', function(req, res) {
			var qstring = '';

			if (req.body.username && req.body.password) {
				// Check if user exist in database
				UserDoc.findOne({ 'username': req.body.username, 'password': req.body.password }, '_id username', function(err, user) {
					if (!err) {
						if (!user) {
							console.log("Username Or Password Incorrect--- Try Again or Create an account");
							var qstring = '';
							qstring += 'notexist' + '=invalid&';

							res.redirect('/?' + qstring);
						} else {
							// found user in db, 
							// save user session
							req.session.user = { "username": user.username, "_id": user._id };
							req.session.userId = user._id;
							req.session.loggedIn = true;
							console.log('Logged in user: ' + user);

							res.redirect('profilepage');  
						}
					} else {
						console.log("User does not exist --- Please create an account");
						var qstring = '';
						qstring += 'notexist' + '=invalid&';

						res.redirect('/?' + qstring);
					}
				});
			} else {
				console.log("User / password is empty - ask user to correct it");

				if (req.body.username === "") {
					qstring += 'username' + '=invalid&';
				}

				if (req.body.password === "") {
					qstring += 'password' + '=invalid&';
				}

				res.redirect('/?' + qstring);
			}
		});

		// =============================
		// GET - Create user account ===
		// =============================
		router.get('/CreateAccount', function(req, res) {
			console.log('in GET create account')
			var strUserName = '',
				strPswd = '',
				arrErrors = [];

			console.dir(req.query);

			if (req.session.tmpUser) {
				strUserName = req.session.tmpUser.name;
				strPswd = req.session.tmpUser.password;
			}

			if (req.query) {
				if (req.query.username === 'invalid') {
					arrErrors.push('Please enter a valid username');
				}
				if (req.query.password === 'invalid') {
					arrErrors.push('Please enter a valid password');
				}
				if (req.query.notexist === 'invalid') {
					arrErrors.push('User already exist - Please correct or login');
				}
			}
			res.render('createaccount', {
				title: 'Create an account',
				_id: "",
				username: strUserName,
				password: strPswd,
				errors: arrErrors
			});
		});

		// ====================================
		// POST - new user account creation ===
		// ====================================
		router.post('/CreateAccount', function(req, res) {
			console.log('in POST CreateAccount');
			var qstring = '';

			// Check if user is already in the database
			if (req.body.username && req.body.password) {
				// Check if user exist in database
				UserDoc.findOne({ 'username': req.body.username, 'password': req.body.password }, '_id username', function(err, user) {
					if (!err) {
						if (!user) {
							console.log("User does not exist --- so create new user account");

							UserDoc.create({
								username: req.body.username,
								password: req.body.password
							}, function(err, user) {
								var qstring = '';
								if (err) {
									console.log(err);
									if (err.code === 11000) {
										qstring = 'exists=true';
									} else if (err.name === "ValidationError") {
										for (var input in err.errors) {
											qstring += input + '=invalid&';
											console.log(err.errors[input].message);
										}
									}
									req.session.tmpUser = { "name": req.body.username, "password": req.body.password };
									res.redirect('/CreateAccount?' + qstring);
								} else {
									console.log("User created and saved: " + user);
									req.session.tmpUser = '';

									// save session username and id -- redirect to login
									req.session.user = { "name": user.username, "_id": user._id };
									req.session.loggedIn = true;
									res.redirect('/');
								}
							});
						} else {
							console.log('user does not exist - display no exist message');
							qstring += 'notexist' + '=invalid&';
							res.redirect('/CreateAccount?' + qstring);

						}
					}
				})
			} else {
				console.log("User / password is empty - ask user to correct it");
				if (req.body.username === "") {
					qstring += 'username' + '=invalid&';
				}

				if (req.body.password === "") {
					qstring += 'password' + '=invalid&';
				}

				res.redirect('/CreateAccount?' + qstring);
			}
		});

		router.get('/logout', function(req, res) {
			console.log("Logging Out");
			req.session.userId = null;
			req.session.loggedIn = null;

			//res.render('login', { title: "Logout Successful" })

			var arrErrors = [];
			var title = "Logout Successful";
			res.render('login', { title, errors: arrErrors });

		});	
			

		// =====================
		// GET User Homepage ===
		// =====================
		router.get('/Homepage', function(req, res) {
			var title;
			if (req.session.loggedIn === true) {
				title = req.session.user.username + " Homepage"
				res.render('Homepage', {
					title,
					user: req.session.user.username,
					userID: req.session.user._id
				});
			} else {
				res.redirect('/');
			}
		});



		// ============================================================
		// GET User profile page - and show users' comic strips     ===
		//  		    					                        ===	
		// ============================================================
		router.get('/profilepage', function(req, res) {
			var arrErrors = [];
			var arrComics = [];
			var profileUserName;
			var profileUserAbout;
			var user;
			var async = require('async');

			var arrEditComics=[]


			if (req.session.loggedIn === true) {
				if(req.query && req.query.username){
					profileUserName = req.query.username;
					//profileUserAbout = req.query.userbio;
				} else {
					profileUserName = req.session.user.username;
					//profileUserAbout = req.session.user.userbio;
				}



				// ===============================
				// GETTING image from database ===
				// ===============================
				// var Grid = require('gridfs-stream');
				// var conn = mongoose.connection;
				// Grid.mongo = mongoose.mongo;
				// var gfs = Grid(conn.db);

				var filebuffer = [];
				var base64;
				//var arrPP = [];
				var userpp = { filename: profileUserName + '_pp' };

				async.series([
					function(callback) {

						gfs.exist(userpp, function(err, found) {
							if (err) {
								console.log('An error occurred!', err);
								callback(err);
							}

							if (found) {
								console.log("pp exists in db - now retrieving file");

								// streaming from gridfs
								var readstream = gfs.createReadStream({ filename: profileUserName + "_pp" });

								console.log("starting to stream file= " + profileUserName + "_pp");

								readstream.on("data", function(chunk) {
									//filebuffer += chunk;
									filebuffer.push(chunk);
								});

								// dump contents to console when complete
								readstream.on("end", function() {
									console.log("file download from db completed:\n\n");

									var fbuf = Buffer.concat(filebuffer);
									base64 = (fbuf.toString('base64'));

									WritePhotoFilePP(profileUserName + "_pp", base64);
									callback(null);
								});

								//error handling, e.g. file does not exist
								readstream.on('error', function(err) {
									console.log('An error occurred!', err);
									callback(err);
									//throw err;
								});

							} else {
							 	console.log("This user does not have a profile photo");
							 	callback(null);
							}
						});
					},

					function(callback){

						if (req.query) {
							if (req.query.comicid === 'invalid') {
								arrErrors.push('Please select a comic strip to edit');
							}
						}
						callback(null);
					},

					function(callback){
						var query = ComicDoc.find({ author: profileUserName }, 'tags title author');
						if(req.session.user.username != profileUserName){
							query.where('isPublic').equals(true);
						}
						query.exec( function(err, comics) {
							if (err) {
								console.log('error');
								callback(err);
							}
							else {
								console.log("FOUND these comics for Author: " + comics)

								arrComics = comics;
								callback(null);
							}
						});
					},
					function(callback){
						ComicDoc.find({ contributors: profileUserName }, 'tags title author', function(err, comics) {
							if (err) {
								console.log('error');
							}
							else {
								console.log('FOUND these comics for Contributor: ' + comics);
								arrEditComics = comics;
								var logged = profileUserName === req.session.user.username;

								callback(null);
							}
						});
					},

					function(callback){
						console.log('Getting userbio')
						UserDoc.findOne({ username: profileUserName }, function(err, user) {
							if (!err) {
								profileUserAbout = user.userbio;
								callback(null);
							}
							
						});
					},					

					function(callback){
						console.log("== RENDER PROFILE PAGE ==" );
						var logged = profileUserName === req.session.user.username;
						res.render('profilepage', {
							title: profileUserName,
							user: profileUserName,
							about: profileUserAbout, 
							comicstrips: arrComics,
							errors: arrErrors,
							loggedUser:logged,
							editedComics: arrEditComics,
						});
						callback(null);
					}
				], function(err) {
					if (err){
						console.log("Error in /ProfilePage:" + err);
					}
					res.end();
				});	

			} else {
				res.redirect('/');
			}
		});


		function WritePhotoFilePP(i, fileBuf) {
			fs.writeFile("./download/" + i + ".jpg", fileBuf, "base64", function(err) {
				if (err) {
					console.log("unable to write image file\n\n" + err);
					process.nextTick(err = null);
				}
			});
		}

		// ===========================
		// GET changepassword Page ===
		// ===========================
		router.get('/changepassword', function(req, res) {
			res.render('changepassword');
		});
 
		// ====================================
		// ===== POST - change password =======
		// ====================================
		router.post('/changepassword', function(req, res) {
			console.log('in POST changepassword');
			UserDoc.findById(req.session.userId, function(err, user) {
				if (!err) {
					console.log('no error - now changing pw');
					user.password = req.body.newpassword;
					user.save(function(err, project) { });
					res.redirect('/profilepage');
				}
			})
		});


		// ===========================
		// GET deleteaccount Page ===
		// ===========================
		router.get('/deleteaccount', function(req, res, next) {
			var title = "Delete Account"
			res.render('deleteaccount');
		});

		// ====================================
        // ===== POST - delete account =======
        // ====================================
        router.post('/deleteaccount', function(req, res) {
            console.log('in POST deleteaccount');
            if (req.body.confirmation == "Yes") {
				UserDoc.remove({ username: req.session.user.username }, function(err) {
					var arrErrors = [];
					var title = "Account Successfully Deleted";
					res.render('login', { title, errors: arrErrors });				}
				)
			}
			else res.redirect('/profilepage');
		});


		// ===================================
		// GET change profile picture page ===
		// ===================================
		router.get('/profilepic', function(req, res) {
			var aboutme;
			var async = require('async');

			if (req.session.loggedIn === true) {
				console.log("showing profile change pict");
				var photoSrc = req.session.user.username + '_pp.jpg';

				async.series([
					function(callback) {

						UserDoc.findById(req.session.userId, function(err, user) {
							if (!err) {
								aboutme = user.userbio;
								console.log("userbio = " + aboutme);
								callback(null);
							}
						});
					}
					], function(err) {
						if (err){
							console.log("Error in /ProfilePage:" + err);
						}
						else {
							console.log("userbio render test = " + aboutme);

							res.render('profilepic', { 
								title: 'Change profile picture',
								aboutme: aboutme,
								photoSrc: photoSrc });
						}
					});					

			} else {
				// show login page
				res.redirect('/');
			}
		});


		// ======================================
		// POST - Upload user profile picture ===
		// ======================================
		router.post('/profilepic', function(req, res, next) {
			var userDocument;

			if (req.session.loggedIn === true) {
				var userId = req.session.userId;
				console.log('user id = ' + userId);

				UserDoc.findById(req.session.userId, function(err, user) {
					if (!err) {
						console.log('no error - now changing about me');
						user.userbio = req.body.userbio;
						user.save(function(err, project) { });
					}
				})



				if (req.files) {
					console.log("Have files: " + util.inspect(req.files));

					if (req.files.length === 0) {
						//return next(new Error("Please upload an image first!"));
						res.redirect('/profilepage');

					} else {

						UserDoc.findOne({ 'accounts.user.username': req.session.user.username }, function(err, user) {
							if (!err) {


								// stream files to gridfs - to store in mongodb
								var thisfile = req.files[0];

								var userpp = { filename: req.session.user.username + '_pp' };


								//console.log('updating userBio = ' + req.body.userbio);
								//user.userbio = req.body.userbio;
								//user.save(function(err, project) { });
									
								

								gfs.exist(userpp, function(err, found) {
									if (err) {
										console.log('An error occurred!', err);
									};
									if (found) {
										console.log("pp exists in db - now deleting old file");
										gfs.remove(userpp, function(err) {
											if (err) {
												console.log('An error occurred!', err);
											} else {
												console.log('old pp deleted from db');
											}
										});
									} else {
										console.log("pp DNE - can upload new image");
									}
								});

								fs.exists(thisfile.path, function(exists) {
									if (exists) {
										var writestream = gfs.createWriteStream({
											filename: req.session.user.username + "_pp",  // username_pp
											mode: 'w',
											content_type: thisfile.mimetype
										});
										fs.createReadStream(thisfile.path).pipe(writestream);
										writestream.on('close', function(file) {
											console.log("successfully written " + file.filename + ' to DB');
											// delete file from temporary folder
											fs.unlink(thisfile.path, function() { })
				
											//user.save(function(err, project) { });

											res.redirect('/profilepage');
										});
									}
								});


							} // if no error
							//res.redirect('profilepage');
						});
					}
				}
			}
		});

		// ===============================
		// GET View page ===
		// ===============================
		router.get('/viewpage', function(req, res) {
			if (req.session.loggedIn === true) {
				var query = ComicDoc.find({}).sort('-dateUpdated');
				query.where('isPublic').equals(true);
				query.exec(function(err, docs) {
					if (!err) {
						console.log('Have comics: ' + docs);
						ClearDownloadDirectory();
						var count = 0;

						var i = -1;

						var arrFileNames = [];
						for (var j = 0; j < docs.length;j++){
							console.log('File: ' + docs[j].panelFileName1);
							arrFileNames.push(docs[j].panelFileName1);
						}
						async.each(arrFileNames, function(thisFile,callback){
							var fileno = count + 1;
							var filepath = fileno + ".jpg";
							var filebuffer = [];
							var base64;

							console.log("INSIDE ASYNC LOOP processing file #" + fileno + "with filename: " + thisFile + "/n/n" );


							var readstream = gfs.createReadStream({ filename: thisFile });
							readstream.on("data", function(chunk) {
								filebuffer.push(chunk);
							});  

							readstream.on("end", function(){
								console.log("file download from db completed:\n\n");
								var fbuf = Buffer.concat(filebuffer);
								base64 = (fbuf.toString('base64'));

								WritePhotoFile(filepath, base64);

								callback(null);
							});

							readstream.on('error', function(err) {
								console.log('An error occurred!', err);
								callback(err);
								});

							count++;
						}, function(err){
							if (err) console.log('A file failed to process'); 
							else{
								console.log("STARTING SORT TEST:\n");
								for (var i = 1; i < docs.length;i++){
									assert(docs[i - 1].dateUpdated > docs[i].dateUpdated);
								}
								console.log('PASSED SORT TEST');
								res.render('viewpage', { title: 'Viewpage', comics: docs, search: [,'Date Updated','Descending'] });
								}
							});
					}
					else {
						console.log('ERROR IN SHOWING NEW COMICS')
					}
				})

			} else {
				// show login page
				res.redirect('/');
			}
		});
		// ===============================
		// POST View page (search) ===
		// ===============================
		router.post('/viewpage', function(req, res) {
			var srch = req.body.search.trim();
			var search= [];
			search.push(srch);
			console.log("Search String: " + srch);			
			// get all users that have a comicstrip with a srch tag.
			if (srch == '') {
				var query = ComicDoc.find({});
			}
			else {

				var query = ComicDoc.find(
					{ $text: { $search: srch } },
					{ score: { $meta: "textScore" } }
				);
			}
			query.where('isPublic').equals(true);
			if (req.body.order == 'relevance'){
				search.push('Relevance');
				console.log('Sorting by Relevance');
				if(req.body.sort == 'desc'){
					search.push('Descending');
					query.sort({ score: { $meta: "textScore" } });
				}
				else{
					search.push('Ascending');
					query.sort({ score: { $meta: "textScore" } }).limit(10);
				}
			}
			else if (req.body.order == 'date'){
				search.push('Date Updated');
				console.log('Sorting by Date');
				if(req.body.sort == 'desc'){
					search.push('Descending');
					query.sort('-dateUpdated');
				}
	 			else{
	 				search.push('Ascending');
					query.sort('dateUpdated');
				}
			}
			else{
				search.push('Likes');
				console.log('Sorting by Likes');
				if(req.body.sort == 'desc'){
					search.push('Descending');
					query.sort('-likes');
				}
				else{
					search.push('Ascending')
					query.sort('likes');
				}
			}
			query.exec(function(err, docs) {
				if (err) {
					console.log("ERROR Shouldn't get here: " + err);
				}
				else {
					console.log('Results' + docs);
					if (req.body.order == 'relevance' && req.body.sort != 'desc') docs.reverse();
					console.log('Have comics: ' + docs);
						ClearDownloadDirectory();
						var count = 0;

						var i = -1;

						var arrFileNames = [];
						for (var j = 0; j < docs.length;j++){
							console.log('File: ' + docs[j].panelFileName1);
							arrFileNames.push(docs[j].panelFileName1);
						}
						async.each(arrFileNames, function(thisFile,callback){
							var fileno = count + 1;
							var filepath = fileno + ".jpg";
							var filebuffer = [];
							var base64;

							console.log("INSIDE ASYNC LOOP processing file #" + fileno + "with filename: " + thisFile + "/n/n" );


							var readstream = gfs.createReadStream({ filename: thisFile });
							readstream.on("data", function(chunk) {
								filebuffer.push(chunk);
							});  

							readstream.on("end", function(){
								console.log("file download from db completed:\n\n");
								var fbuf = Buffer.concat(filebuffer);
								base64 = (fbuf.toString('base64'));

								WritePhotoFile(filepath, base64);

								callback(null);
							});

							readstream.on('error', function(err) {
								console.log('An error occurred!', err);
								callback(err);
								});

							count++;
						}, function(err){
							if (err) console.log('A file failed to process'); 
							else{
								//Sort Test
								
								console.log("STARTING SORT TEST:\n");
								if(req.body.order == 'date'){
									if(req.body.sort == 'desc'){
										for (var i = 1; i < docs.length;i++){
											assert(docs[i - 1].dateUpdated >= docs[i].dateUpdated);
										}
									}
									else{
										for (var i = 1; i < docs.length;i++){
											assert(docs[i - 1].dateUpdated <= docs[i].dateUpdated);
										}
									}
								}
								/*
								else if(req.body.order == 'relevance'){
									if(req.body.sort == 'desc'){
										for (var i = 1; i < docs.length;i++){
											if (typeof(docs[i-1]!= 'undefined' && typeof(docs[i])!= 'undefined')){
												console.log(docs[i - 1].score + 'is greater than' + docs[i].score);
												assert(docs[i - 1].score >= docs[i].score);
											}
										}
									}
									else{
										for (var i = 1; i < docs.length;i++){
											if (typeof(docs[i-1]!= 'undefined' && typeof(docs[i])!= 'undefined')){
												console.log(docs[i - 1].score + 'is greater than' + docs[i].score);
												assert(docs[i - 1].score <= docs[i].score);
											}
										}
									}
								}
								*/
								else if (req.body.order == 'likes'){
									if(req.body.sort == 'desc'){
										for (var i = 1; i < docs.length;i++){
											assert(docs[i - 1].likes >= docs[i].likes);
										}
									}
									else{
										for (var i = 1; i < docs.length;i++){
											assert(docs[i - 1].likes <= docs[i].likes);
										}
									}
								}
								
								console.log("SORT TEST PASSED");
								res.render('viewpage', { title: 'Viewpage', comics: docs, search: search });
								}
							});
				}
			});

		});
		// ===============================================
		// GET - Playback - show selected comic strip  ===
		// ===============================================
		router.get('/playback', function(req, res) {
			var arrFilenames = [];
			var dialog1, dialog2, dialog3, dialog4;
			var description;
			var tags;
			var comments;
			
			// === retrieve comic strip info for selected comic strip id
			console.log("ID : " + req.query.comicid)

			ComicDoc.findById(req.query.comicid, function(err, comic) {
				if (!err) {
					if (comic) {
						console.log('COMIC FOUND: ' + comic)
						tags = comic.tags;
						comments = comic.comments;

						description = comic.description;
						console.log("comic description = " + description);


						if (typeof (comic.panelFileName1) != 'undefined' && comic.panelFileName1 != null) {
							arrFilenames.push(comic.panelFileName1);
							dialog1 = comic.panelDialog1;
						}
						if (typeof (comic.panelFileName2 != 'undefined' && comic.panelFileName2 != null)) {
							arrFilenames.push(comic.panelFileName2);
							dialog2 = comic.panelDialog2;
						}
						if (typeof (comic.panelFileName3) != 'undefined' && comic.panelFileName3 != null) {
							arrFilenames.push(comic.panelFileName3);
							dialog3 = comic.panelDialog3;
						}
						if (typeof (comic.panelFileName4) != 'undefined' && comic.panelFileName4 != null) {
							arrFilenames.push(comic.panelFileName4);
							dialog4 = comic.panelDialog4;
						}
						
						// var Grid = require('gridfs-stream');
						// var conn = mongoose.connection;
						// Grid.mongo = mongoose.mongo;
						// var gfs = Grid(conn.db);
						// var filebuffer = [];
						// var base64;
						// var arrCSImages = [];							

						ClearDownloadDirectory();
						var count = 0;

						var async = require('async');
						var i = -1;

						async.each(arrFilenames, function(thisFile, callback){

							var fileno = count + 1;
							var filepath = fileno + ".jpg"
							var filebuffer = [];
							var base64;

							console.log("INSIDE ASYNC LOOP processing file #" + fileno + "with filename: " + thisFile + "/n/n" );

							// Create writestream to save copy of image in download director	
							//var downloadWriteStream = fs.createWriteStream(filepath);

							// read (get) requested filename from MongoDB
							var readstream = gfs.createReadStream({ filename: thisFile });

							readstream.on("data", function(chunk) {
								filebuffer.push(chunk);
							});

							// dump contents to console when complete
							readstream.on("end", function() {
								console.log("file download from db completed:\n\n");

								var fbuf = Buffer.concat(filebuffer);
								base64 = (fbuf.toString('base64'));

								WritePhotoFile(filepath, base64);

								callback(null);
							});

							//error handling, e.g. file does not exist
							readstream.on('error', function(err) {
								console.log('An error occurred!', err);
								callback(err);
							});

							count++;

						}, function(err){
						    // if any of the file processing produced an error, err would equal that error
						    if( err ) {
						      // One of the iterations produced an error.
						      // All processing will now stop.
						      console.log('A file failed to process');
						    } else {
					      		console.log('All files have been processed successfully');
					      		var edited = 1;
					      		if (req.query.edited) {
									if (req.query.edited == 'true') edited = 2;
									else edited = 3;
								}
								viewedCom = comic.id;
								var rating = (comic.likes / (comic.likes + comic.dislikes)) * 100;
								var RatingPercent = rating|0;

									res.render('playback', {
										csTitle: comic.title,
										csId: comic._id,
										csAuthor: comic.author,
										csDialog1: comic.panelDialog1,
										csDialog2: comic.panelDialog2,
										csDialog3: comic.panelDialog3,
										csDialog4: comic.panelDialog4,
										csTags: tags,
										csDescription: description,
										csRating: RatingPercent,
										csLikes: comic.likes,
										csDislikes: comic.dislikes,
										csComments: comments,
										edited: edited,
										contributors: comic.contributors,
								});
						    }
						});
					}
				}
			});
		});


		router.post('/playback', function(req,res){
			var liked = false;
			var disliked = false;

			console.log('Entering Likes');
			UserDoc.findById(req.session.userId,function(err,user){
				if (err) { console.log("ERROR SHOULDNT GET HERE");}
				if (!user) { console.log("USER NULL FOR SOME REASON");}
				else{
					console.log("Found User");
					console.log("Searching for comic :" + viewedCom);
					ComicDoc.findById(viewedCom, function(err, comic) {
						if (comic) {
							console.log("Found Comic");
							// check if this comic was either liked or disliked
							for (var i = 0; i < user.comicsLiked.length; i++) {
								if (user.comicsLiked[i] === viewedCom) {
									console.log('Comic Already Liked.');
									liked = true;
									break;
								}
							}

							if (!liked) {
								for (var i = 0; i < user.comicsDisLiked.length; i++) {
									if (user.comicsDisLiked[i] === viewedCom) {
										console.log('Comic Already DisLiked.');
										disliked = true;
										break;
									}
								}
							}

							if (!liked && !disliked){
								console.log('Adding a LIKE to COMIC');
								comic.likes++;
								comic.save(function(err, project) { });
								console.log("ADDING comic to user.likedComics");
								user.comicsLiked.push(comic.id);
								user.save(function(err, project) { });
							}
							
							var rating = (comic.likes / (comic.likes + comic.dislikes)) * 100;
							var RatingPercent = rating|0;

							res.render('playback', {
								csTitle: comic.title,
								csAuthor: comic.author,
								csDialog1: comic.panelDialog1,
								csDialog2: comic.panelDialog2,
								csDialog3: comic.panelDialog3,
								csDialog4: comic.panelDialog4,
								csTags: comic.tags,
								csDescription: comic.description,
								csLikes: comic.likes,
								csDislikes: comic.dislikes,
								csRating: RatingPercent,
								liked: liked || disliked,
								csComments: comic.comments,
								contributors:comic.contributors,
							});
						}
					});
				}
			});
		});		


		router.post('/dislikeplayback', function(req,res){
			var liked = false;
			var disliked = false;
			
			console.log('Entering disLikes');
			UserDoc.findById(req.session.userId,function(err,user){
				if (err) { console.log("ERROR SHOULDNT GET HERE");}
				if (!user) { console.log("USER NULL FOR SOME REASON");}
				else{
					console.log("Found User");
					console.log("Searching for comic :" + viewedCom);
					ComicDoc.findById(viewedCom, function(err, comic) {
						if (comic) {
							console.log("Found Comic");

							// check if this comic was either liked or disliked
							for (var i = 0; i < user.comicsLiked.length; i++) {
								if (user.comicsLiked[i] === viewedCom) {
									console.log('Comic Already Liked.');
									liked = true;
									break;
								}
							}
							if (!liked) {
								for (var i = 0; i < user.comicsDisLiked.length; i++) {
									if (user.comicsDisLiked[i] === viewedCom) {
										console.log('Comic Already DisLiked.');
										disliked = true;
										break;
									}
								}
							}

							/*//SPRINT 3 TESTING (UNCOMMENT TO TEST (1/2))
							var oldDislikeCounter = comic.dislikes;
							var n = (comic.likes / (comic.likes + oldDislikeCounter + 1)) * 100;
							*/
							

							if (!liked && !disliked){
								console.log('Adding a DisLIKE to COMIC');
								comic.dislikes++;
								comic.save(function(err, project) { });
								console.log("ADDING comic to user.dislikedComics");
								user.comicsDisLiked.push(comic.id);
								user.save(function(err, project) { });
							}
							

							var rating = (comic.likes / (comic.likes + comic.dislikes)) * 100;
							var RatingPercent = rating|0;


							/*//SPRINT 3 TESTING (UNCOMMENT TO TEST (2/2))
							if(comic.dislikes == (oldDislikeCounter + 1)){
								assert(comic.dislikes == (oldDislikeCounter + 1));
								console.log("***DISLIKE TEST***:  PASSED")
							} else {
								console.log("***DISLIKE TEST***:  FAILED")
							}

							if(RatingPercent == (n|0)) {
								assert(RatingPercent == (n|0));
								console.log("***RATING TEST***:  PASSED")
							} else {
								console.log("***RATING TEST***:  FAILED")
							}
							*/


							res.render('playback', {
								csTitle: comic.title,
								csAuthor: comic.author,
								csDialog1: comic.panelDialog1,
								csDialog2: comic.panelDialog2,
								csDialog3: comic.panelDialog3,
								csDialog4: comic.panelDialog4,
								csTags: comic.tags,
								csLikes: comic.likes,
								csDislikes: comic.dislikes,
								csRating: RatingPercent,
								liked: liked || disliked,
								csComments: comic.comments,
								csDescription: comic.description
							});
						}
					});
				}
			});
		});		


		router.post('/submitcomment', function(req,res){
			var liked = false;
			var disliked = false;

			var csComment;
			ComicDoc.findById(viewedCom, function(err, comic) {
				if(!err){
						console.log('COMIC FOUND: ' + comic)
						console.log("Adding comment");
						csComment = req.body.comment;
						console.log("current comments are: " + csComment);
						comic.comments.push(csComment);
						comic.save(function(err,project){});
						console.log("Comment added: " + comic.comments[0]);

						console.log("Comic comments are " + comic.comments);
						
						//res.redirect('/playback');

						 var rating = (comic.likes / (comic.likes + comic.dislikes)) * 100;
						 var RatingPercent = rating|0;


						res.render('playback', {
							csTitle: comic.title,
							csAuthor: comic.author,
							csDialog1: comic.panelDialog1,
							csDialog2: comic.panelDialog2,
							csDialog3: comic.panelDialog3,
							csDialog4: comic.panelDialog4,
							csTags: comic.tags,
							csLikes: comic.likes,
							csDislikes: comic.dislikes,
							csRating: RatingPercent,
							liked: liked || disliked,
							csComments: comic.comments,
							csDescription: comic.description
						});
				}
			});
		});


		function WritePhotoFile(i, fileBuf) {
			fs.writeFile("./download/" + i, fileBuf, "base64", function(err) {
				if (err) {
					console.log("unable to write image file\n\n" + err);
					process.nextTick(err = null);
				}
			});
		}

		function ClearDownloadDirectory() {
			for (var i = 0; i < 5; ++i) {

				var fileno = i + 1;
				var filepath = './download/' + fileno + ".jpg"

				// delete file from temporary folder
				fs.unlink(filepath, function() { });
			}
		}

		var editCom;
		// ===============================================
		// GET - Edit Page                             ===
		// ===============================================
		router.get('/editpage', function(req, res) {

			var arrFilenames = [];
			var imgSrc1,
				imgSrc2,
				imgSrc3,
				imgSrc4;
			var title,
				dialog1, dialog2, dialog3, dialog4;

			if (req.query.comicid) {
				var arrFilenames = [];
				var dialog1, dialog2, dialog3, dialog4;
				var tags;

				// === retrieve comic strip info for selected comic strip id
			
				console.log("ID : " + req.query.comicid)
				ComicDoc.findById(req.query.comicid, function(err, comic) {
					if (!err) {
						if (comic) {
							console.log('COMIC FOUND: ' + comic)
							if(comic.edit == false && comic.author != req.session.user.username){
								var	qstring = 'playback/?comicid=' + comic._id + '&comictitle=' + comic.title+'&edited=false';
								res.redirect('/'+qstring);
							}
							tags = comic.tags;
							if (typeof (comic.panelFileName1) != 'undefined' && comic.panelFileName1 != null) {
								arrFilenames.push(comic.panelFileName1);
								dialog1 = comic.panelDialog1;
							}
							if (typeof (comic.panelFileName2 != 'undefined' && comic.panelFileName2 != null)) {
								arrFilenames.push(comic.panelFileName2);
								dialog2 = comic.panelDialog2;
							}
							if (typeof (comic.panelFileName3) != 'undefined' && comic.panelFileName3 != null) {
								arrFilenames.push(comic.panelFileName3);
								dialog3 = comic.panelDialog3;
							}
							if (typeof (comic.panelFileName4) != 'undefined' && comic.panelFileName4 != null) {
								arrFilenames.push(comic.panelFileName4);
								dialog4 = comic.panelDialog4;
							}
						ClearDownloadDirectory();
						var count = 0;

						var i = -1;

						async.each(arrFilenames, function(thisFile, callback){

							var fileno = count + 1;
							var filepath = fileno + ".jpg"
							var filebuffer = [];
							var base64;

							console.log("INSIDE ASYNC LOOP processing file #" + fileno + "with filename: " + thisFile + "/n/n" );


							var readstream = gfs.createReadStream({ filename: thisFile });


							readstream.on("data", function(chunk) {
								filebuffer.push(chunk);
							});

							// dump contents to console when complete
							readstream.on("end", function() {
								console.log("file download from db completed:\n\n");

								var fbuf = Buffer.concat(filebuffer);
								base64 = (fbuf.toString('base64'));

								WritePhotoFile(filepath, base64);

								callback(null);
							});

							//error handling, e.g. file does not exist
							readstream.on('error', function(err) {
								console.log('An error occurred!', err);
								callback(err);
							});

							count++;

						}, function(err){
						    // if any of the file processing produced an error, err would equal that error
						    if( err ) {
						      // One of the iterations produced an error.
						      console.log('A file failed to process');
						    } else {
					      		console.log('All files have been processed successfully');

								viewedCom = comic.id;
								res.render('editpage', {
									csTitle: comic.title,
									csDialog1: comic.panelDialog1,
									csDialog2: comic.panelDialog2,
									csDialog3: comic.panelDialog3,
									csDialog4: comic.panelDialog4,
									csTags: tags,
									csLikes: comic.likes,
								});
						    }
						});
							editCom = comic._id; 

						}
					}
				});
			}
		});

		// ==============================================
		// POST Edit Page                            ====
		// ==============================================
		router.post('/editpage', function(req, res, next) {
			console.log("In Edit Page " + editCom);
			var userDocument;
			var oldTitle = null;
			var testCont, testUser;
			if (req.session.loggedIn === true) {
				ComicDoc.findById(editCom, function(err, comic) {
					if (comic) {
							console.log("EDITING " + comic)
							if (!(req.body.comicstripname == "")){
								console.log('TITLE DIFFERENT CHANGING from '+ comic.title +"to " + req.body.comicstripname);
								oldTitle = comic.title;
								comic.title = req.body.comicstripname;
							}
							var tags = req.body.tags.trim().toLowerCase().split(" ");
							
							var tagsTracker = comic.tags.length
							for (var i = 0; i < tags.length; i++) {
								if(tagsTracker+ 1 > 8){
									break;
								}
								if(comic.tags.indexOf(tags[0]) == -1){
									comic.tags.push(tags[i]);
									tagsTracker++;
								}
							}

							var ispublic = req.body.ispublic;
							console.log("is public = " + ispublic);
							if(ispublic == "public"){
								comic.isPublic = true;
							} else if (ispublic == "private"){
								comic.isPublic = false
							}
							if (req.body.comicdialog1 != comic.panelDialog1){
								comic.panelDialog1 = req.body.comicdialog1;
							}
							if (req.body.comicdialog2 != comic.panelDialog2){
								comic.panelDialog2 = req.body.comicdialog2;

							}
							if (req.body.comicdialog3 != comic.panelDialog3){
								comic.panelDialog3 = req.body.comicdialog3;
							}
							if (req.body.comicdialog4 != comic.panelDialog4){
								comic.panelDialog4 = req.body.comicdialog4;
							}
							var count = 0;
							
							if(req.body.cell1 == 'on'){
								console.log("CELL 1 CHANGED: " + req.files[count].originalname);
								comic.panelFileName1 = req.files[count].originalname;
								count++;
							}
							if (req.body.cell2 == 'on') {
								console.log("CELL 2 CHANGED: " + req.files[count].originalname);
								comic.panelFileName2 = req.files[count].originalname;
								count++;
							}
							if (req.body.cell3 == 'on'){
								console.log("CELL 3 CHANGED: " + req.files[count].originalname);
								comic.panelFileName3 = req.files[count].originalname;
								count++;
							}
							if (req.body.cell4 == 'on'){
								console.log("CELL 4 CHANGED: " + req.files[count].originalname);
								comic.panelFileName4 = req.files[count].originalname;
								count++;
							}

							testCont = comic.contributors.length;
							if (comic.author != req.session.user.username && comic.contributors.indexOf(req.session.user.username > -1)){
								comic.contributors.push(req.session.user.username);
							}
							if (req.body.editable == 'fin') comic.edit = false;	
							testCont = comic.contributors.length;
							comic.dateUpdated = Date.now();
							comic.save(function(err, project) { 
								if (err) console.log(err);
							});


							console.log(comic);

							if(oldTitle != null){
								UserDoc.find({username:comic.author},function(err, user){
									if(user){
										for (var i = 0; i < user.comicstrips;i++){
											if(user.comicstrips[i] === oldTitle){
												console.log("CHANGING TITLE IN USER");
												user.comicstrips[i] = comic.title;
												break;
											}
										}
										user.save(function(err, project){});
									}
								});
							}
							ClearDownloadDirectory();
							var i = -1;
							async.each(req.files, function(thisFile, callback){	
								console.log(thisFile);
								gfs.exist(thisFile.originalname, function(err, found) {
									if (found) {
										gfs.remove(thisFile, function(err) {
											if (err) { }
											else { }									
										});
									}
								});

							fs.exists(thisFile.path, function(exists) {
									if (exists) {
										var writestream = gfs.createWriteStream({
											filename: thisFile.originalname,  // username_pp
											mode: 'w',
											content_type: thisFile.mimetype
										});
										fs.createReadStream(thisFile.path).pipe(writestream);
										writestream.on('close', function(file) {
											console.log("successfully written " + file.filename + ' to DB');
											// delete file from temporary folder
											fs.unlink(thisFile.path, function() { })				
											callback();
										});
									}
								});	

								
								
							}, function(err){
							    // if any of the file processing produced an error, err would equal that error
							    if( err ) {
							      // One of the iterations produced an error.
							      // All processing will now stop.
							      console.log('A file failed to process');
							    } else {
						      		console.log('All files have been processed successfully');
									var qstring = 'playback/?comicid=' + comic._id + '&comictitle=' + comic.title+'&edited=true';
									res.redirect('/'+qstring);
							    }
							});
					}
				});
			}
			else {
				res.redirect('/');
			}
		});




		function containsDup(arr:[string], obj:string){
			for (var item in arr){
				if(item === obj){
					return true;
				}
			}
			return false;
		}


		// ==============================================
		// GET + POST- Delete comic page               ===
		// ===============================================
		router.get('/confirmdelete', function (req, res, next) {
			var title = "Delete Comic Strip";
			res.render('confirmdelete', {title, ComicStripId: req.query.ComicStripId, ComicStripName: req.query.ComicStripName});
	});

        router.post('/confirmdelete', function (req, res) {
			console.log("In POST Delete Comic Strip = " + util.inspect(req.body));

			if (req.body.comicId) {
				ComicDoc.findById(req.body.comicId).remove().exec(function(err, user) {
					if (!err) {
						if (user) {
							console.log("comic removed \n\n");
						}
					}
				});
			}

			// show user view page
		    res.redirect('/profilepage');
		});


		// ===============================
		// GET Create Comic Strip page ===
		// ===============================
		router.get('/Createpage', function(req, res) {
		  	if (req.session.loggedIn === true) {
		    	// Show comic strip creation/upload page
				console.log('in create comic strip page');
		    	res.render('createpage', { title: 'Create Comic Strip' });
		    
		    } else {
		    	// show login page
		    	res.redirect('/');
		  	}
		});


	// ==============================================
	// POST Create Page - Upload user comic strip ===
	// ==============================================
	router.post('/createpage', function(req, res, next) {
		console.log("In Create Page - uploading files and saving them to mongodb");
		var userDocument;

		if (req.session.loggedIn === true) {
			var userId = req.session.userId;
			console.log('user id = ' + userId);

			if (req.files) {
				console.log("Have files: " + util.inspect(req.files));

				if (req.files.length != 4) {
					return next(new Error("Please upload some images to all panels first!"));
				} else {
					var csTitle = req.body.comicstripname;		// comic strip title
					var csIsPublished = false;

					var csDescription = req.body.comicdescription;

					var csIsPublic = false;
					var ispublic = req.body.ispublic;
					console.log("is public = " + ispublic);
					if(ispublic == "public"){
						csIsPublic = true;
					} else if (ispublic == "private"){
						csIsPublic = false
					}

					var tagsArr = req.body.tags.trim().toLowerCase().split(" ");//Seperate provided tags into array
					var uniqueTags = tagsArr.filter(function(elem, pos) {
						return tagsArr.indexOf(elem) == pos;
					});
					if (uniqueTags.length >= 8){
						uniqueTags = uniqueTags.slice(0, 8);
					}
					console.log('CSTitle = ' + csTitle);				

					ComicDoc.findOne({ title: csTitle, author: req.session.user.username}, function(err, comic) {
						if (!err) {
							if (comic) {
								console.dir('comic strip found - modifying its contents');

								console.dir('===found===' + comic);
								res.redirect('editpage/?comicid='+comic.id+'&comictitle='+comic.title);

							} else {
								// ===================
								// ADD comic strip ===
								// ===================
								console.log("ADD another comic strip");
								var pFileName1: String;
								var pNo1: Number;
								var pDialog1: String;

								var pFileName2: String;
								var pNo2: Number;
								var pDialog2: String;

								var pFileName3: String;
								var pNo3: Number;
								var pDialog3: String;

								var pFileName4: String;
								var pNo4: Number;
								var pDialog4: String;

								for (var i = 0; i < req.files.length; i++) {
								var tempDialog;
								if (i === 0) {
									pFileName1 = req.files[0].originalname;
									pDialog1 = req.body.comicdialog1;
								} else if (i == 1) {
									pFileName2 = req.files[1].originalname;
									pDialog2 = req.body.comicdialog1;
								} else if (i === 2) {
									pFileName3 = req.files[2].originalname;
									pDialog3 = req.body.comicdialog1;
								} else if (i == 3) {
									pFileName4 = req.files[3].originalname;
									pDialog4 = req.body.comicdialog1;
								}
								}
								var editable = req.body.editable == 'edit';
								var cs = ComicDoc.create({
									title: csTitle,
									tags: uniqueTags,
									description: csDescription,
									isPublic: csIsPublic,
									author: req.session.user.username,
									edit: editable,

									panelFileName1: pFileName1,
									panelNo1: 1,
									panelDialog1: req.body.comicdialog1,

									panelFileName2: pFileName2,
									panelNo2: 2,
									panelDialog2: req.body.comicdialog2,

									panelFileName3: pFileName3,
									panelNo3: 3,
									panelDialog3: req.body.comicdialog3,

									panelFileName4: pFileName4,
									panelNo4: 4,
									panelDialog4: req.body.comicdialog4
								});

								UserDoc.findById(req.session.userId, function(err, user){
									if(err){
										console.log('Error Finding User');
									}
									else{
										user.comicstrips.push(csTitle);
										user.save(function(err, project) { });
									}
								});
							}
							
							console.log("file path = " + req.files[0].path);

							console.log("Now saving files to mongoDB");
							
							var async = require('async');
							var i = -1;

							async.each(req.files, function(thisFile, callback){

								fs.exists(thisFile.path, function(exists) {
									if (exists) {
		
										i = i + 1;
										console.log("saving file no " + i + " to db === " + thisFile.originalname )	
										console.log("file path is = " + thisFile.path + "\n\n")

										var writestream = gfs.createWriteStream({
											filename: thisFile.originalname,
											mode: 'w',
											content_type: thisFile.mimetype
										});

										fs.createReadStream(thisFile.path).pipe(writestream);

										writestream.on('close', function(file) {
											console.log("successfully written " + file.filename + ' to DB');

											// delete file from temporary folder
											fs.unlink(thisFile.path, function(err) {
												if (err){
													callback();		// file not found -- just continue to next task
												}	
											});
											callback();
										});
									}
								});
							}, function(err){
							    // if any of the file processing produced an error, err would equal that error
							    if( err ) {
							      // One of the iterations produced an error.
							      // All processing will now stop.
							      console.log('A file failed to process');
							    } else {
									console.log('id ' + cs._id + 'title ' + cs.title);
									res.redirect('/profilepage');
							    }
							});
						}
					});
				}
			}
		}
	});

//====================================================================
		module.exports = router;
	} // end of start()
} // end of class Router

var router = new Router();
router.start();
//====================================================================