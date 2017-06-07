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
console.log("From index.tsx/Rust:", native.hello())

// Get access to dialog boxes in our main UI process.
const remote = Electron.remote

class PreviewBar extends React.Component<any, any> {
  constructor() {
    super()
    this.state = {
      selectedCities: [],
    }
  }

  style = {
    // width: "100%",
    // height: "100px",
    background: "#efefef",
    // display: "inline-block",
  };

  addSelectedCity(city: string) {
    let newSelectedCities = this.state.selectedCities.slice()
    newSelectedCities.push(city)
    this.setState({
      selectedCities: newSelectedCities,
    })
    console.log("adding " + city)
    console.log("selectedCities is:")
    console.log(newSelectedCities)
  }

  render () {
    let previews: JSX.Element[] = []
    for (let i = 0; i < this.state.selectedCities.length; i++) {
      previews.push(<Preview city={this.state.selectedCities[i]}/>)
    }

    return <div style={this.style}>
      <div>
        <CityInput addSelectedCity={this.addSelectedCity.bind(this)}/>
      </div>
      {previews}
    </div>
  }
}

class CityInput extends React.Component<any, any> {
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
      // keys: [
      //   "title",
      //   "author.firstName"
      // ]
    };
    this.focusTextInput = this.focusTextInput.bind(this);
    this.state = {
      inputText: "",
      fz: new Fuse(this.allCities, options),
      matches: this.allCities,
      matchIndices: [],
    }
  }

  textInput: any
  allCities = fs.readFileSync("/Users/Garrett/workspaces/centroid/cities", "utf8").split("\n")
  style = {
    width: "200px",
    height: "50px",
    padding: "5px 10px",
  }
  inputStyle = {
    width: "100%",
  }
  ulStyle = {
    color: "#444",
    backgroundColor: "#fff",
    listStyleType: "none",
    margin: 0,
    padding: 0,
    display: "none",
    position: "relative",
    overflowY: "scroll",
    maxHeight: "250px",
    zIndex: 1,
    // opacity: 0.95,
    boxShadow: "0 5px 15px 5px rgba(0, 0, 0, 0.125)",
    borderRadius: "0 0 3px 3px",
  }
  liStyle = {
    // borderLeft: "1px solid #444",
    // borderRight: "1px solid #444",
    borderBottom: "1px solid #444",
    padding: "3px",
    cursor: "pointer",
  }
  matchStyle = {
    color: "#f2c12e",
    // fontWeight: "bold",
  }

  handleFocus() {
    console.log("focus")
    this.ulStyle = { ...this.ulStyle }
    this.ulStyle.display = "block"
    render() // TODO: move styles to this.state so we don't have to do this
  }

  handleBlur() {
    console.log("blur")
    this.ulStyle = { ...this.ulStyle }
    this.ulStyle.display = "none"
    render() // TODO: move styles to this.state so we don't have to do this
  }

  handleChange(event: any) {
    console.log("change event triggered with key '%s'", event.target.value)
    this.setState({
      inputText: event.target.value
    });

    if (event.target.value !== "") {
      let results = this.state.fz.search(event.target.value)
      // console.log("search results:")
      // console.log(results)
      // let resultIndices: number[] = results.map(function(x: any): number { return x.item })
      // resultIndices.sort()
      // console.log("result indices:")
      // console.log(resultIndices)
      let newMatches = []
      let newMatchIndices: any[][] = []
      for (let i = 0; i < results.length; i++) {
        newMatches.push(this.allCities[results[i].item])
        newMatchIndices.push(results[i].matches[0])
      }
      this.setState({
        matches: newMatches,
        matchIndices: newMatchIndices,
      })
    } else {
      this.setState({
        matches: this.allCities,
        matchIndices: [],
      })
    }
  }

  handleMouseDown(e: any, city: any) {
    e.preventDefault();
    console.log("processing click with this as " + city)
    this.props.addSelectedCity(city)
  }

  getMouseDownHandler(city: string) {
    return function(e: any) {
      e.preventDefault();
      console.log("processing click with this as " + city)
      this.props.addSelectedCity(city)
    }.bind(this)
  }

  focusTextInput() {
    this.textInput.focus();
  }

  getHighlightedSpans(i: number): JSX.Element[] {
    let indices = this.state.matchIndices[i].indices
    let spans: JSX.Element[] = []
    let curr = 0
    for (let j = 0; j < indices.length; j++) {
      if (curr !== indices[j][0]) {
        let substr = this.state.matches[i].substring(curr, indices[j][0])
        spans.push(<span>{substr}</span>)
        curr = indices[j][0]
      }
      let substr = this.state.matches[i].substring(indices[j][0], indices[j][1] + 1)
      spans.push(<span style={this.matchStyle}>{substr}</span>)
      curr = indices[j][1] + 1
    }
    if (curr !== this.state.matches[i].length) {
      let substr = this.state.matches[i].substring(curr, this.state.matches[i].length)
      spans.push(<span>{substr}</span>)
    }

    return spans
  }

  render() {
    let ulElems: JSX.Element[] = [];
    for (let i = 0; i < this.state.matches.length; i++) {
      let liContent: any
      if (this.state.matchIndices.length !== 0) {
        liContent = this.getHighlightedSpans(i)
      } else {
        liContent = this.state.matches[i]
      }

      let hoverStyle = <style>{"#dropdownEntry:hover {background-color: #e0ecff}"}</style>
      let liElem = <li id="dropdownEntry" onMouseDown={this.getMouseDownHandler(this.state.matches[i])} style={this.liStyle}>{hoverStyle}{liContent}</li>

      ulElems.push(liElem)
    }

    let ulHideScrollbarStyle = <style>{"#cityList::-webkit-scrollbar {width: 0px;}"}</style>

    return <div style={this.style}>
      <input value={this.state.inputText} style={this.inputStyle} type="text" name="city"
        placeholder="city"onFocus={this.handleFocus.bind(this)}
        onBlur={this.handleBlur.bind(this)} onChange={this.handleChange.bind(this)}
        ref={(input) => { this.textInput = input; }}/>
      <ul id="cityList" style={this.ulStyle}>
        {ulHideScrollbarStyle}
        {ulElems}
      </ul>
    </div>
  }
}

class Preview extends React.Component<any, any> {
  constructor(props: any) {
    super(props)
    console.log("city is " + this.props.city)
    let cityEscaped = this.props.city.replace(/, /g , ",").replace(/ /g, "+")
    console.log("city escaped is " + cityEscaped)

    let key = fs.readFileSync('/Users/Garrett/workspaces/centroid/api_key').toString()
    this.state = {
      imgUrl: "https://maps.googleapis.com/maps/api/staticmap?center="+ cityEscaped + 
        "&zoom=5&size=500x300&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R" + "&scale=2" +
        "&markers=color:red%7C" + cityEscaped + 
        "&key=" + key,
      latLon: " ",
    }
    this.getLatLon(cityEscaped, key)
  }

  imgStyle = {
    width: "100%",
    height: "180px",
    background: "#aacbff",
    border: "1px solid black",
    // verticalAlign: "middle",
  }
  divStyle = {
    width: "300px",
    display: "inline-block",
    margin: "10px",
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

  render () {
    return <div style={this.divStyle}>
      <p>{this.props.city}</p>
      <p>{this.state.latLon}</p>
      <img style={this.imgStyle} src={this.state.imgUrl}/>
    </div>
  }
}

class Centroid extends React.Component<any, any> {
  constructor() {
    super()
    this.state = {
      imgUrl: ""
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
    height: "500px",
    background: "#aacbff",
    border: "1px solid black",
    margin: "0 auto",
    display: "block",
  }

  compute() {
    let key = fs.readFileSync('/Users/Garrett/workspaces/centroid/api_key').toString()
    console.log("computing centroid")
    this.setState({
      imgUrl: "https://maps.googleapis.com/maps/api/staticmap?center="+ "Tokyo,Japan" + 
      "&zoom=5&size=640x500&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R" + "&scale=2" +
      "&markers=color:red%7C" + "Tokyo,Japan" + 
      "&key=" + key
    })
  }

  render() {
    if (this.state.imgUrl.length !== 0) {
      return <div>
        <button style={this.buttonStyle} onClick={this.compute.bind(this)}>Compute Centroid</button>
        <img style={this.imgStyle} src={this.state.imgUrl}/>
      </div>
    } else {
      return <div>
        <button style={this.buttonStyle} onClick={this.compute.bind(this)}>Compute Centroid</button>
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
