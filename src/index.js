import {Citeproc, styleOptions} from "citeproc-plus"

// demo.js
// for citeproc-js CSL citation formatter



// Get the citations that we are supposed to render, in the CSL-json format
var xhr = new XMLHttpRequest();

var itemsArray = [];
var citations = [];
for (var i=1,ilen=8;i<ilen;i++) {
    xhr.open('GET', 'citations-' + i + '.json', false);
    xhr.send(null);
    citations = citations.concat(JSON.parse(xhr.responseText));

    xhr.open('GET', 'items-' + i + '.json', false);
    xhr.send(null);
    itemsArray = itemsArray.concat(JSON.parse(xhr.responseText));
}

var items = {};
for (let item of itemsArray) {
    items[item.id] = item;
}


// Initialize a system object, which contains two methods needed by the
// engine.
const citeprocSys = {
    // Given an identifier, this retrieves one citation item.  This method
    // must return a valid CSL-JSON object.
    retrieveItem: function(id){
        return items[id];
    }
};

let citationStyle = 'ambio'

// Given the identifier of a CSL style, this function instantiates a CSL.Engine
// object that can render citations in that style.
const processor = new Citeproc();
function getProcessor() {
    // Instantiate and return the engine
    return processor.getEngine(citeprocSys, citationStyle);
};

function runOneStep(idx) {
    var citeDiv = document.getElementById('cite-div');
    var citationParams = citations[idx];
    const citationStrings = citeproc.processCitationCluster(citationParams[0], citationParams[1], [])[1]
    for (var citeInfo of citationStrings) {
        // Prepare node
        var newNode = document.createElement("div");
        newNode.setAttribute("id", "n" + citeInfo[2]);
        newNode.innerHTML = citeInfo[1];
        // Try for old node
        var oldNode = document.getElementById("node-" + citeInfo[2]);
        if (oldNode) {
            citeDiv.replaceChild(newNode, oldNode);
        } else {
            citeDiv.appendChild(newNode);
        }
        newNode.scrollIntoView();
    }
    runRenderBib(idx+1);
}
let t0, t1
// This runs at document ready, and renders the bibliography
function renderBib() {
    t0 = performance.now();
    runRenderBib(0);
}
function runRenderBib(idx) {
    if (idx === citations.length) {
        t1 = performance.now();
        var timeDiv = document.getElementById("time-div");
        var timeSpan = document.getElementById("time-span");
        timeSpan.innerHTML = (t1 - t0) + " milliseconds";
        timeDiv.hidden = false;
        // Bib
        var bibDiv = document.getElementById('bib-div');
        var bibResult = citeproc.makeBibliography();
        bibDiv.innerHTML = bibResult[1].join('\n');
    } else {
        setTimeout(function() {
            runOneStep(idx);
        }, 0)
    }
}

let citeproc

getProcessor().then(
    proc => {
        citeproc = proc
        document.querySelector('#render').addEventListener('click', () => renderBib())
    }
)

const styleSelector = document.querySelector('#style-selector')

styleSelector.innerHTML = Object.entries(styleOptions).map(([key, value]) => `<option value="${key}">${value}</option>`).join('')

styleSelector.addEventListener('change', () => {
    citationStyle = styleSelector.value
    getProcessor().then(
        proc => {
            citeproc = proc
            renderBib()
        }
    )
})
