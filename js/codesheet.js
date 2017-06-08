'use strict'

const runApi = 'https://api.runmycode.online/run'
const sampleCodes = {
  nodejs: [
    'console.log("Hello World from Nodejs!")',
    'const args = process.argv.slice(2)',
    'console.log(args.length + " Args: [" + args.join(", ") + "]")'
  ].join('\n'),
  python: [
    'import sys',
    'print "Hello World from Python!"',
    'args = sys.argv[1:]',
    'print str(len(args)) + " Args: [" + ", ".join(args) + "]"'
  ].join('\n'),
  python3: [
    'import sys',
    'print("Hello World from Python3!")',
    'args = sys.argv[1:]',
    'print(str(len(args)) + " Args: [" + ", ".join(args) + "]")'
  ].join('\n'),
  ruby: [
    'puts("Hello World from Ruby!")',
    'puts("#{ARGV.length} Args: [#{ARGV.join(", ")}]")'
  ].join('\n'),
  php: [
    '<?php',
    '  echo "Hello World from PHP!\\n";',
    '  $args = array_slice($argv, 1);',
    '  echo count($args), " Args: [", implode(", ", $args), "]\\n";',
    '?>'
  ].join('\n'),
  go: [
    'package main',
    'import "os"',
    'import "fmt"',
    'import "strings"',
    'func main() {',
    '  fmt.Println("Hello World from Go!")',
    '  args := os.Args[1:]',
    '  fmt.Println(fmt.Sprintf("%v Args: [%v]", len(args), strings.Join(args, ", ")))',
    '}'
  ].join('\n')
}

const $$ = s => document.querySelectorAll(s)

// https://stackoverflow.com/a/39008859
const injectScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.src = src
    script.addEventListener('load', resolve)
    script.addEventListener('error', () => reject(new Error('Error loading script.')))
    script.addEventListener('abort', () => reject(new Error('Script loading aborted.')))
    document.head.appendChild(script)
  })
}

let lang = 'nodejs'
// custom map for CodeMirror
const langMap = {
  nodejs: 'javascript',
  python3: 'python'
}
let langToLoad = langMap[lang] || lang

const wrapper = $('#code-wrapper')
wrapper.textContent = '' // remove Loading...

const myCodeMirror = CodeMirror(wrapper, {
  value: sampleCodes[lang],
  mode: langToLoad,
  lineNumbers: true,
  viewportMargin: Infinity
})
const langLoaded = [langToLoad]

// make them visible
const langSelect = $('#language')
langSelect.style.display = 'inline'
const popUpRunnerBtn = $('#popup-runner')
popUpRunnerBtn.style.display = 'inline'

// update with new code
const updateEditor = () => {
  myCodeMirror.setOption('mode', langToLoad)
  myCodeMirror.setOption('value', sampleCodes[lang])
}

langSelect.addEventListener('change', (e) => {
  lang = e.target.value
  langToLoad = langMap[lang] || lang
  if (langLoaded.indexOf(langToLoad) === -1) {
    myCodeMirror.setOption('value', 'Loading...')
    injectScript(`codemirror/mode/${langToLoad}/${langToLoad}.js`)
    .then(() => {
      updateEditor()
      langLoaded.push(langToLoad)
    })
  } else {
    updateEditor()
  }
})

// similar to browser extension
const platformMap = {
  runmycode: {
    pages: {
      edit: {
        getCode: () => myCodeMirror.getValue()
      }
    }
  }
}

let runnerAdded = false
const platform = 'runmycode'
const page = 'edit'

const initRunner = () => {
  if (runnerAdded) return

  runnerAdded = true
  const runnerWidth = 350

  const runnerMarkup = `<style>
  #runmycode-runner {
    width: ${runnerWidth}px;
  }
  </style>

  <div id="runmycode-runner">
    <div class="panel panel-default">
      <div id="runmycode-runner-handle" class="panel-heading">
        <button id="runmycode-close-runner" type="button" class="close">x</button>
        <h3 class="panel-title">Run My Code</h3>
      </div>
      <div class="panel-body">
        <button id="runmycode" type="button" class="btn btn-warning btn-block btn-lg">Run</button>
        <div class="panel-group">
          <div class="panel panel-default panel-runner">
            <div class="panel-heading">
              <h4 class="panel-title">Input</h4>
            </div>
            <div class="panel-collapse collapse">
              <div class="panel-body">
                <textarea id="runmycode-run-input" placeholder="Command line input to Code" title="Special shell characters like & should be quoted"></textarea>
              </div>
            </div>
          </div>
          <div class="panel panel-default panel-runner">
            <div class="panel-heading">
              <h4 class="panel-title">Output</h4>
            </div>
            <div id="output-panel" class="panel-collapse collapse in">
              <div class="panel-body">
                <textarea id="runmycode-run-output" rows="4" placeholder="Output from Code" readonly="true"></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `
  // inject runner styles and markup
  document.body.insertAdjacentHTML('afterbegin', runnerMarkup)

  /* *** Start Movable popup https://gist.github.com/akirattii/9165836 ****/

  let runnerVisible = false
  const runner = $('#runmycode-runner')
  const runnerCloseBtn = $('#runmycode-close-runner')
  const runBtn = $('#runmycode')
  const runInput = $('#runmycode-run-input')
  const runOutput = $('#runmycode-run-output')

  let runnerOffset = { x: 0, y: 0 }
  runner.style.left = `${window.innerWidth - runnerWidth - 200}px` // have popup 200px from right edge

  runnerCloseBtn.addEventListener('click', (e) => {
    runner.style.display = 'none'
    runnerVisible = false
  })
  // close popup on ESC key
  window.addEventListener('keydown', (e) => {
    if (e.keyCode === 27) runnerCloseBtn.click(e)
  })

  const popupMove = (e) => {
    runner.style.top = `${e.clientY - runnerOffset.y}px`
    runner.style.left = `${e.clientX - runnerOffset.x}px`
  }

  window.addEventListener('mouseup', () => {
    window.removeEventListener('mousemove', popupMove, true)
  })

  $('#runmycode-runner-handle').addEventListener('mousedown', (e) => {
    runnerOffset.x = e.clientX - runner.offsetLeft
    runnerOffset.y = e.clientY - runner.offsetTop
    window.addEventListener('mousemove', popupMove, true)
    e.preventDefault() // disable text selection
  })

  popUpRunnerBtn.addEventListener('click', (e) => {
    e.preventDefault()
    if (runnerVisible) {
      runnerCloseBtn.click(e)
    } else {
      runnerVisible = true
      runner.style.display = 'block'
    }
  })

  /* *** End Movable popup ****/

  // collapse input, output panels
  Array.from($$('.panel-runner>.panel-heading')).forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.target.closest('.panel-heading').nextElementSibling.classList.toggle('in')
    })
  })

  const callApi = (url, apiKey) => {
    fetch(url, {
      method: 'post',
      headers: {'x-api-key': apiKey},
      body: platformMap[platform]['pages'][page].getCode()
    })
    .then(res => res.json())
    .then((resp) => {
      console.log('Run response', resp)
      if (resp.status === 'Successful') {
        runOutput.value = resp.stdout || resp.stderr
      } else {
        runOutput.classList.add('error')
        runOutput.value = `Failed: ${resp.error}\n${resp.stdout}` // stdout for php which puts error in stdout
      }
      runBtn.disabled = false // enable run button
    })
    .catch((error) => {
      console.error('Error:', error)
      runOutput.classList.add('error')
      runOutput.value = 'Some error happened. Please try again later.' // what else do I know? :/
      // run button is not enabled to prevent user from triggering this error again
    })
  }

  runBtn.addEventListener('click', (e) => {
    runBtn.disabled = true // disable run button
    // console.log(`Running ${lang} code`)
    runOutput.classList.remove('error')
    runOutput.value = `Running ${lang} code...`
    $('#output-panel').classList.add('in')

    const url = `${runApi}/${lang}?args=${encodeURIComponent(runInput.value)}`
    callApi(url, user.key)
  })
}

initRunner()
