import {Citeproc, styleOptions} from "citeproc-plus"

// demo.js
// for citeproc-js CSL citation formatter

// Get the citations that we are supposed to render, in the CSL-json format
// The order doesn't matter.
let items = []
let citations = []
const fetchCitations = []
const fetchItems = []
for (let i=1, ilen=8;i<ilen;i++) {
    fetchCitations.push(fetch(`citations-${i}.json`).then(
        response => response.json()
    ))

    fetchItems.push(fetch(`items-${i}.json`).then(
        response => response.json()
    ))
}


// Initialize a system object, which contains two methods needed by the
// engine.
const citeprocSys = {
    // Given an identifier, this retrieves one citation item.  This method
    // must return a valid CSL-JSON object.
    retrieveItem(id) {
        return items.find(item => item.id === id);
    }
}

function runOneStep(idx) {
    const citeDiv = document.getElementById('cite-div')
    const citationParams = citations[idx]
    const citationStrings = citeproc.processCitationCluster(citationParams[0], citationParams[1], [])[1]
    for (const citeInfo of citationStrings) {
        // Prepare node
        const newNode = document.createElement("div")
        newNode.setAttribute("id", `n${citeInfo[2]}`)
        newNode.innerHTML = citeInfo[1]
        // Try for old node
        const oldNode = document.getElementById(`node-${citeInfo[2]}`)
        if (oldNode) {
            citeDiv.replaceChild(newNode, oldNode)
        } else {
            citeDiv.appendChild(newNode)
        }
        newNode.scrollIntoView()
    }
    runRenderBib(idx+1)
}
let t0
let t1
// This runs at document ready, and renders the bibliography
function renderBib() {
    t0 = performance.now()
    runRenderBib(0)
}
function runRenderBib(idx) {
    if (idx === citations.length) {
        t1 = performance.now()
        const timeDiv = document.getElementById("time-div")
        const timeSpan = document.getElementById("time-span")
        timeSpan.innerHTML = `${t1 - t0} milliseconds`
        timeDiv.hidden = false
        // Bib
        const bibDiv = document.getElementById('bib-div')
        const bibResult = citeproc.makeBibliography()
        bibDiv.innerHTML = bibResult[1].join('\n')
    } else {
        setTimeout(() => {
            runOneStep(idx)
        }, 0)
    }
}



const styleSelector = document.querySelector('#style-selector')
styleSelector.innerHTML += Object.entries(styleOptions).sort((a,b) => (a[1] > b[1] ? 1 : -1)).map(([key, value]) => `<option value="${key}">${value}</option>`).join('')

const CSL = new Citeproc()

let citeproc, citationStyle

Promise.all([
    Promise.all(fetchCitations).then(
        citationBlocks => citations = citationBlocks.flat()
    ),
    Promise.all(fetchItems).then(
        itemBlocks => items = itemBlocks.flat()
    )
]).then(
    () => {
        styleSelector.addEventListener('change', () => {
            citationStyle = styleSelector.value
            CSL.getEngine(citeprocSys, citationStyle).then(
                proc => {
                    citeproc = proc
                    renderBib()
                }
            )
        })
        styleSelector.removeAttribute('disabled')
    }
)
