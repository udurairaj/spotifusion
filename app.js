 /**
  * This is an example of a basic node.js script that performs
  * the Authorization Code oAuth2 flow to authenticate against
  * the Spotify Accounts.
  *
  * For more information, read
  * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
  */

 var { initializeApp } = require('firebase/app');
 var { getDatabase, ref, get, set, child, update, push } = require('firebase/database');
 const firebaseConfig = {
     apiKey: "AIzaSyByARuOsxig3xXyLQo5v7rIdsl2zKz6V8g",
     authDomain: "spotifusion22.firebaseapp.com",
     databaseURL: "https://spotifusion22-default-rtdb.firebaseio.com",
     projectId: "spotifusion22",
     storageBucket: "spotifusion22.appspot.com",
     messagingSenderId: "880369155427",
     appId: "1:880369155427:web:40479da514289d7db66756",
     measurementId: "G-31JNM3QML3"
 };
 const app_ = initializeApp(firebaseConfig);
 var database = getDatabase(app_);


 var express = require('express'); // Express web server framework
 const SpotifyWebApi = require('spotify-web-api-node');
 const url = require('url').URL;


 var client_id = 'd6cc8aeb975e401b9a736b0a64ae9f48'; // Your client id
 var client_secret = 'aad2cb7f1c8d41c396b4f9c28ccfed66'; // Your secret
 var redirect_uri = 'https://spotifusion.herokuapp.com/createjoin/'; // Your redirect uri
 var scopes = ['user-read-private', 'user-read-email', 'user-top-read', 'playlist-modify-public', 'playlist-read-collaborative', 'playlist-read-private', 'user-library-read'],
     state = 'spotify_auth_state';
 var mySpotifyApi = new SpotifyWebApi({
     redirectUri: redirect_uri,
     clientId: client_id,
     clientSecret: client_secret
 });
 var authorizeURL = mySpotifyApi.createAuthorizeURL(scopes, state);

 var app = express();
 var path = require('path');
 const { read, access } = require('fs');


 app.set('port', process.env.PORT);
 app.engine('html', require('ejs').renderFile);
 app.set('view engine', 'html');
 app.use(express.static(path.join(__dirname + '/views/')));


 let results = {};

 async function createSpotifyAPIObject(code, username) {
     // retrieve access and refresh token of username from database
     let access_token = "";
     let refresh_token = "";
     const dbRef = ref(database);
     let snapshot = await get(child(dbRef, code + "/members/" + username));
     if (snapshot.exists()) {
         access_token = snapshot.val().access_token;
         refresh_token = snapshot.val().refresh_token;
         const spotifyApi__ = new SpotifyWebApi({
             clientId: 'd6cc8aeb975e401b9a736b0a64ae9f48',
             clientSecret: 'aad2cb7f1c8d41c396b4f9c28ccfed66',
             redirectUri: 'https://spotifusion.herokuapp.com/createjoin/'
         });

         spotifyApi__.setAccessToken(access_token);
         spotifyApi__.setRefreshToken(refresh_token);
         return spotifyApi__;
     } else {
         console.log("No data available");
     }
 }

 async function getGroupName(code) {
     const dbRef = ref(database);
     let snapshot = await get(child(dbRef, code + "/name"));
     if (snapshot.exists()) {
         return snapshot.val();
     } else {
         console.log("Group doesn't exist in database");
     }
 }

 async function getGroupMembers(code) {
     const dbRef = ref(database);
     let snapshot = await get(child(dbRef, code + "/members"));
     if (snapshot.exists()) {
         return snapshot.val();
     } else {
         console.log("Group doesn't exist in database");
     }
 }

 async function getGroupUsernames(code) {
     let members = await getGroupMembers(code);
     return Object.keys(members);
 }

 async function getMyUsername() {
     return mySpotifyApi.getMe().then(function(data) {
         console.log("id is " + data.body.id)
         return data.body.id;
     }, function(err) {
         console.error(err);
     })
 }

 async function getMyEmail() {
     return mySpotifyApi.getMe().then(function(data) {
         console.log("email is " + data.body)
         return data.body.email;
     }, function(err) {
         console.error(err);
     })
 }

 async function updateTokens(code, access_token, refresh_token, display_name) {
     let username = await getMyUsername();
     console.log("username " + username)
     if (username == undefined) {
         username = await getMyEmail();
     }
     const dbRef = ref(database);
     await update(child(dbRef, code + "/members/" + username), {
         access_token: access_token,
         refresh_token: refresh_token
     });
 }

 // Returns array of songs
 async function getTopSongs(code, username, offset, length, time_range) {
     let spotifyApi = await createSpotifyAPIObject(code, username);
     //console.log("CREATED API OBJECT")
     return spotifyApi.getMyTopTracks({ limit: length, offset: offset, time_range: time_range })
         .then(function(data) {
             let topTracks = data.body.items;
             return topTracks;
         }, function(err) {
             console.log('Something went wrong in gettopsongs!', err);
         });
 }

 // Returns array of audio features
 async function getAudioFeatures(code, username, trackIDs) {
     let spotifyApi = await createSpotifyAPIObject(code, username);
     return spotifyApi.getAudioFeaturesForTracks(trackIDs)
         .then(function(data) {
             //console.log(data.body);
             return data.body;
         }, function(err) {
             done(err);
         });
 }

 async function addToPlaylist(code, username, id, trackURIs) {
     let spotifyApi = await createSpotifyAPIObject(code, username);
     //console.log("ID:", id);
     return spotifyApi.addTracksToPlaylist(id, trackURIs)
         .then(function(data) {
             //console.log('Added tracks to playlist!');
             return data;
         }, function(err) {
             console.log('Something went wrong!', err);
         });
 }

 async function createPlaylist(code, username, title, description, trackURIs) {
     let spotifyApi = await createSpotifyAPIObject(code, username);

     return spotifyApi.createPlaylist(title, { 'description': description, 'public': true })
         .then(function(data) {
             for (let i = 0; i < trackURIs.length / 100; i++) {
                 addToPlaylist(code, username, data.body.id, trackURIs.slice(100 * i, 100 * (i + 1)));
             }
             return data.body.id;
         }, function(err) {
             console.log('Something went wrong!', err);
         });

 }

 async function getPlaylists(code, username, offset, length) {
     let spotifyApi = await createSpotifyAPIObject(code, username);

     return spotifyApi.getUserPlaylists(username, { limit: length, offset: offset })
         .then(function(data) {
             return data.body;
         }, function(err) {
             console.log('Something went wrong!', err);
         });
 }

 async function getPlaylistTracks(code, username, id) {
     let spotifyApi = await createSpotifyAPIObject(code, username);

     return spotifyApi.getPlaylist(id)
         .then(function(data) {
                 return data.body.tracks;
             },
             function(err) {
                 console.log('Something went wrong!', err);
             });
 }

 // Returns whether the access code / group already exists in database
 async function accessCodeExists(code) {
     const dbRef = ref(database);
     let snapshot = await get(child(dbRef, code));
     return snapshot.exists();
 }

 // Creates group in database
 async function createGroup(code, name, host, display_name) {
     const dbRef = ref(database);
     let snapshot = await get(child(dbRef, code));
     if (!snapshot.exists()) {
         await update(child(dbRef, "/"), {
             [code]: {
                 name: name,
                 members: {
                     [host]: { display_name: display_name }
                 },
                 count: 1,
                 generating: false,
                 playlist_id: "invalid"
             }
         });
     } else {
         console.log("ERROR: Group already exists")
     }
 }


 // Adds user to group
 async function addToGroup(code, username, display_name) {
     const dbRef = ref(database);
     let snapshot = await get(child(dbRef, code + "/members/"));
     if (snapshot.exists()) {
         var count = Object.keys(snapshot.val()).length + 1;
         console.log("count" + count + " snap " + snapshot.val());
         await update(child(dbRef, code + "/members/"), {
             [username]: { display_name: display_name }
         });
         await update(child(dbRef, code), {
             count: count
         });
     } else {
         console.log("ERROR: Group doesn't exist")
     }
 }

 // Returns array of songs
 async function getMyInfo(code, username) {
     let spotifyApi = await createSpotifyAPIObject(code, username);
     return spotifyApi.getMe()
         .then(function(data) {
             let me = data.body;
             return me;
         }, function(err) {
             console.log('Something went wrong!', err);
         });
 }

 // Returns recommendations based on seed tracks
 async function getRecommendations(code, username, seed_tracks) {
     let spotifyApi = await createSpotifyAPIObject(code, username);
     return spotifyApi.getRecommendations({
             seed_tracks: seed_tracks
         })
         .then(function(data) {
             return data.body;
         }, function(err) {
             console.log("Something went wrong!", err);
         });

 }

 // Returns user's saved tracks
 async function getSavedTracks(code, username, offset) {
     let spotifyApi = await createSpotifyAPIObject(code, username);
     return spotifyApi.getMySavedTracks({ limit: 50, offset: offset })
         .then(function(data) {
             return data.body;
         }, function(err) {
             console.log("Something went wrong!", err);
         });

 }
 // Checks if each track in inputted list is in the user's saved tracks 
 // Returns array of booleans (each element corresponds to the respective track in inputted tracks list)
 async function areTracksSaved(code, username, tracks) {
     let spotifyApi = await createSpotifyAPIObject(code, username);
     return spotifyApi.containsMySavedTracks(tracks)
         .then(function(data) {
             return data.body;
         }, function(err) {
             console.log("Something went wrong!", err);
         });

 }

  // Checks and returns generating flag
  async function checkGeneratingFlag(code) {
    const dbRef = ref(database);
    let snapshot = await get(child(dbRef, code + "/generating"));
    if (snapshot.exists()) {
        console.log("the generating flag is " + snapshot.val());
        return snapshot.val();
    } else {
        return false;
    }
}

// Returns generated playlist ID, or null if it doesn't exist yet
async function getGeneratedPlaylist(code) {
    const dbRef = ref(database);
    let snapshot = await get(child(dbRef, code + "/playlist_id"));
    if (snapshot.exists()) {
        return snapshot.val();
    } else {
        return "";
    }
}


 async function followPlaylist(code, username, playlistID) {
     let spotifyApi = await createSpotifyAPIObject(code, username);
     return spotifyApi.followPlaylist(playlistID,
        {
            'public' : true
        }).then(function(data) {
            return data;
        }, function(err) {
            console.log("Something went wrong!", err);
        });
 }

 function randomString(length, chars) {
     var mask = '';
     if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnpqrstuvwxyz';
     if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNPQRSTUVWXYZ';
     if (chars.indexOf('#') > -1) mask += '123456789';
     if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
     var result = '';
     for (var i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
     return result;
 }

 function obtain_results(success, fail) {
     mySpotifyApi.getMe().then(function(data) {
         results['display_name'] = data.body['display_name'];
         results['username'] = data.body.id;
         results['type'] = data.body['type'];
         console.log("Done.");
         success(results);
     }, function(err) {
         console.error(err);
         fail();
     })

 }

 app.get('/', function(req, res) {
     console.log(req.method + " " + req.route.path);
     res.render('index.html');
 });

 app.post('/', function(req, res) {
     console.log(req.method + " " + req.route.path);
     res.redirect(authorizeURL);
 });

 app.get('/createjoin', function(req, res) {
     console.log(req.method + " " + req.route.path);

     const current_url = new url('https://spotifusion.herokuapp.com' + req.url);
     const authCode = current_url.searchParams.get('code');

     // Retrieve an access token and a refresh token
     mySpotifyApi.authorizationCodeGrant(authCode).then(
         async function(data) {
             // Set the access token on the API object to use it in later calls
             mySpotifyApi.setAccessToken(data.body['access_token']);
             mySpotifyApi.setRefreshToken(data.body['refresh_token']);
             await updateTokens('ABCD', data.body['access_token'], data.body['refresh_token']);
             obtain_results(
                 function() {
                     results['access_token'] = data.body['access_token'];
                     console.log("results is " + JSON.stringify(results))
                     res.render('createjoin.html', { results: JSON.stringify(results) });
                 },
                 function() { console.log("ERRORERROR"); });
         },
         function(err) {
             console.log('Something went wrong! Refreshing token now...');
             mySpotifyApi.refreshAccessToken().then(
                 async function(data) {
                     // Save the access token so that it's used in future calls
                     mySpotifyApi.setAccessToken(data.body['access_token']);
                     mySpotifyApi.setRefreshToken(data.body['refresh_token']);
                     console.log('The access token has been refreshed!');
                     await updateTokens('ABCD', data.body['access_token'], data.body['refresh_token']);
                     obtain_results(
                         function() {
                             results['access_token'] = data.body['access_token'];
                             results['refresh_token'] = data.body['refresh_token'];
                             res.render('createjoin.html', { results: JSON.stringify(results) });
                         },
                         function() { console.log("ERROR ERROR ERROR") });
                 },
                 function(err) {
                     console.log('Could not refresh access token', err);
                     console.log("MOREMORE ERRORERROR");
                 }
             );
         }
     );

 });

 app.get('/group', async function(req, res) {
     console.log("GROUP LOADED");
     console.log(req.method + " " + req.route.path);
     if (req.query.group_name) {
         results['group_name'] = req.query.group_name;
         results['access_code'] = randomString(4, "a#");
         while (await accessCodeExists(results['access_code'])) {
             results['access_code'] = randomString(4, "a#");
         }
         console.log("code dne so create group");
         await createGroup(results['access_code'], results['group_name'], results['username'], results['display_name']);
         await updateTokens(results['access_code'], mySpotifyApi.getAccessToken(), mySpotifyApi.getRefreshToken());
         results['group_members'] = await getGroupMembers(results['access_code']);
         console.log(results['group_members']);
     } else {
         results['access_code'] = req.query.pin1 + req.query.pin2 + req.query.pin3 + req.query.pin4;
         console.log("join " + results['access_code']);
         results['group_name'] = await getGroupName(results['access_code']);
         if (!await accessCodeExists(results['access_code'])) {
             console.log("ERROR: access code dne");
             // SHOW ERROR MESSAGE SOMEHOW????? REDIRECT BACK TO CREATEJOIN
         } else {
             console.log("group found in db");
             await addToGroup(results['access_code'], results['username'], results['display_name']);
             await updateTokens(results['access_code'], mySpotifyApi.getAccessToken(), mySpotifyApi.getRefreshToken());
             results['group_members'] = await getGroupMembers(results['access_code']);
             console.log(results['group_members']);
         }
     }
     console.log(results['access_code']);
     console.log(results['group_name']);

     results['loading_songs'] = [];
     let usernames = await getGroupMembers(results['access_code']);
     //console.log(usernames);
     for (const user in usernames) {
         // Call API for specific person and get 5 top songs
         //console.log("is this working? " + user);
         let user_songs = await getTopSongs(results['access_code'], user, 0, 2, "short_term");
         //console.log("USER SONGS:", user_songs);
         for (let j = 0; j < user_songs.length; j++) {
             results['loading_songs'].push(user_songs[j].id);
         }
     }

     res.render('group.html', { results: JSON.stringify(results) });
 });

 app.get('/refresh_members', async function(req, res) {
     var old_members = results['group_members']
     var new_members = await getGroupMembers(results['access_code']);
     console.log("LENGTHS: ", Object.keys(old_members).length, Object.keys(new_members).length);
     //  if (Object.keys(old_members).length != Object.keys(new_members).length) {
     console.log("here")
     results['group_members'] = new_members;
     results['loading_songs'] = [];
     let usernames = await getGroupMembers(results['access_code']);
     console.log(usernames);
     for (const user in usernames) {
         // Call API for specific person and get 5 top songs
         console.log("is this working? " + user);
         let user_songs = await getTopSongs(results['access_code'], user, 0, 2, "short_term");
         //  console.log("USER SONGS:", user_songs);
         for (let j = 0; j < user_songs.length; j++) {
             results['loading_songs'].push(user_songs[j].id);
         }
     }
     if (await checkGeneratingFlag(results['access_token'])) {
        res.render('loading.html', { results: JSON.stringify(results) });
     } else {
        res.send(results);
     }
 });

 module.exports = { createSpotifyAPIObject, getTopSongs, getAudioFeatures, createPlaylist, getPlaylists, getPlaylistTracks, getSavedTracks, areTracksSaved, getRecommendations, getGroupUsernames, getGroupMembers, followPlaylist };

 var { generatePlaylist } = require('./algorithm.js')

 app.get('/generate', async function(req, res) {
     console.log(req.method + " " + req.route.path);
     if (!await checkGeneratingFlag(results['access_code'])) {
        await update(child(dbRef, results['access_code']), {
            generating: true
        });

        console.log("generating playlist for " + results['access_code'])
        let playlist = await generatePlaylist(results['access_code'], results['group_name']);
        if (playlist) {
            res.send(playlist)
            await update(child(dbRef, results['access_code']), {
                playlist_id: playlist
            });
            return;
        } else {
            res.send("error");
            return;
        }
    }
    while (await getGeneratedPlaylist(results['access_code']) == "invalid") {}
    let playlist_id = await getGeneratedPlaylist(results['access_code']);
    res.send(playlist_id);
 });

 console.log('Listening on 8888');
 app.listen(app.get('port'));
