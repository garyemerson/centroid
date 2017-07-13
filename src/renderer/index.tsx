import React = require('react')
import ReactDOM = require('react-dom')
import Electron = require('electron')
import { format as urlFormat } from 'url'
import objectAssign = require("object-assign")
import native = require('../../native')
import fs = require('fs')
import Fuse = require('fuse.js')
import https = require('https')
import { Provider, connect } from 'react-redux'
import { createStore, applyMiddleware, compose, Action } from 'redux'
import logger = require("redux-logger")
import gmaps = require('./gmaps')

native.init()

let resultList: any
let results = {}

// Get access to dialog boxes in our main UI process.
const remote = Electron.remote
const apiKeyFile1 = "/Users/Garrett/Dropbox/Files/workspaces/centroid/api_key1"
const apiKeyFile2 = "/Users/Garrett/Dropbox/Files/workspaces/centroid/api_key2"
let apiKey1: string | null = null
let apiKey2: string | null = null

class CitySelection extends React.Component<any, any> {
  constructor() {
    super()
  }

  style: React.CSSProperties = {
    paddingTop: "20px",      
    height: "33.33vh",
    background: "#efefef",
    overflowX: "scroll",
  }
  previewBarStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    marginTop: "39px",
    textAlign: "center",
  }

  render () {
    let previews: JSX.Element[] = []
    for (let i = 0; i < this.props.cities.length; i++) {
      previews.push(<Preview dispatch={this.props.dispatch} key={i} cities={this.props.cities} city={this.props.cities[i].name}
        lat={this.props.cities[i].lat} lon={this.props.cities[i].lon} index={i}/>)
    }

    return (
      <div style={this.style}>
        <div>
          <Search dispatch={this.props.dispatch}/>
        </div>
        <div style={this.previewBarStyle}>
          {previews}
        </div>
      </div>
     )
  }
}

class Preview extends React.Component<any, any> {
  constructor(props: any) {
    super(props)
    let cityEscaped = this.props.city.replace(/, /g , ",").replace(/ /g, "+")

    if (apiKey1 === null) {
      apiKey1 = fs.readFileSync(apiKeyFile1).toString().trim()
    }
    this.state = {
      city: this.props.city,
      imgUrl: "https://maps.googleapis.com/maps/api/staticmap?center="+ cityEscaped + 
        "&zoom=5&size=500x300&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R" + "&scale=2" +
        "&markers=color:red%7C" + cityEscaped + 
        "&key=" + apiKey1,
      lat: this.props.lat,
      lon: this.props.lon,
    }
    this.getLatLon(cityEscaped, apiKey1)
  }

  style: React.CSSProperties = {
    height: "20vh",
    display: "inline-block",
    margin: "0 10px 10px 10px",
    textAlign: "center",
    fontFamily: "monospace",
    fontSize: "1.5vh",
  }
  imgStyle: React.CSSProperties = {
    height: "15vh",
    width: "25vh",
    background: "#aacbff",
    border: "1px solid #d0d0d0",
    borderRadius: "3px",
    boxShadow: "0 0 10px 2.5px rgba(0, 0, 0, 0.05)",
  }
  buttonStyle: React.CSSProperties = {
    position: "relative",
    top:" 25px",
    zIndex: 1,
    overflow: "visible",
    marginTop: "-24px",
    float: "right",
    fontWeight: "bolder",
    padding:" 0",
    boxShadow: "inset 0 0 10px #bbb5b5",
    border: "1px solid #ddd",
    opacity: 0.9,
    color: "#333",
    right: "10px",
    height: "17px",
    width: "17px",
    fontSize: "12px",
    paddingLeft: "0.75px",
    borderRadius: "50%",
    textAlign: "center",
    outlineStyle: "none",
  }
  imgButtonContainer: React.CSSProperties = {
    display: "table",
  }

  getLatLon(city: string, apiKey1: string) {
    city = city.trim()
    console.log("city is '" + city + "'")
    console.log("city encoded is '" + encodeURIComponent(city) + "'")
    console.log("apiKey1 is '" + apiKey1 + "'")
    let requestPath = "/maps/api/geocode/json?address=" + city + "&key=" + apiKey1

    const options = {
      hostname: 'maps.googleapis.com',
      port: 443,
      path: requestPath,
      method: 'GET',
    };

    const req = https.request(options, (resp) => {
      let fullResponse = ""
      console.log(`STATUS: ${resp.statusCode}`);
      resp.setEncoding('utf8');
      resp.on('data', (chunk) => {
        fullResponse += chunk
      });
      resp.on('end', () => {
        let obj = JSON.parse(fullResponse)
        let loc = obj.results[0].geometry.location
        console.log(loc)
        this.props.dispatch({
          type: "ADD_LATLON_INFO",
          index: this.props.index,
          lat: loc.lat,
          lon: loc.lng,
        })
      })
    })

    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`)
    })

    req.end()
    console.log("making request with path " + requestPath)
  }

  RemoveCity() {
    this.props.dispatch({
      type: "REMOVE_CITY",
      index: this.props.index
    })
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.city !== this.props.city) {
      let cityEscaped = nextProps.city.replace(/, /g , ",").replace(/ /g, "+")
      this.setState({
        city: nextProps.city,
        imgUrl: "https://maps.googleapis.com/maps/api/staticmap?center="+ cityEscaped + 
          "&zoom=5&size=500x300&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R" +
          "&scale=2" + "&markers=color:red%7C" + cityEscaped + "&key=" + apiKey1,
      })
    }
    if (nextProps.lat !== this.props.lat || nextProps.lon !== this.props.lon) {
      this.setState({
        lat: nextProps.lat,
        lon: nextProps.lon,
      })
    }
  }

  render () {
    let latLonStr = "-"
    if (this.state.lat !== null) {
      latLonStr = "(" + this.state.lat + ", " + this.state.lon + ")"
    }

    let buttonHoverStyle = <style>{"#removeButton:hover {background-color: #ff6868}"}</style>
    return (
      <div style={this.style}>
        <p style={{marginBottom: "0"}}>{this.state.city}</p>
        <p style={{marginTop: "0", marginBottom: "2px",}}>{latLonStr}</p>
        <div style={this.imgButtonContainer}>
          {buttonHoverStyle}
          <button id="removeButton" style={this.buttonStyle} onClick={this.RemoveCity.bind(this)}>✕</button>
          <img style={this.imgStyle} src={this.state.imgUrl}/>
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
    }

    this.focusTextInput = this.focusTextInput.bind(this)
    let allCities = fs.readFileSync("/Users/Garrett/Dropbox/Files/workspaces/centroid/cities", "utf8").split("\n")
    this.state = {
      inputText: "",
      matches: [] as string[],
      matchIndices: [] as number[],
      allCities: allCities,
      fz: new Fuse(allCities, options),
      resultsVisible: false,
      focused: false,
      selectedResult: -1,
      scrollTop: 0,
      needsScroll: false,
    }

    Electron.ipcRenderer.on('toggle-search', (event, message) => {
      console.log(message)  // Prints 'whoooooooh!'
      this.focusTextInput()
    })
  }

  textInput: any
  resultList: any
  style: React.CSSProperties = {
    display: "table",
    position: "absolute",
    left: "calc(50% - 10em)",
    margin: "0 auto 10px auto",
    borderRadius: "3px",
  }
  inputStyle: React.CSSProperties = {
    width: "20em",
    fontFamily: "sans-serif",
    fontSize: "16px",
    outline: "none",
    position: "relative",
    zIndex: 2,
    padding: "5px 3px",
    border: "1px solid #ddd",
    borderRadius: "3px",
  }

  focusTextInput() {
    this.textInput.focus()
    if (this.state.inputText !== "") {
      this.textInput.select()
    }
  }

  handleFocus() {
    // console.log("focus")
    this.setState({
      focused: true,
      needsScroll: true,
    })
  }

  componentDidUpdate() {
    if (this.state.needsScroll) {
      if (resultList !== undefined && resultList !== null) {
        console.log("restoring scrollTop to " + this.state.scrollTop)
        resultList.scrollTop = this.state.scrollTop
      } else {
        console.log("bad resultList: " + resultList)
      }
      this.setState({
        needsScroll: false
      })
    }
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
    })

    if (event.target.value !== "") {
      let results = this.state.fz.search(event.target.value)
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
        scrollTop: 0,
        needsScroll: false,
      })
    } else {
      this.setState({
        matches: [],
        matchIndices: [],
      })
    }
  }

  handleKeyPress(event: any) {
    switch (event.keyCode) {
      case 13: // Enter
        event.preventDefault()
        this.textInput.blur()
        this.props.dispatch({type: "ADD_CITY", name: this.state.matches[this.state.selectedResult]})
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
            console.log("resultList scrollTop before: " + resultList.scrollTop)
            results[this.state.selectedResult - 1].scrollIntoView()
            console.log("resultList scrollTop after: " + resultList.scrollTop)
            console.log("resultList height is " + resultList.offsetHeight)
          }

          this.setState({
            selectedResult: this.state.selectedResult - 1,
            scrollTop: resultList.scrollTop,
          })
        }
        break
      case 40: // Down
        event.preventDefault()
        if (this.state.selectedResult < this.state.matches.length - 1) {
          console.log("result offsetTop is " + results[this.state.selectedResult + 1].offsetTop)
          console.log("resultList scrollTop is " + resultList.scrollTop)
          let resultBottom = results[this.state.selectedResult + 1].offsetTop + results[this.state.selectedResult + 1].offsetHeight
          let resultListBottom = resultList.scrollTop + resultList.offsetHeight
          console.log("result bottom is " + resultBottom)
          console.log("resultList bottom is " + resultListBottom)
          if (resultBottom > resultListBottom) {
            console.log("resultList scrollTop before: " + resultList.scrollTop)
            results[this.state.selectedResult + 1].scrollIntoView(false)
            console.log("resultList scrollTop after: " + resultList.scrollTop)
          }
          this.setState({
            selectedResult: this.state.selectedResult + 1,
            scrollTop: resultList.scrollTop,
          })
        }
        break
      default:
        break
    }
  }

  render() {
    let results: JSX.Element | null = null
    let style = this.style
    let inputStyle = this.inputStyle
    if (this.state.focused) {
      style = objectAssign({}, this.style, {boxShadow: "0 0 40px 5px rgba(0, 0, 0, 0.125)"})
      if (this.state.matches.length > 0) {
        inputStyle = objectAssign({}, this.inputStyle, {borderRadius: "3px 3px 0 0"})
        results = <Results dispatch={this.props.dispatch} ref={(results) => this.resultList = results} matches={this.state.matches}
          matchIndices={this.state.matchIndices} selectedIndex={this.state.selectedResult} scrollTop={this.state.scrollTop}/>
      }
    }

    return (
      <div id="search" style={style}>
        <style>
          {"#input::-webkit-input-placeholder { font-style: italic; }" +
           "#input:-moz-placeholder { font-style: italic; }" +
           "#input::-moz-placeholder { font-style: italic; }" +
           "#input:-ms-input-placeholder { font-style: italic; }"}
        </style>
        <input id="input" value={this.state.inputText} style={inputStyle} type="text" name="city"
          placeholder={"Search City " + (process.platform === 'darwin' ? '(cmd+L)' : '(ctrl+L)')}
          onFocus={this.handleFocus.bind(this)}
          onBlur={this.handleBlur.bind(this)} onChange={this.handleChange.bind(this)}
          ref={(input) => { this.textInput = input }} onKeyDown={this.handleKeyPress.bind(this)}/>
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

  getAddCityFn(city: string) {
    return function(e: any) {
      e.preventDefault()
      this.props.dispatch({type: "ADD_CITY", name: city})
    }.bind(this)
  }

  render() {
    let start = performance.now()
    let liElems: JSX.Element[] = []
    console.log("there are " + this.props.matches.length + " matches")
    for (let i = 0; i < this.props.matches.length; i++) {
      let liContent = this.getHighlightedSpans(i)
      let hoverStyle = <style>{"#dropdownEntry" + i + ":hover {background-color: #eaeaea}"}</style>
      let selectedStyle: JSX.Element | null = null
      let li: JSX.Element
      if (i === this.props.selectedIndex) {
        selectedStyle = <style>{"#dropdownEntry" + i + "{background-color: #eaeaea}"}</style>
        li = <li ref={(result) => results[i] = result} key={i} id={"dropdownEntry" + i}
          onMouseDown={this.getAddCityFn(this.props.matches[i])} style={this.liStyle}>
          {selectedStyle}{hoverStyle}{liContent}</li>
      } else {
        li = <li ref={(result) => results[i] = result} key={i} id={"dropdownEntry" + i}
          onMouseDown={this.getAddCityFn(this.props.matches[i])} style={this.liStyle}>{hoverStyle}{liContent}</li>
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

class CentroidDisplay extends React.Component<any, any> {
  constructor() {
    super()

    if (apiKey2 === null) {
      apiKey2 = fs.readFileSync(apiKeyFile2).toString().trim()
    }

    this.state = {
      phantomState: null
    }
  }

  mapObj: any
  mapElem: any
  buttonStyle: React.CSSProperties = {
    display: "block",
    fontSize: "10px",
    padding: "3px",
    margin: "10px",
    borderRadius: "3px",
    backgroundColor: "#fff",
  }
  imgStyle: React.CSSProperties = {
    height: "50vh",
    width: "80vh",
    background: "#aacbff",
    margin: "0 auto",
    display: "block",
    border: "1px solid #444",
    borderRadius: "2px",
    // boxShadow: "0 0 5px 2.5px rgba(0, 0, 0, 0.05)",
  }
  divStyle: React.CSSProperties = {
    // width: "640px",
    display: "block",
    textAlign: "center",
    fontFamily: "monospace",
    // margin: "0 auto",
    // border: "50px solid lightgray",
    // borderRadius: "3px",
    width: "100%",
    boxSizing: "border-box",
    height: "65vh",
    background: "lightgray",
    margin: 0,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "50% 50%",
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      phantomState: null
    })
  }

  computeCentroid(): Centroid | null {
    let centroid: Centroid | null = null
    if (this.props.cities.length !== 0) {
      let latLons = this.props.cities.map((city) => [city.lat, city.lon])
      let centroidLatLon: number[] = native.computeCentroid(latLons)

      console.log("latLons is\n", latLons)
      console.log("add city: centroid is\n", centroidLatLon)

      if (centroidLatLon.length !== 0) {
        centroid = { lat: centroidLatLon[0], lon: centroidLatLon[1] }
      } else {
        centroid = { lat: null, lon: null }
      }
    }

    return centroid
  }

  getImgDimensions(width: number, height: number): {width: number, height: number} {
    let ratio = 1.6
    if (width / height > ratio) {
      return { width: Math.floor(width), height: Math.floor(width / ratio) }
    } else {
      return { width: Math.floor(height * ratio), height: Math.floor(height) }
    }
  }

  componentDidMount() {
    if (this.mapElem !== null) {
      console.log("initializing map")
      console.log("gmaps:")
      console.log(gmaps)
      // console.log("google is ", google)

      let gm = gmaps({
        div: '#map',
        lat: -12.043333,
        lng: -77.028333
      });

      // this.mapObj = new google.maps.Map(this.mapElem, {
      //   zoom: 12,
      //   center: {lat: -28.643387, lng: 153.612224},
      //   mapTypeControl: true,
      //   mapTypeControlOptions: {
      //       style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      //       position: google.maps.ControlPosition.TOP_CENTER
      //   },
      //   zoomControl: true,
      //   zoomControlOptions: {
      //       position: google.maps.ControlPosition.LEFT_CENTER
      //   },
      //   scaleControl: true,
      //   streetViewControl: true,
      //   streetViewControlOptions: {
      //       position: google.maps.ControlPosition.LEFT_TOP
      //   },
      //   fullscreenControl: true
      // });
    } else {
      console.log("map is null")
    }
  }

  render() {
    let centroid: Centroid | null = this.computeCentroid()
    let centroidElem: JSX.Element | null
    let divStyle = this.divStyle
    if (centroid === null) {
      centroidElem = null
    } else if (centroid.lat === null) {
      centroidElem = <p>not contained in one hemisphere</p>
    } else {
      let imgDim = this.getImgDimensions(document.documentElement.clientWidth, document.documentElement.clientHeight)
      console.log("imgDim is ", imgDim)
      let imgUrl = "https://maps.googleapis.com/maps/api/staticmap?center=" + centroid.lat + "," +
        centroid.lon + "&zoom=6&size=" + imgDim.width + "x" + imgDim.height +
        "&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R" + "&scale=2" +
        "&markers=color:red%7C" + centroid.lat + "," + centroid.lon +
        "&key=" + apiKey1
      console.log("imgUrl is ", imgUrl)
      let latLon = "" + centroid.lat + "," + centroid.lon

      centroidElem = <iframe style={{width: "99%", height: "65vh", border: "none"}} src={"https://www.google.com/maps/embed/v1/place?q=" + centroid.lat + "," + centroid.lon + "&zoom=6&key=" + apiKey2}></iframe>

      divStyle = objectAssign({}, divStyle, {backgroundImage: "url(" + imgUrl + ")"})
      // centroidElem = (
      //   <div  style={this.divStyle}>
      //     <p>({latLon})</p>
      //     <img style={this.imgStyle} src={imgUrl}/>
      //   </div>
      // )
    }

    return (
      <div id="map" style={{height: "100%"}} ref={(map) => this.mapElem = map}></div>
    )
  }
}

function mapStateToProps(state: any): any {
  return state
}

let App = connect(mapStateToProps)(
  class App extends React.Component<any, any> {
  render() {
    return (
      <div style={{background: "lightgray"}}>
        <CitySelection dispatch={this.props.dispatch} cities={this.props.cities}/>
        <CentroidDisplay cities={this.props.cities} centroid={this.props.centroid}/>
      </div>
    )
  }
})

interface AddCity extends Action {
  type: "ADD_CITY",
  name: string,
}
interface RemoveCity extends Action {
  type: "REMOVE_CITY",
  index: number,
}
interface AddLatLonInfo extends Action {
  type: "ADD_LATLON_INFO",
  index: number,
  lat: number,
  lon: number,
}
interface AddCentroid extends Action {
  type: "ADD_CENTROID",
  centroid: Centroid,
}
interface City {
  name: string,
  lat: number | null,
  lon: number | null,
}
interface Centroid {
  lat: number | null,
  lon: number | null,
}
type AppAction = AddCity | RemoveCity | AddLatLonInfo | AddCentroid
interface AppState {}

function reducer(state: any, action: AppAction): any {
  switch (action.type) {
    case "ADD_CITY":
      return objectAssign({}, state, { cities: [...state.cities, { name: action.name, lat: null, lon: null }] })
    case "REMOVE_CITY":
      return objectAssign({}, state, { cities: [...state.cities.slice(0, action.index), ...state.cities.slice(action.index + 1)]})
    case "ADD_LATLON_INFO":
      return objectAssign(
        {},
        state,
        {
          cities:
            [
              ...state.cities.slice(0, action.index),
              {
                name: state.cities[action.index].name,
                lat: action.lat,
                lon: action.lon
              },
              ...state.cities.slice(action.index + 1)
            ]
        })
    case "ADD_CENTROID":
      return objectAssign(
        {},
        state,
        {
          centroid: {
            lat: action.centroid.lat,
            lon: action.centroid.lon,
          }
        })
    default:
      return state
  }
}

const store = compose(applyMiddleware(logger()))(createStore)(reducer,
  {
    cities: [] as City[],
    centroid: null as Centroid | null,
  })
// const store = createStore(
//   reducer,
//   applyMiddleware(logger)
// )

function render() {
  ReactDOM.render(
    <Provider store={store}>
      <App/>
    </Provider>,
    document.getElementById('root')
  )
}
render()
