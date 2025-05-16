const outputTypes = ['text', 'color']

let objectLabels
let gestureLabels

const myForm = document.getElementById("configForm")
const formConfigInput = document.getElementById("configInput")
const formContents = document.getElementById("formContents")
const formButtons= document.getElementById("formButtons")
const selectGestureDetection = document.getElementById("gestureDetection")
const selectObjectDetection = document.getElementById("objectDetection")
const addRuleButton = document.getElementById("addRuleButton")
const objectParams = document.getElementById("objectDetectionParams")
const gestureParams = document.getElementById("gestureDetectionParams")
const gestureModel = document.getElementById("gestureModel")
const gestureNr = document.getElementById("gestureNr")
const gestureConfidence = document.getElementById("gestureConfidence")
const objectModel = document.getElementById("objectModel")
const objectNr = document.getElementById("objectNr")
const objectConfidence = document.getElementById("objectConfidence")

// convert the labels that the model can recognise from the labels.txt file into an array
function convertLabelFile(labels) {
    let labelArray = []
    const allLabels = labels.split("\n")
    for (l of allLabels) {
        if (l) { labelArray.push(l) }
    }

    return labelArray
}

// add a single rule to the form
function addRule(rule) {
    const newRule = document.createElement('p')
    newRule.classList.add("rows")

    // create a select box and fill it with the things the model can recognise from the labels.txt
    const newLabel = document.createElement('select')
    newLabel.setAttribute("data-name", "label")
    let labels

    if (selectGestureDetection.checked) {
        labels = gestureLabels.slice()
        
    } else if (selectObjectDetection.checked) {
        labels = objectLabels.slice()
    }

    for (const label of labels) {
        const newOption = document.createElement('option')
        newOption.setAttribute("value", label)
        newOption.innerText = label
        if(label == rule.label) { newOption.setAttribute("selected", 'true') }

        newLabel.appendChild(newOption)
    }
    newRule.appendChild(newLabel)

    // create a select box for the type of output we want, currently text or a color
    const newOutputType = document.createElement('select')
    newOutputType .setAttribute("data-name", "outputType")
    for (const outputType of outputTypes) {
        const newOption = document.createElement('option')
        newOption.setAttribute("value", outputType )
        newOption.innerText = outputType 
        if(outputType  == rule.outputType ) { newOption.setAttribute("selected", 'true') }

        newOutputType.appendChild(newOption)
    }

    newRule.appendChild(newOutputType)

    // if we want to output text, add a textbox. For color, add a colorpicker element
    const newOutput = document.createElement('input')
    newOutput .setAttribute("data-name", "output")
    if (rule.outputType == 'text') {
        newOutput.setAttribute("type", "text" )
        newOutput.setAttribute("size", "25" )
        newOutput.setAttribute("value", rule.output )
    } else if (rule.outputType == 'color') {
        newOutput.setAttribute("type", "color" )
        newOutput.setAttribute("value", rule.output )
    }

    newRule.appendChild(newOutput)

    // if the output type changes from text to color or vice versa, we need to update the element holding the actual text or color as well
    newOutputType.addEventListener("change", (event) => {
        if (event.target.value == 'text') {
            newOutput.setAttribute("type", "text" )
            newOutput.setAttribute("value", '' )
            newOutput.setAttribute("size", "25" )
        } else if (event.target.value == 'color') {
            newOutput.setAttribute("value", '#000000' )
            newOutput.setAttribute("type", "color" )
        }
    })

    // add a delete button for removing the rule
    const newDelete = document.createElement('button')
    newDelete.innerText = 'Delete'
    newDelete.setAttribute("type", "button" )
    newDelete.addEventListener("click", () => { newRule.remove() })
    newRule.appendChild(newDelete)

    formContents.appendChild(newRule)
}

// create the form
async function buildForm() {
    // hide the form while we build it
    formContents.classList.add('hidden')
    formButtons.classList.add('hidden')
      
    formContents.innerHTML = "<h2>Rules for detection matching</h2>"

    // read the labels.txt file for the currently selected model
    // show the section for either object or gesture detection
    // and add the rules that are currently in the user's config.json file
    if (selectGestureDetection.checked) {
        config.detectionType = 'gestures'
        labelFile = userPath + '/models/gestures/' +  gestureModel.value + '.labels.txt'
        const response = await fetch(labelFile)
        const labels = await response.text()
        gestureLabels = convertLabelFile(labels)

        objectParams.classList.add('hidden')
        gestureParams.classList.remove('hidden')
        for (rule of config.rules.gestures) {
            addRule(rule)
        }
    }
    else if (selectObjectDetection.checked) {
        config.detectionType = 'objects'
        labelFile = userPath + '/models/objects/' +  objectModel.value + '.labels.txt'
        const response = await fetch(labelFile)
        const labels = await response.text()
        objectLabels = convertLabelFile(labels)

        gestureParams.classList.add('hidden')
        objectParams.classList.remove('hidden')
        for (rule of config.rules.objects) {
            addRule(rule)
        }
    }
    formContents.classList.remove('hidden')
    formButtons.classList.remove('hidden')
}

// convert the rules from the form to JSON format on submitting
function addConfig(Event) {
    const iGotNewRules = []

    // iterate over the rules in the form 
    for (const child of formContents.children) {
        const newRule = {}
        for (const grandchild of child.children) {
            if (grandchild.tagName == "INPUT" || grandchild.tagName == "SELECT"  ) {
                newRule[grandchild.dataset.name] = grandchild.value
            }
        }
        if (newRule.label) { iGotNewRules.push(newRule) }
    }

    if (selectGestureDetection.checked) {
        config.detectionType = 'gestures'
        config.modelPath.gestures = gestureModel.value
        config.nr.gestures = parseInt(gestureNr.value)
        // config.confidence.gestures = parseInt(gestureConfidence.value)
        config.rules.gestures = iGotNewRules.slice()
    } else if (selectObjectDetection.checked) {
        config.detectionType = 'objects'
        config.modelPath.objects = objectModel.value
        config.nr.objects = parseInt(objectNr.value)
        config.confidence.objects = parseInt(objectConfidence.value)
        config.rules.objects = iGotNewRules.slice()
    }

    formConfigInput.value = JSON.stringify(config, null, 2)

}

// add a new empty rule at the bottom of the form
function addEmptyRule() {
    rule = {
        "label": "",
        "outputType": "text",
        "output": ""
      }
    addRule(rule)
}

// dynamically create the form when the page is loaded
window.addEventListener("load", buildForm)

// update the form when we choose a new type of detection or a different model
selectGestureDetection.addEventListener("change", buildForm)
selectObjectDetection.addEventListener("change", buildForm)
objectModel.addEventListener("change", buildForm)
gestureModel.addEventListener("change", buildForm)

myForm.addEventListener("submit", addConfig)
addRuleButton.addEventListener("click", addEmptyRule)