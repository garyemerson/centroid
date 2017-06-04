import React = require('react')
import ReactDOM = require('react-dom')
import Electron = require('electron')
import { format as urlFormat } from 'url'
import objectAssign = require("object-assign")
import native = require('../../native');
import fs = require('fs')
import Fuse = require('fuse.js')

native.init()
console.log("From index.tsx/Rust:", native.hello())

// Get access to dialog boxes in our main UI process.
const remote = Electron.remote

class PreviewBar extends React.Component<any, any> {
  style = {
    // width: "100%",
    // height: "100px",
    background: "#efefef",
    // display: "inline-block",
  };

  render () {
    return <div style={this.style}>
      <div>
        <CityInput/>
      </div>
      <Preview/>
      <Preview/>
      <Preview/>
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
    this.state = {
      inputText: "",
      fz: new Fuse(this.allCities, options),
      matches: this.allCities,
      matchIndices: [],
    }
  }

  allCities = fs.readFileSync("/Users/Garrett/workspaces/centroid/cities", "utf8").split("\n")
  style = {
    width: "200px",
    height: "50px",
    padding: "5px",
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
  }
  liStyle = {
    borderLeft: "1px solid black",
    // borderRight: "1px solid black",
    borderBottom: "1px solid black",
  }
  matchStyle = {
    color: "#000",
    fontWeight: "bold",
  }

  handleFocus() {
    console.log("focus")
    this.ulStyle = { ...this.ulStyle }
    this.ulStyle.display = "block"
    render()
  }

  handleBlur() {
    console.log("blur")
    this.ulStyle = { ...this.ulStyle }
    this.ulStyle.display = "none"
    render()
  }

  handleChange(event: any) {
    console.log("change event triggered with key '%s'", event.target.value)
    this.setState({
      inputText: event.target.value
    });

    if (event.target.value !== "") {
      let results = this.state.fz.search(event.target.value)
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

  getHighlightedElem(i: number): JSX.Element {
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

    return <li style={this.liStyle}>{spans}</li>
  }

  render() {
    let ulElems: JSX.Element[] = [];
    for (let i = 0; i < this.state.matches.length; i++) {
      let elem: JSX.Element
      if (this.state.matchIndices.length !== 0) {
        elem = this.getHighlightedElem(i)
      } else {
        elem = <li style={this.liStyle}>{this.state.matches[i]}</li>
      }
      ulElems.push(elem)
    }

    return <div style={this.style}>
      <input value={this.state.inputText} style={this.inputStyle} type="text" name="city"
        placeholder="city"onFocus={this.handleFocus.bind(this)}
        onBlur={this.handleBlur.bind(this)} onChange={this.handleChange.bind(this)}/>
      <ul style={this.ulStyle}>
        {ulElems}
      </ul>
    </div>
  }
}

class Preview extends React.Component<any, any> {
  constructor() {
    super()
    let cities = fs.readFileSync("/Users/Garrett/workspaces/centroid/cities", "utf8").split("\n")
    this.city = cities[Math.floor(Math.random() * cities.length)]
    this.city = this.city.replace(/, /g , ",")
    this.city = this.city.replace(/ /g, "+")
    console.log("city is " + this.city)

    let key = fs.readFileSync('/Users/Garrett/workspaces/centroid/api_key')
    this.img_url = "https://maps.googleapis.com/maps/api/staticmap?center="+ this.city + 
      "&zoom=5&size=500x300&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R" + 
      "&markers=color:red%7C" + this.city + 
      "&key=" + key

  }

  city: string
  img_url: string
  imgStyle = {
    width: "300px",
    height: "180px",
    background: "#aacbff",
    border: "1px solid black",
    // verticalAlign: "middle",
  }
  divStyle = {
    display: "inline-block",
    margin: "10px",
    lineHeight: "50px",
    textAlign: "center",
    fontFamily: "monospace",
  }

  render () {
    return <div style={this.divStyle}>
      <p>{this.city}</p>
      <img style={this.imgStyle} src={this.img_url}></img>
    </div>
  }
}

function render() {
  ReactDOM.render(
    <PreviewBar/>,
    document.getElementById('root')
  )
}

render()
