import React = require('react')
import ReactDOM = require('react-dom')
import Electron = require('electron')
import { format as urlFormat } from 'url'
import objectAssign = require("object-assign")
import native = require('../../native');
import fs = require('fs')
import Fuse = require('fuse.js')
import https = require('https')

native.init()
// let latLons = [[14.59, 120.98], [40.71, -7.00], [19.43, -9.13]]
// let latLons = [[80, 120.98], [10, -7.00], [50, -9.13]]
// let latLons = [[0, 120.98], [0, -7.00], [0, -9.13]]
// let latLons = [[90, 120.98], [0, -90], [0, -180]]
// let latLons = [[90, 120.98], [90, -90], [90, -180], [90, -22]]
// let latLons = [[90, 0], [0, 0], [0, 90], [0, 180], [0, -90], [-90, 0]]
// let latLons = [[90, 0], [0, 0], [0, 90], [0, 180], [0, -90]]
// let latLons = [[1, 0], [-1, 90], [1, 180], [1, -90]]

// let latLons: number[][] = []
// for (let i = 0; i < 5; i++) {
//   let lat = (Math.random() * 180) - 90
//   let lon = (Math.random() * 360) - 180
//   latLons.push([lat, lon])
// }

// let start = performance.now()
// console.log("the centroid of latLons is " + (native.computeCentroid(latLons)))
// let end = performance.now()
// console.log("oneHemisphere took " + (end - start) + " milliseconds.")


function printLatLons(latLons: number[][]) {
  let str = ""
  for (let i = 0; i < latLons.length; i++) {
    str += "(" + latLons[i][0] + "," + latLons[i][1] + ") "
  }
  return str
}

let selectedCities: string[] = []
let selectedCitiesLatLon: number[][] = []
let resultList: any
let results = {}
let colorFlag = false

// Get access to dialog boxes in our main UI process.
const remote = Electron.remote

class PreviewBar extends React.Component<any, any> {
  constructor() {
    super()
  }

  style = {
    paddingTop: "20px",      
    // height: "50px",
    minHeight: "60px",
    background: "#efefef",
  };

  addCity(city: string) {
    // let newSelectedCities = this.state.selectedCities.slice()
    // newSelectedCities.push(city)
    // this.setState({
    //   selectedCities: newSelectedCities,
    // })

    selectedCities.push(city)
    console.log("adding " + city)
    console.log("selectedCities is:")
    // console.log(newSelectedCities)
    console.log(selectedCities)
    render()
  }

  removeCity(index: number) {
    selectedCities.splice(index, 1)
    selectedCitiesLatLon.splice(index, 1)
    render()
  }

  render () {
    let previews: JSX.Element[] = []
    for (let i = 0; i < selectedCities.length; i++) {
      previews.push(<Preview key={i} city={selectedCities[i]} index={i} removeCity={this.removeCity.bind(this)}/>)
    }

    return (
      <div style={this.style}>
        <div>
          <Search addCity={this.addCity.bind(this)}/>
        </div>
        <div style={{marginTop: "50px"}}>
          {previews}
        </div>
      </div>
     )
  }
}

class Search extends React.Component<any, any> {
  constructor(props: any) {
    super(props)

    let options = {
      shouldSort: true,
      includeMatches: true,
      threshold: 0.6,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 1,
    };

    this.focusTextInput = this.focusTextInput.bind(this);
    let allCities = fs.readFileSync("/Users/Garrett/Dropbox/Files/workspaces/centroid/cities", "utf8").split("\n")
    this.state = {
      inputText: "",
      matches: [],
      matchIndices: [],
      allCities: allCities,
      fz: new Fuse(allCities, options),
      resultsVisible: false,
      focused: false,
      selectedResult: -1,
    }

    Electron.ipcRenderer.on('toggle-search', (event, message) => {
      console.log(message)  // Prints 'whoooooooh!'
      this.focusTextInput()
    })
  }

  textInput: any
  resultList: any
  style = {
    display: "table",
    position: "absolute",
    left: "calc(50% - 10em)",
    margin: "0 auto 10px auto",
    borderRadius: "3px",
  }
  inputStyle = {
    width: "20em",
    fontFamily: "sans-serif",
    fontSize: "16px",
    outline: "none",
    position: "relative",
    zIndex: 2,
    padding: "5px 3px",
    border: "1px solid #ddd",
  }

  focusTextInput() {
    this.textInput.focus();
    if (this.state.inputText !== "") {
      this.textInput.select()
    }
  }

  handleFocus() {
    // console.log("focus")
    this.setState({
      focused: true
    })
  }

  handleBlur() {
    // console.log("blur")
    this.setState({
      focused: false,
    })
  }

  handleChange(event: any) {
    console.log("change event triggered with key '%s'", event.target.value)
    this.setState({
      inputText: event.target.value
    });

    if (event.target.value !== "") {
      let start = performance.now()
      let results = this.state.fz.search(event.target.value)
      console.log("fz search took " + Math.floor(performance.now() - start) + " milliseconds.")

      let numToKeep = Math.min(results.length, 20)
      results = results.slice(0, numToKeep)

      let newMatches: string[] = []
      let newMatchIndices: number[][] = []
      for (let i = 0; i < results.length; i++) {
        newMatches.push(this.state.allCities[results[i].item])
        newMatchIndices.push(results[i].matches[0])
      }
      
      this.setState({
        matches: newMatches,
        matchIndices: newMatchIndices,
        selectedResult: 0,
      })
    } else {
      this.setState({
        matches: [],
        matchIndices: [],
      })
    }
  }

  handleKeyPress(event: any) {
    console.log("got keypress event:")
    console.log(event)
    console.log("key is %s", event.key)
    console.log("keyCode is %s", event.keyCode)
    switch (event.keyCode) {
      case 13: // Enter
        event.preventDefault()
        this.props.addCity(this.state.matches[this.state.selectedResult])
        this.textInput.blur()
        break
      case 27: // Escape
        event.preventDefault()
        this.textInput.blur()
        break
      case 38: // Up
        event.preventDefault()
        if (this.state.selectedResult > 0) {
          console.log("result offsetTop is " + results[this.state.selectedResult - 1].offsetTop)
          console.log("resultList scrollTop is " + resultList.scrollTop)

          if (results[this.state.selectedResult - 1].offsetTop < resultList.scrollTop) {
            results[this.state.selectedResult - 1].scrollIntoView()
          }

          this.setState({
            selectedResult: this.state.selectedResult - 1
          })
        }
        break
      case 40: // Down
        event.preventDefault()
        if (this.state.selectedResult < this.state.matches.length - 1) {
          console.log("result offsetTop is " + results[this.state.selectedResult + 1].offsetTop)
          console.log("resultList scrollTop is " + resultList.scrollTop)
          results[this.state.selectedResult + 1].scrollIntoView(false)
          this.setState({
            selectedResult: this.state.selectedResult + 1
          })
        }
        break
      default:
        break
    }
  }

  render() {
    let results: JSX.Element | null = null
    let focusedStyle: string | null = null
    let resultsStyle = "#search { border-radius: 3px; }"
    if (this.state.focused) {
      focusedStyle = "#foobar { box-shadow: 0 0 40px 5px rgba(0, 0, 0, 0.125); }"
      if (this.state.matches.length > 0) {
        resultsStyle = "#search { border-radius: 3px 3px 0 0; }"
        console.log("there are matches")
        results = <Results ref={(results) => this.resultList = results} matches={this.state.matches}
          matchIndices={this.state.matchIndices} addCity={this.props.addCity} selectedIndex={this.state.selectedResult}/>
      }
    }
    return (
      <div id="foobar" style={this.style}>
        <style>
          {focusedStyle}
        </style>
        <style>
          {"#search::-webkit-input-placeholder {font-style: italic; }" +
           "#search:-moz-placeholder {font-style: italic; }" +
           "#search::-moz-placeholder {font-style: italic; }" +
           "#search:-ms-input-placeholder {font-style: italic; }"}
        </style>
        <style>{resultsStyle}</style>
        <input id="search" value={this.state.inputText} style={this.inputStyle} type="text" name="city"
          placeholder={"Search City " + (process.platform === 'darwin' ? '(cmd+L)' : '(ctrl+L)')}
          onFocus={this.handleFocus.bind(this)}
          onBlur={this.handleBlur.bind(this)} onChange={this.handleChange.bind(this)}
          ref={(input) => { this.textInput = input; }} onKeyDown={this.handleKeyPress.bind(this)}/>
        {results}
      </div>
    )
  }
}

class Results extends React.Component<any, any> {
  constructor(props: any) {
    super(props)
  }

  style = {
    borderRadius: "0 0 3px 3px",
    border: "1px solid #ddd",
    position: "relative",
    zIndex: 2,
  }
  ulStyle = {
    borderRadius: "0 0 3px 3px",
    color: "#444",
    backgroundColor: "#f7f7f7",
    listStyleType: "none",
    margin: 0,
    padding: 0,
    overflowY: "scroll",
    maxHeight: "240px",
    width: "318px",
    position: "relative",
    zIndex: 2,
  }
  liStyle = {
    fontFamily: "sans-serif",
    borderBottom: "1px solid #ddd",
    padding: "3px",
    cursor: "pointer",
    position: "relative",
    zIndex: 2,
  }
  matchStyle = {
    color: "#f2c12e",
  }

  getHighlightedSpans(i: number): JSX.Element[] {
    let indices = this.props.matchIndices[i].indices
    let spans: JSX.Element[] = []
    let curr = 0
    for (let j = 0; j < indices.length; j++) {
      if (curr !== indices[j][0]) {
        let substr = this.props.matches[i].substring(curr, indices[j][0])
        spans.push(<span>{substr}</span>)
        curr = indices[j][0]
      }
      let substr = this.props.matches[i].substring(indices[j][0], indices[j][1] + 1)
      spans.push(<span style={this.matchStyle}>{substr}</span>)
      curr = indices[j][1] + 1
    }
    if (curr !== this.props.matches[i].length) {
      let substr = this.props.matches[i].substring(curr, this.props.matches[i].length)
      spans.push(<span>{substr}</span>)
    }

    return spans
  }

  getMouseDownHandler(city: string) {
    return function(e: any) {
      e.preventDefault();
      this.props.addCity(city)
    }.bind(this)
  }

  render() {
    let start = performance.now()
    let liElems: JSX.Element[] = [];
    console.log("there are " + this.props.matches.length + " matches")
    for (let i = 0; i < this.props.matches.length; i++) {
      let liContent = this.getHighlightedSpans(i)
      let hoverStyle = <style>{"#dropdownEntry" + i + ":hover {background-color: #eaeaea}"}</style>
      let selectedStyle: JSX.Element | null = null
      let li: JSX.Element
      if (i === this.props.selectedIndex) {
        selectedStyle = <style>{"#dropdownEntry" + i + "{background-color: #eaeaea}"}</style>
        li = <li ref={(result) => results[i] = result} key={i} id={"dropdownEntry" + i}
          onMouseDown={this.getMouseDownHandler(this.props.matches[i])} style={this.liStyle}>
          {selectedStyle}{hoverStyle}{liContent}</li>
      } else {
        li = <li ref={(result) => results[i] = result} key={i} id={"dropdownEntry" + i}
          onMouseDown={this.getMouseDownHandler(this.props.matches[i])} style={this.liStyle}>{hoverStyle}{liContent}</li>
      }

      liElems.push(li)
    }
    console.log("creating list took " + Math.floor(performance.now() - start) + " milliseconds.")

    return (
      <div style={this.style}>
        <style>{"#cityList::-webkit-scrollbar {width: 0px;}"}</style>
        <ul ref={(ul) => resultList = ul} id="cityList" style={this.ulStyle}>
          {liElems}
        </ul>
      </div>
    )
  }
}

class Preview extends React.Component<any, any> {
  constructor(props: any) {
    super(props)
    console.log("city is " + this.props.city)
    let cityEscaped = this.props.city.replace(/, /g , ",").replace(/ /g, "+")
    console.log("city escaped is " + cityEscaped)

    let key = fs.readFileSync('/Users/Garrett/Dropbox/Files/workspaces/centroid/api_key').toString()
    this.state = {
      imgUrl: "https://maps.googleapis.com/maps/api/staticmap?center="+ cityEscaped + 
        "&zoom=5&size=500x300&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R" + "&scale=2" +
        "&markers=color:red%7C" + cityEscaped + 
        "&key=" + key,
      latLon: " ",
      key: key,
      city: this.props.city,
    }
    this.getLatLon(cityEscaped, key)
  }

  imgStyle = {
    width: "100%",
    height: "180px",
    background: "#aacbff",
    // border: "1px solid black",
    // verticalAlign: "middle",
  }
  divStyle = {
    width: "300px",
    display: "inline-block",
    margin: "0 10px 10px 10px",
    // lineHeight: "50px",
    textAlign: "center",
    fontFamily: "monospace",
  }

  getLatLon(city: string, apiKey: string) {
    let requestPath = "/maps/api/geocode/json?address=" + city + "&key=" + apiKey

    const options = {
      hostname: 'maps.googleapis.com',
      port: 443,
      path: requestPath,
      method: 'GET',
    };

    const req = https.request(options, (res) => {
      let fullResponse = ""
      console.log(`STATUS: ${res.statusCode}`);
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        fullResponse += chunk
      });
      res.on('end', () => {
        let obj = JSON.parse(fullResponse)
        let loc = obj.results[0].geometry.location
        console.log(loc)
        selectedCitiesLatLon.push([loc.lat, loc.lng])
        console.log("selectedCitiesLatLon is:")
        console.log(selectedCitiesLatLon)
        this.setState({
          latLon: "(" + loc.lat + ", " + loc.lng + ")"
        })
      });
    });

    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
    });

    req.end();
    console.log("making request with path " + requestPath)
  }

  getRemoveCityHandler() {
    return function() {
      console.log("removing city with index " + this.props.index)
      this.props.removeCity(this.props.index)
    }.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.city !== this.state.city) {
      let cityEscaped = nextProps.city.replace(/, /g , ",").replace(/ /g, "+")
      this.setState({
        imgUrl: "https://maps.googleapis.com/maps/api/staticmap?center="+ cityEscaped + 
          "&zoom=5&size=500x300&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R" + "&scale=2" +
          "&markers=color:red%7C" + cityEscaped + 
          "&key=" + this.state.key,
      })
    }
  }

  render () {
    return (
      <div style={this.divStyle}>
        <p>{this.props.city}</p>
        <p>{this.state.latLon}</p>
        <div style={{border: "1px solid blue"}}>
          <button style={{position: "absolute", zIndex: 1, fontWeight: "bold", margin: "3px 3px 0 271px",}} onClick={this.getRemoveCityHandler()}>✕</button>
          <img style={this.imgStyle} src={this.state.imgUrl}/>
        </div>
      </div>
    )
  }
}

class Centroid extends React.Component<any, any> {
  constructor() {
    super()
    this.state = {
      imgUrl: "",
      centroidLatLon: "",
    }
  }

  buttonStyle = {
    display: "block",
    fontSize: "16px",
    padding: "3px",
    margin: "10px",
    borderRadius: "3px",
    backgroundColor: "#fff",
  }
  imgStyle = {
    // width: "100%",
    width: "640px",
    height: "400px",
    background: "#aacbff",
    border: "1px solid black",
    margin: "0 auto",
    display: "block",
  }

  divStyle = {
    width: "640px",
    display: "block",
    // margin: "0 10px 10px 10px",
    // lineHeight: "50px",
    textAlign: "center",
    fontFamily: "monospace",
    margin: "0 auto",
  }

  compute() {
    let key = fs.readFileSync('/Users/Garrett/Dropbox/Files/workspaces/centroid/api_key').toString()
    console.log("computing centroid")

    let centroid: number[] = native.computeCentroid(selectedCitiesLatLon)
    if (centroid.length === 0) {
      this.setState({
        imgUrl: "none"
      })
    } else {
      console.log("centroid is " + centroid)
      this.setState({
        imgUrl: "https://maps.googleapis.com/maps/api/staticmap?center="+ centroid[0] + "," + centroid[1] + 
        "&zoom=5&size=640x400&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R" + "&scale=2" +
        "&markers=color:red%7C" + centroid[0] + "," + centroid[1] + 
        "&key=" + key,
        centroidLatLon: "" + centroid[0] + "," + centroid[1],
      })
    }
  }

  render() {
    if (this.state.imgUrl.length === 0) { // we haven't yet attempted to compute centroid
      return <div>
        <button style={this.buttonStyle} onClick={this.compute.bind(this)}>Compute Centroid</button>
      </div>
    } else if (this.state.imgUrl === "none") { // we've tried computing the centroid and there is none
      return <div>
        <button style={this.buttonStyle} onClick={this.compute.bind(this)}>Compute Centroid</button>
        <p>not contained in one hemisphere</p>
      </div>
    } else { // there is a centroid
      return <div>
        <button style={this.buttonStyle} onClick={this.compute.bind(this)}>Compute Centroid</button>
        <div  style={this.divStyle}>
          <p>({this.state.centroidLatLon})</p>
          <img style={this.imgStyle} src={this.state.imgUrl}/>
        </div>
      </div>
    }
  }
}

function render() {
  ReactDOM.render(
    <div>
      <PreviewBar/>
      <Centroid/>
    </div>,
    document.getElementById('root')
  )
}

render()
