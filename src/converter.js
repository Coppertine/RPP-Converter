/**
 * @author Coppertine, SaltyLucario
 * @name converter.js
 * 
 * Port of RPPConvereter written in Java.
 */

// Assume stuff like 9/8 and 12/8 is the same as 3/4 and 4/4 with bpm * 0.666 respectively
// Otherwise, it would attempt to add additional timing points in between
let assumeOver8Always3s = false;

/**
 * @name BeatMarker
 * Based on ReaperPoint
 * @argument _timestamp in milliseconds
 * @argument _bpm as beat per minute
 * @argument _numerator as int
 * @argument _denominator as int
 * @argument _linear as boolean, if marker is linear to next point
*/
class BeatMarker {
    constructor(_timestamp, _bpm, _numerator, _denominator, _linear) {
        this.timestamp = _timestamp;
        this.bpm = _bpm;
        this.numerator = _numerator;
        this.denominator = _denominator;
        this.linear = _linear;
        // console.log(`timestamp: ${this.timestamp}, bpm: ${this.bpm}, numerator: ${this.numerator}, demoninator: ${this.denominator}, linear: ${this.linear}`)
    }
    // Used to change 6/8 and stuff like X/12, X/24, X/(number that is a power of 2) and isn't X/4
    convertTimeSignature() {
        if (this.numerator % 3 === 0 && this.denominator === 8) {
            if (!assumeOver8Always3s) return;

            this.numerator /= 3;
            this.denominator = 4;
            this.bpm *= 0.666;
            console.log("converted timing points")
            return;

        }
        if ((new ConvertUtils().powerOfTwo(this.denominator)) && this.denominator !== 4) {
            this.numerator /= this.denominator / 4;
            return;
        }
        if(this.denominator == 12) // Special use cases.. because of course.
        {
            this.numerator /= 2;
            this.denominator /= 3;
            this.bpm /= 0.666;
        }
        if(this.denominator == 24)
        {
            this.numerator /= 3;
            this.denominator /= 6;
            this.bpm /= 0.666;
        }
    }
}


class ConvertUtils {
    powerOfTwo(value) {
        return Math.log2(value) % 1 === 0;
    }
}

let GLOBAL_OFFSET = -15; // original used -20ms
let originalTempoPointNum = 0;
let OUTPUT_VERSION = 0; // 0 - lazer, 1 - stable, 2 - TypoJam (beta)

function processReaperFile(fileText) {
    // console.log(fileText);
    let projectLines = fileText.split("\n");
    let currTimeSig = 0;
    let outputMarkers = [];
    for (let index = 0; index < projectLines.length; index++) {
        const line = projectLines[index];
        
        if(!line.startsWith("    PT "))
            continue;
        let pointLine = line.trim().replace("PT ","").split(' ');
        let currentTimestamp = parseFloat(pointLine[0]);
        let bpm = parseFloat(pointLine[1]);
        let linear = pointLine[2] === "0";
        if (pointLine.length > 3 && pointLine[3] !== "0")
        {
            // Asserting that first point ALWAYS has a time signature
            currTimeSig = parseInt(pointLine[3]);
        }
        currentTimestamp = (currentTimestamp * 1000.0) + GLOBAL_OFFSET;
        // last 16 bits of timeSig is numerator
        let denominator = currTimeSig >> 16;
        let numerator = ((1 << 16) - 1) & currTimeSig;
        outputMarkers.push(new BeatMarker(currentTimestamp,bpm, numerator, denominator, linear))
        originalTempoPointNum++;
    }
    return outputMarkers;
}

function convertTimingPoints() {
    let filePath = document.getElementById("fileInput").files[0];
    GLOBAL_OFFSET = parseFloat(document.getElementById("globalOffset").value);
    assumeOver8Always3s = document.getElementById("assume3rds").checked;
    originalTempoPointNum = 0;

    let beatMarkers = [];
    const reader = new FileReader();

    reader.onload = function () {
        beatMarkers = processReaperFile(reader.result);
        beatMarkers = addMissingMarkers(beatMarkers);
        // TODO: deleteUnessesaryTimingPoints()
        processBeatMarkers(beatMarkers);
    }
    reader.readAsText(filePath, "utf-8");
}

function addMissingMarkers(beatMarkers)
{
    for (let i = 0; i < beatMarkers.length; i++) {
        const beatMarker = beatMarkers[i];

        if(beatMarker.denominator === 4) continue;
        if (this.numerator % 3 === 0 && this.denominator === 8 && !(this.numerator !== 6 && !assumeOver8Always3s)) {
            continue; // these are treated differently
        }
        // We need to check if
        // 1) the beatmarker's beat duration's time sig aligns with the nearest start of measure
        // 2) the beatmarker's beat duration's time sig does not line up with the next timing point
        let beatLength = 60000.0 / beatMarker.bpm;
        let measureFraction = beatMarker.numerator / beatMarker.denominator;
        let measureDuration = (measureFraction * 4) * beatLength;
        // console.log(`time: ${beatMarker.timestamp}, bpm: ${beatMarker.bpm}, timesig: ${beatMarker.numerator}/${beatMarker.denominator}, beatDuration: ${measureDuration}`);
        let estimatedNextTimestamp = beatMarker.timestamp + measureDuration;
        if(i !== beatMarkers.length - 1)
        {
            let currPointer = i+1;
            let nextBeatMarker = beatMarkers[currPointer];
            while(Math.round(estimatedNextTimestamp) < Math.round(nextBeatMarker.timestamp))
            {
                let newBeatMarker = new BeatMarker(estimatedNextTimestamp,beatMarker.bpm,beatMarker.numerator,beatMarker.denominator,beatMarker.linear);
                // console.log(`Created new marker at ${estimatedNextTimestamp}`);
                // Experimental method.. may not work
                beatMarkers = beatMarkers.toSpliced(currPointer-1, 0, newBeatMarker);
                currPointer++;
                // nextBeatMarker = beatMarkers[currPointer];
                estimatedNextTimestamp += measureDuration;
            }
            i = currPointer - 1;
        }

    }
    return beatMarkers;
}

function processBeatMarkers(beatMarkers)
{
    let omitBarLine = false; // true = 8
    let currentTimestamp, bpm, previousBeatCount = 0.0;
    let outputString = ``;

    for (let i = 0; i < beatMarkers.length; i++) {
        const beatMarker = beatMarkers[i];
        currentTimestamp = beatMarker.timestamp;
        bpm = beatMarker.bpm;
        let beatLength = 60000.0 / bpm;
        let numerator = beatMarker.numerator;
        if(i < beatMarkers.Length - 1)
        {
            let missingBarLineCheck = false;
            let nextTimestamp = beatMarkers[i+1].timestamp;
            let interval = nextTimestamp - currentTimestamp;
            let beatCount = interval / beatLength;
            let predictedInterval = Math.round(beatCount * beatLength);
            omitBarLine = Math.round(previousBeatCount) !== 0;
            if(OUTPUT_VERSION == 1) // stable
            {
                beatMarkers = adjustForStable(beatMarkers, predictedInterval, beatCount, i);
            }
            beatCount += previousBeatCount;
            while(beatCount >= numerator)
                beatCount -= numerator;
            previousBeatCount = beatCount;
        }
        beatMarker.convertTimeSignature();
        bpm = beatMarker.bpm;
        beatLength = 60000.0/bpm;
        numerator = beatMarker.numerator;
        outputString += GetOutputString(currentTimestamp, beatLength, Math.ceil(numerator), omitBarLine);
        // outputString += `${OUTPUT_VERSION ? Math.round(currentTimestamp) : currentTimestamp},${beatLength},${Math.ceil(numerator)},0,0,100,1,${omitBarLine ? 8 : 0}\n`;
        // document.body.appendChild(element);
    }
    document.getElementsByName("output")[0].value = OUTPUT_VERSION == 2 ? outputString.substring(1) : outputString;
    document.getElementById("tempoMarkerNum").textContent = originalTempoPointNum;
    document.getElementById("timingPointNum").textContent = beatMarkers.length;
}

// STABLE Only, because of stable's nonsense on how timing is done, we have to adjust for "rounding errors" (it's more so truncating, but you get the point)
function adjustForStable(beatMarkers, predictedInterval, beatCount, i)
{
    let bpm = beatMarkers[i].bpm;
    let currentTimestamp = beatMarkers[i].timestamp;
    let nextTimeStamp = beatMarkers[i+1].timestamp;
    while(Math.round(currentTimestamp + predictedInterval) < Math.round(nextTimeStamp))
    {
        bpm -= 0.01;
        predictedInterval = beatCount * (60000 / bpm);
    }
    while(Math.round(currentTimestamp + predictedInterval) > Math.round(nextTimeStamp))
    {
        bpm += 0.01;
        predictedInterval = beatCount * (60000 / bpm);
    }
    beatMarkers[i].bpm = bpm;
    return beatMarkers;
}

function GetOutputString(currentTimestamp, beatLength, numerator, omitBarLine)
{
    switch (OUTPUT_VERSION) {
        case 2: // TypoJam
            return `,{\n\t"n":"bpm",\n\t"t":${currentTimestamp / 1000},\n\t"d":{\n\t\t"b":${60000.0 / beatLength},\n\t\t"s":${numerator}\n\t}\n}`;
        case 1: // Stable
            return `${Math.round(currentTimestamp)},${beatLength},${numerator},0,0,100,1,${omitBarLine?8:0}\n`; 
        case 0: // lazer, default
            return `${currentTimestamp},${beatLength},${numerator},0,0,100,1,${omitBarLine ? 8 : 0}\n`;
    }
}


function copyTimingPoints()
{
    navigator.clipboard.writeText(document.getElementById('output').value);
    // TODO make a little toaster or 
}

function toggleDropdown()
{
    document.getElementById("osuVersionOptions").classList.toggle("invisible");
    document.getElementById("osuVersionOptions").classList.toggle("opacity-0");
    document.getElementById("osuVersionOptions").classList.toggle("-translate-y-4");
    document.querySelector("#osuVersionSelector svg").classList.toggle("-scale-y-[1]");
}

function setVersion(verNum)
{
    OUTPUT_VERSION = verNum;
    document.querySelector("#osuVersionSelector span").textContent = document.getElementById("osuVersionOptions").children[verNum].textContent;
    if(document.getElementById('fileInput').files.length > 0) convertTimingPoints();
    toggleDropdown();
}

document.addEventListener("click", (e) => {
    if(!document.getElementById("osuVersionOptions").classList.contains("opacity-0"))
        {
            var container = document.getElementById("dropdownContainer");

            if(!container.contains(e.target))
            {
                toggleDropdown();
            }
        }
});

