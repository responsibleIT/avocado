const outputTypes = ['text', 'color']

const myForm = document.getElementById("configForm")
const formConfigInput = document.getElementById("configInput")
const formContents = document.getElementById("formContents")
const formButtons= document.getElementById("formButtons")
const selectGestureDetection = document.getElementById("gestureDetection")
const selectObjectDetection = document.getElementById("objectDetection")
const addRuleButton = document.getElementById("addRuleButton")


function addRule(rule) {
    const newRule = document.createElement('p')
    newRule.classList.add("rows")
    // newRule.innerHTML = rule.label + " " + rule.outputType + " "  + rule.output

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

    const newDelete = document.createElement('button')
    newDelete.innerText = 'Delete'
    newDelete.setAttribute("type", "button" )
    newDelete.addEventListener("click", () => { newRule.remove() })
    newRule.appendChild(newDelete)

    formContents.appendChild(newRule)
}

function buildForm() {
    formContents.classList.add('hidden')
    formButtons.classList.add('hidden')
    formContents.innerHTML = ""

    if (selectGestureDetection.checked) {
        config.detectionType = 'gestures'
        for (rule of config.rules.gestures) {
            addRule(rule)
        }
    }
    else if (selectObjectDetection.checked) {
        config.detectionType = 'objects'
        for (rule of config.rules.objects) {
            addRule(rule)
        }
    }
    formContents.classList.remove('hidden')
    formButtons.classList.remove('hidden')
}

function addConfig(Event) {
    const iGotNewRules = []

    for (const child of formContents.children) {
        const newRule = {}
        for (const grandchild of child.children) {
            if (grandchild.tagName == "INPUT" || grandchild.tagName == "SELECT"  ) {
                // Object.defineProperty(newRule, grandchild.dataset.name, {value:grandchild.value, enumerable:true})
                newRule[grandchild.dataset.name] = grandchild.value
            }
        }
        iGotNewRules.push(newRule)
    }

    if (selectGestureDetection.checked) {
        config.detectionType = 'gestures'
        config.rules.gestures = iGotNewRules.slice()
         
    } else if (selectObjectDetection.checked) {
        config.detectionType = 'objects'
        config.rules.objects = iGotNewRules.slice()
    }

    formConfigInput.value = JSON.stringify(config, null, 2)
}

function addEmptyRule() {
    rule = {
        "label": "",
        "outputType": "text",
        "output": ""
      }
    addRule(rule)
}

window.addEventListener("load", buildForm)
selectGestureDetection.addEventListener("change", buildForm)
selectObjectDetection.addEventListener("change", buildForm)
myForm.addEventListener("submit", addConfig)
addRuleButton.addEventListener("click", addEmptyRule)