/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var firebase = require('firebase/app');
require('firebase/database');


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

firebase.initializeApp(firebaseConfig);

// Get a reference to the database service
var database = firebase.database().ref();


var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const SpotifyWebApi = require('spotify-web-api-node');

var client_id = 'd6cc8aeb975e401b9a736b0a64ae9f48'; // Your client id
var client_secret = 'aad2cb7f1c8d41c396b4f9c28ccfed66'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

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

function createSpotifyAPIObject(username) {
    // retrieve access and refresh token of username from database
    let access_token = "";
    let refresh_token = "";
    if (username == "amittal26") {
        access_token = "BQCRXUP_UZ2O91Cn-7WXZlcfrJYjZZoxOpp22s9WmVScHzfy98ftr0VA1CZKGRpvza1sT6f4FPTX9rEZ9zCNV1ybvL41AHJjGq9Dn1ofCQd413pQl2XLs9KN5U8_wcD93h9CKk_PYjAluDfLuqMl-iAayo_Kbt2B";
        refresh_token = "AQAu_n5M7D-N99jBw8Fue4Z4ij7qymA-30TiMmw238pUgnM0NnHMLnqFkGFv5mS33biYDFz0iomfHwYRyHIYDqF4xNjiklUtWZkDUO4H8418RLlycVZ4APhtccam2lI-Of0";
    } else {
        access_token = "BQDA5qF_qRGPK8qwlzXVoeM8Zelou4ciSBy6T52MMarkB8PRzIny4O0LyxFBP07VspXK8aU6YV4jXG3dmD6rG0hpX50cLUA3kAHVhPu8I1MgOaP2jvJLMelPlBllqeOQXIfsXzC0SAZshfK_IYPaX4qFRcmvvgro_jKciA";
        refresh_token = "AQDethieTbJcBB7lsDUUWzzV9fAGDW-ReyTh9s-1BiEaIMS1yxaC6jA_Ay0UgMGd76v27WQg9ElIx_pha4bA5MVBT_fEQS9wYugHgNDNWvGpePozIFmUD9TVIwRsekLtASg";
    }
    const spotifyApi = new SpotifyWebApi({
        clientId: 'd6cc8aeb975e401b9a736b0a64ae9f48',
        clientSecret: 'aad2cb7f1c8d41c396b4f9c28ccfed66',
        redirectUri: 'http://localhost:8888/callback'
    });

    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);
}

// Returns array of songs
function getTopSongs(username, offset, length) {
    let spotifyApi = createSpotifyAPIObject(username);
    spotifyApi.getMyTopTracks({ limit: length, offset: offset })
        .then(function(data) {
            let topTracks = data.body.items;
            console.log(topTracks);
            return topTracks;
        }, function(err) {
            console.log('Something went wrong!', err);
        });
}

// Returns array of audio features
function getAudioFeatures(username, trackIDs) {
    let spotifyApi = createSpotifyAPIObject(username);
    spotifyApi.getAudioFeaturesForTracks(trackIDs)
        .then(function(data) {
            console.log(data.body);
            return data.body;
        }, function(err) {
            done(err);
        });
}

// Returns URI of created playlist to embed into web app
function createPlaylist(username, title, description, trackURIs) {
    let spotifyApi = createSpotifyAPIObject(username);
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

function readFirebaseData(group) {
    var starCountRef = firebase.database().ref(group);
    starCountRef.on('value', (snapshot) => {
        const data = snapshot.val();
        console.log(data);
    });
}

readFirebaseData("ABCD");