var { getTopSongs, getAudioFeatures, getPlaylists, getPlaylistTracks, createPlaylist, areTracksSaved, getSavedTracks, getRecommendations, getGroupUsernames, getGroupMembers } = require("./app.js");
// Temporary test variables

// let list1 = ["1", "2", "3"];
// let list2 = ["2", "3", "4"];
// let list3 = ["3", "4", "5"];

// let users_lists = [list1, list2, list3];

let playlist_lengths = [1800000, 3600000, 7200000, 10800000, 14400000, 18000000, 21600000, 25200000, 28800000, 32400000, 36000000, 39600000, 43200000];
let playlist_length = playlist_lengths[4];

let users = [];
let range = ["short_term", "medium_term", "long_term"]
let code = "INVALID"

// End test variables

// Global variables

let song_map = new Map();
let song_set = new Set();
let playlist_set = new Set();

let num_users = users.length;
let threshold = num_users / 2;

// End global variables

// Function that takes in list of lists of users' songs and adds them to map and set
// Optional threshold_parameter if this is beyond the first iteration; on the first iteration
// threshold defaults to half the number of users. The number of users is a global variable.
async function CheckSets(list, liked) {
    // Iterate through each user to get their list of songs
    for (let i = 0; i < list.length; i++) {
        let curr_list = list[i];
        // Iterate through each song in the current user's list
        //console.log("LIST LENGTH:", list.length);
        for (let j = 0; j < curr_list.length; j++) {
            let curr_song = curr_list[j];
            // If the song is already in the map
            if (song_map.has(curr_song)) {
                let common_users = song_map.get(curr_song);
                // If this user is not already associated with the song add their index
                if (common_users.indexOf(i) == -1) {
                    common_users.push(i);
                    // If the song meets the threshold
                    if (common_users.length > threshold) {
                        // Add to the set if not already there
                        if (!song_set.has(curr_song)) {
                            song_set.add(curr_song);
                        }
                    }
                }
            }
            // Add the song to the map with the associated user
            else {
                song_map.set(curr_song, [i]);
            }
        }
        if (!liked) {
            await CheckSaved(curr_list, i);
        }
    }

    // Check if new set meets length requirement
    return await CheckLength();
}

async function Recalculate() {
    for (var [key, value] of song_map.entries()) {
        if (value.length > threshold) {
            song_set.add(key);
        }
    }
    return await CheckLength();
}

async function CheckSaved(list, user) {
    for (let i = 0; i < num_users; i++) {
        if (i != user) {
            for (let k = 0; k < list.length / 50; k++) {
                let bools = await areTracksSaved(code, users[i], list.slice(k * 50, (k + 1) * 50));
                for (let j = 0; j < bools.length; j++) {
                    if (bools[j]) {
                        let curr_song = list[j];
                        let common_users = song_map.get(curr_song);
                        // If this user is not already associated with the song add their index
                        if (common_users.indexOf(i) == -1) {
                            common_users.push(i);
                            // If the song meets the threshold
                            if (common_users.length > threshold) {
                                // Add to the set if not already there
                                if (!song_set.has(curr_song)) {
                                    song_set.add(curr_song);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

async function CheckLength() {
    let total_time = 0;
    let long_enough = false;
    playlist_set.clear();
    // Call API to get data for all the songs currently in the set
    // CHANGE FILLER NAME
    let IDs = GetIDList();
    if (IDs.length == 0) {
        return false;
    }
    //console.log("IDS:", IDs);
    for (let i = 0; i < IDs.length / 100; i++) {
        if (long_enough) {
            break;
        }
        let feature_list = await getAudioFeatures(code, users[0], IDs.slice(100 * i, (100 * (i + 1))));
        //console.log("FEATURES:", feature_list);
        let song_feature_list = feature_list.audio_features;
        for (let j = 0; j < song_feature_list.length; j++) {
            total_time += song_feature_list[j].duration_ms;
            playlist_set.add(song_feature_list[j].id);
            long_enough = total_time >= playlist_length;
            if (long_enough) {
                break;
            }
        }
    }
    return long_enough;
}

// Get ID list from set of IDs
function GetIDList() {
    let song_param = [];
    for (let song of song_set) {
        song_param.push(song)
    }
    //console.log(song_string);
    return song_param;
}

// Use API data to make array of song IDs for each user
async function GetSongList(iteration) {
    let users_song_lists = [];
    // Loop through people
    for (let i = 0; i < num_users; i++) {
        let song_list = [];
        // Call API for specific person
        let user_songs = await getTopSongs(code, users[i], 0, 50, range[iteration]);
        //console.log("USER SONGS:", user_songs);
        for (let j = 0; j < user_songs.length; j++) {
            song_list.push(user_songs[j].id);
        }
        users_song_lists.push(song_list);
    }
    //console.log("SONG LIST:", users_song_lists);
    return users_song_lists;
}

async function GetPlaylistListList() {
    let playlist_list_list = [];
    for (let i = 0; i < num_users; i++) {
        let playlist_list = await getPlaylists(code, users[i], 0, 20);
        let items = playlist_list.items;
        let playlist_id_list = [];
        for (let j = 0; j < items.length; j++) {
            // console.log(items[j].owner.uri);
            // console.log(items[j].name);
            if (!items[j].name.includes("+")) {
                if (!items[j].name.includes("spotifusion")) {
                    if (items[j].name != "hacksc") {
                        playlist_id_list.push(items[j].id);
                        // console.log(items[j].name);
                        // console.log(items[j].owner.uri);
                    }
                }
            }
        }
        playlist_list_list.push(playlist_id_list);
    }
    // console.log(playlist_list_list.length);
    return playlist_list_list;
}

function getIDs(tracks) {
    let id_list = [];
    for (let i = 0; i < tracks.length; i++) {
        id_list.push(tracks[i].track.id);
    }
    return id_list;
}

function GetURIs() {
    let URIs = [];
    for (let song of playlist_set) {
        URIs.push("spotify:track:" + song);
    }
    return URIs;
}

function GetIDString(list) {
    let IDs = "";
    for (let i = 0; i < list.length - 1; i++) {
        IDs += list[i];
        IDs += ",";
    }
    IDs += list[list.length];
    return IDs;
}

async function MainLoop() {
    let finished = false;
    // Go through top 50 long, medium, short term songs
    for (let j = 0; j < 3; j++) {
        finished = await CheckSets(await GetSongList(j), false);
        if (finished) {
            break;
        }
    }
    if (!finished) {
        let users_playlists = await GetPlaylistListList();
        for (let i = 0; i < 20; i++) {
            let wrapper = [];
            for (let k = 0; k < users_playlists.length; k++) {
                let user_wrapper = [];
                let curr_user = users_playlists[k];
                if (curr_user.length > i) {
                    let curr_playlist = curr_user[i];
                    let tracks = await getPlaylistTracks(code, users[k], curr_playlist);
                    //console.log("TRACKS:", tracks);
                    let IDs = getIDs(tracks.items);
                    for (let t = 0; t < IDs.length; t++) {
                        user_wrapper.push(IDs[t]);
                    }
                }
                //console.log("USER WRAPPER:", user_wrapper.length);
                wrapper.push(user_wrapper);
            }
            //console.log("WRAPPER:", wrapper.length);
            // console.log("WRAPPER:", wrapper)
            finished = await CheckSets(wrapper, false);
            if (finished) {
                break;
            }
        }
    }
    while (!finished) {
        threshold--;
        if (threshold < 2) {
            break;
        }
        finished = await Recalculate();
    }
    if (!finished) {
        let offset = 0;
        let wrapper = [];
        let max_length = 0;
        for (let i = 0; i < num_users; i++) {
            let songs = await getSavedTracks(code, users[i], offset);
            let user_wrapper = getIDs(songs.items);
            wrapper.push(user_wrapper);
            if (user_wrapper.length > max_length) {
                max_length = user_wrapper.length;
            }
        }
        while (max_length > 0) {
            finished = await CheckSets(wrapper, true);
            // console.log(song_set.length);
            if (finished) {
                break;
            }
            offset += 50;
            wrapper = [];
            max_length = 0;
            for (let i = 0; i < num_users; i++) {
                let songs = await getSavedTracks(code, users[i], offset);
                let user_wrapper = getIDs(songs.items);
                wrapper.push(user_wrapper);
                if (user_wrapper.length > max_length) {
                    max_length = user_wrapper.length;
                }
            }
            //console.log(wrapper);
            //console.log("OFFSET:", offset);
        }
    }
    console.log("SET:", song_set);
    console.log("mao " + song_map)
    let song_set_list = GetIDList();
    let offset = 0;
    while (!finished) {
        if (offset > song_set_list.length) {
            break;
        }
        console.log("hihi" + users)
        let recommendations = await getRecommendations(code, users[0], song_set_list.slice(offset, offset + 5));
        console.log(recommendations)
        for (let i = 0; i < recommendations.tracks.length; i++) {
            song_set.add(recommendations.tracks[i].id);
            // console.log("ADDING", recommendations.tracks[i].id);
        }
        finished = await CheckLength();
        offset += 5;
    }

    //console.log("SET:", song_set);
    // console.log("MAP:", song_map);
    let playlist = await createPlaylist(code, users[1], "spotifusion test 12", "t-rex", GetURIs());
    console.log("DONE");
    return playlist;
}

// MainLoop();

async function generatePlaylist(access_code) {
    code = access_code;
    let members = await getGroupMembers("ABCD");
    users = Object.keys(members);
    console.log("generating playlist for " + access_code);
    return await MainLoop();
}

module.exports = { generatePlaylist };

// get list of usernames with code