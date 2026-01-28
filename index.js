// Slow-play by Kieran Walsh
/*
    Referenced the following when writing this code:
    Pitch shifting: https://zpl.fi/pitch-shifting-in-web-audio-api/
    Play local audio file: https://stackoverflow.com/questions/14074833/using-local-file-for-web-audio-api-in-javascript        
*/

// Variable assignments
// ********************

const AudioContext = window.AudioContext || window.webkitAudioContext;

var audioPlayer = document.querySelector("#audio-player");
var fileInput= document.querySelector("#file-input");
var mainPlayBtn = document.querySelector("#main-play");
var mainStopBtn = document.querySelector("#main-stop");
var mainDownloadBtn = document.querySelector("#main-download");
var rate = 0;
var playbackStatus = document.querySelector("#playback-status");
var mainConsole = document.querySelector("#console");
var aboutBtn = document.querySelector("#about");
var aboutOK = document.querySelector("#about-ok");
var aboutBox = document.querySelector("#about-box");
var downloadBox = document.querySelector("#download-box");
var downloadClose = document.querySelector("#close-download");

var fileSource = "";
var fileName = "";
var fileDuration = 0;

// Creating event listeners 
// ************************

fileInput.addEventListener("change", getFileInput);
aboutBtn.addEventListener("click", toggleAbout);
aboutOK.addEventListener("click", toggleAbout);

// Getting the file from input
// *************************

function getFileInput() {
    var files = fileInput.files;
    if (files.length > 0) {
        var file = URL.createObjectURL(files[0]); 
        audioPlayer.src = file; 
        fileSource = file;
        fileName = files[0].name;
    }

    // Hiding file input
    fileInput.style.display = "none";
    document.querySelector("#filename").innerHTML = fileName;
    document.querySelector("#select-new").style.display = "inline";
    mainPlayBtn.disabled = false;
    mainDownloadBtn.disabled = false;

    // Adding to AudioContext
    initAudio();
}

var started = false;
var intID = 0;
var recInt = 0;

function initAudio() {

    const context = new AudioContext();
    var source = context.createBufferSource();

    // Polyfill for old callback-based syntax used in Safari.
    if (context.decodeAudioData.length !== 1) {
        const originalDecodeAudioData = context.decodeAudioData.bind(context);
        context.decodeAudioData = buffer =>
            new Promise((resolve, reject) =>
            originalDecodeAudioData(buffer, resolve, reject));
    }

    loadSample(fileSource)
    
    .then(sample => {
        mainPlayBtn.addEventListener('click', event => {
            rate = getPlaybackSpeed();
            playSample(sample, rate);
            toggleButtons();
        });

        mainStopBtn.addEventListener("click", function() {
            source.stop(0);
            started = false;
            clearInterval(intID);
            playbackStatus.innerHTML = "Not playing";
            toggleButtons();
        });

        mainDownloadBtn.addEventListener("click", function() {
            toggleDownloadBox();
            rate = getPlaybackSpeed();
            playSample(sample, rate, true);
        });

        downloadClose.addEventListener("click", function() {
            toggleDownloadBox();
            source.stop(0);
            started = false;
            clearInterval(recInt);
            playbackStatus.innerHTML = "Not playing";
        });
    });

    function loadSample(url) {
        return fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => context.decodeAudioData(buffer));
    }
    
    function playSample(sample, rate, record = false) {
        if (started == true) {
            source.stop(0);
        }
        source = context.createBufferSource();
        source.buffer = sample;
        source.playbackRate.value = rate;
        if (record == false) {
            source.connect(context.destination);
        }
        source.start(0);
        started = true;

        var duration = source.buffer.duration / rate;
        var mins = Math.floor(duration / 60);
        var secs = Math.floor(duration % 60);
        if (secs < 10) {secs = "0" + secs;}

        //Export if "download" button was clicked
        if (record == true) {

            //When a source is being played
            var rec = new Recorder(source);
            rec.record();
            var count = 0;
            var durationInt = Math.floor(duration);
            let durMas = convertSecondsToMinutesAndSeconds(durationInt);
            document.getElementById("download-time-left").innerHTML = durMas[0] + "m " + durMas[1] + "sec left";

            var progressStatus = document.querySelector('#progress-status');
            recInt = setInterval(function() {
                count++;
                if (count > durationInt || source.ended || started == false) {
                    // When the source stops
                    rec.stop();
                    rec.exportWAV(callback);
                    clearInterval(recInt);
                }
                else {
                    var width = (300 / durationInt) * count;
                    progressStatus.style.width = width + "px";
                    let timeLeft = durationInt - count;
                    let mas = convertSecondsToMinutesAndSeconds(timeLeft);
                    document.getElementById("download-time-left").innerHTML = mas[0] + "m " + mas[1] + "sec left";
                }
                
            }, 1000);
        }

        else if (record == false) {
            playbackStatus.innerHTML = "<span id='current-time'>0:00</span>" +" // " + mins + ":" + secs;
            trackPlayTime(Math.floor(duration));
        }

        /*
        const offlineCtx = new OfflineAudioContext(1, 1, 44100);
        var offlineSource = offlineCtx.createBufferSource();
        offlineSource.buffer = sample;
        offlineSource.playbackRate.value = rate;
        offlineSource.connect(offlineCtx.destination);
        offlineCtx.startRendering();
        offlineCtx.oncomplete = function(e) {
            var newBuffer = e.renderedBuffer;
        }
        //offlineContext.oncomplete = "";
        */

    }
}

function getPlaybackSpeed() {
    var radios = document.querySelectorAll(".radio");
    var speed = 0;
    for (let i = 0; i < radios.length; i++) {
        if (radios[i].checked == true) {
            switch(i) {
                case 0:
                    speed = 0.5;
                    break;
                case 1:
                    speed = 0.8;
                    break;
                case 2: 
                    speed = 1.0;
                    break;
                case 3: 
                    speed = 1.25;
                    break;
            }
            return speed;
        }
    }
}

function convertSecondsToMinutesAndSeconds(seconds) {
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    if (secs < 10) {secs = "0" + secs;}
    return [mins, secs]
}

function trackPlayTime(duration) {
    var count = 0;
    intID = setInterval(function() {
        if (count < duration) {
            count++;
            var mins = Math.floor(count / 60);
            var secs = Math.floor(count % 60);
            if (secs < 10) {secs = "0" + secs;}
            document.querySelector('#current-time').innerHTML = mins + ":" + secs + " ";
        }
        else {
            toggleButtons();
            clearInterval(intID);
        }
    }, 1000);
}

function toggleButtons() {
    if (mainPlayBtn.disabled == true) {
        mainPlayBtn.disabled = false;
        mainStopBtn.disabled = true;
    }
    else {
        mainPlayBtn.disabled = true;
        mainStopBtn.disabled = false;
    }
}

function toggleAbout() {
    if (aboutBox.style.display == "block") {
        aboutBox.style.display = "none";
    }
    else {
        aboutBox.style.display = "block";
    }
}

function toggleDownloadBox() {
    if (downloadBox.style.display == "block") {
        downloadBox.style.display = "none";
        mainPlayBtn.removeAttribute("disabled");
        mainStopBtn.removeAttribute("disabled");
        mainDownloadBtn.removeAttribute("disabled");
    }
    else {
        downloadBox.style.display = "block";
        document.querySelector('#progress-status').style.width = 0;
        document.querySelector('#download-btn').innerHTML = "Download";
        document.querySelector('#download-btn').setAttribute("disabled", "true");
        mainPlayBtn.setAttribute("disabled", "true");
        mainStopBtn.setAttribute("disabled", "true");
        mainDownloadBtn.setAttribute("disabled", "true");
    }
}

function callback(blob) {
    var url = URL.createObjectURL(blob);
    updateDownloadButtonWithLink(url);
}

function updateDownloadButtonWithLink(url) {
    var link = document.createElement('a');
    link.href = url;
    link.download = 'vp_file.wav';
    link.innerHTML = "Download";
    var downloadBtn = document.querySelector('#download-btn');
    downloadBtn.innerHTML = "";
    downloadBtn.appendChild(link);
    downloadBtn.disabled = false;
}