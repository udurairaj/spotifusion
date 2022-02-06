/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var { initializeApp } = require('firebase/app');
var { getDatabase, ref, get, child } = require('firebase/database');


// TODO: Replace with your app's Firebase project configuration
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

// Get a reference to the database service
var database = getDatabase(app_);


var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const SpotifyWebApi = require('spotify-web-api-node');

var client_id = 'd6cc8aeb975e401b9a736b0a64ae9f48'; // Your client id
var client_secret = 'aad2cb7f1c8d41c396b4f9c28ccfed66'; // Your secret
var redirect_uri = 'http://localhost:8888/createjoin.html'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());

const spotifyApi = new SpotifyWebApi({
    clientId: 'd6cc8aeb975e401b9a736b0a64ae9f48',
    clientSecret: 'aad2cb7f1c8d41c396b4f9c28ccfed66',
    redirectUri: 'http://localhost:8888/callback'
});


app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'user-read-private user-read-email';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function(req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                // Set the access token and refresh token
                spotifyApi.setAccessToken(access_token);
                spotifyApi.setRefreshToken(refresh_token);

                console.log("the spotifyapi access token is now " + access_token);
                console.log("the spotifyapi refresh token is now " + refresh_token);

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    console.log(body);
                });

                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            spotifyApi.setAccessToken(access_token);
            console.log("the spotifyapi access token is now " + access_token);

            res.send({
                'access_token': access_token
            });
        }
    });
});

console.log('Listening on 8888');
app.listen(8888);

function createAuthURL() {
    var scopes = ['user-read-private', 'user-read-email'],
        redirectUri = 'http://localhost:8888/createjoin.html',
        clientId = 'd6cc8aeb975e401b9a736b0a64ae9f48',
        state = 'spotify_auth_state';


    // Setting credentials can be done in the wrapper's constructor, or using the API object's setters.
    var spotifyApi = new SpotifyWebApi({
        redirectUri: redirectUri,
        clientId: clientId
    });

    // Create the authorization URL
    var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

    // https://accounts.spotify.com:443/authorize?client_id=5fe01282e44241328a84e7c5cc169165&response_type=code&redirect_uri=https://example.com/callback&scope=user-read-private%20user-read-email&state=some-state-of-my-choice
    console.log(authorizeURL);
    return authorizeURL;
}

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
            redirectUri: 'http://localhost:8888/callback'
        });

        spotifyApi__.setAccessToken(access_token);
        spotifyApi__.setRefreshToken(refresh_token);
        return spotifyApi__;
    } else {
        console.log("No data available");
    }

}

// Returns array of songs
async function getTopSongs(code, username, offset, length) {
    let spotifyApi_ = await createSpotifyAPIObject(code, username);
    spotifyApi_.getMyTopTracks({ limit: length, offset: offset })
        .then(function(data) {
            let topTracks = data.body.items;
            console.log(topTracks);
            return topTracks;
        }, function(err) {
            console.log('Something went wrong in gettopsongs!', err);
        });
}

// Returns array of audio features
async function getAudioFeatures(code, username, trackIDs) {
    let spotifyApi = await createSpotifyAPIObject(code, username);
    spotifyApi.getAudioFeaturesForTracks(trackIDs)
        .then(function(data) {
            console.log(data.body);
            return data.body;
        }, function(err) {
            done(err);
        });
}

// Returns URI of created playlist to embed into web app
async function createPlaylist(code, username, title, description, trackURIs) {
    let spotifyApi = await createSpotifyAPIObject(code, username);
    let id = "";

    spotifyApi.createPlaylist(title, { 'description': description, 'public': true })
        .then(function(data) {
            console.log('Created playlist!');
            id = data.id;
        }, function(err) {
            console.log('Something went wrong!', err);
        });

    spotifyApi.addTracksToPlaylist(id, trackURIs)
        .then(function(data) {
            console.log('Added tracks to playlist!');
            return uri;
        }, function(err) {
            console.log('Something went wrong!', err);
        });
}

// Returns array of songs
async function getMyInfo(code, username) {
    let spotifyApi = await createSpotifyAPIObject(code, username);
    spotifyApi.getMyTopTracks({ limit: length, offset: offset })
        .then(function(data) {
            let topTracks = data.body.items;
            console.log(topTracks);
            return topTracks;
        }, function(err) {
            console.log('Something went wrong!', err);
        });
}

module.exports = { createAuthURL, createSpotifyAPIObject, getTopSongs, getAudioFeatures, createPlaylist };