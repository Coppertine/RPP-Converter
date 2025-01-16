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
            if (this.numerator !== 6 && !assumeOver8Always3s) return;

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
    GLOBAL_OFFSET = parseInt(document.getElementById("globalOffset").value);
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
            while(estimatedNextTimestamp < nextBeatMarker.timestamp)
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
            beatCount += previousBeatCount;
            while(beatCount >= numerator)
                beatCount -= numerator;
            previousBeatCount = beatCount;
        }
        beatMarker.convertTimeSignature();
        bpm = beatMarker.bpm;
        beatLength = 60000.0/bpm;
        numerator = beatMarker.numerator;
        outputString += `${currentTimestamp},${beatLength},${Math.ceil(numerator)},0,0,100,1,${omitBarLine ? 8 : 0}\n`;
        // document.body.appendChild(element);
    }
    document.getElementsByName("output")[0].value = outputString;
    document.getElementById("tempoMarkerNum").textContent = originalTempoPointNum;
    document.getElementById("timingPointNum").textContent = beatMarkers.length;
}

function copyTimingPoints()
{
    navigator.clipboard.writeText(document.getElementById('output').value);
    // TODO make a little toaster or 
}