import React = require('react')
import ReactDOM = require('react-dom')
import Electron = require('electron')
import { format as urlFormat } from 'url'
import objectAssign = require("object-assign")
import native = require('../../native');
import fuse = require('fuse.js')
import fs = require('fs')

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
    this.handleBlur = this.handleBlur.bind(this)
    this.handleFocus = this.handleFocus.bind(this)
  }

  style = {
    width: "100px",
    height: "100px",
  }
  inputStyle = {
    width: "100%",
  }
  ulStyle = {
    backgroundColor: "#fff",
    listStyleType: "none",
    margin: 0,
    padding: 0,
    display: "none",
  }
  liStyle = {
    borderLeft: "1px solid black",
    borderRight: "1px solid black",
    borderBottom: "1px solid black",
  }

  handleFocus() {
    console.log("focus")
    console.log("this is " + this)
    this.ulStyle.display = "block"
    render()
  }

  handleBlur() {
    console.log("blur")
    console.log("this is " + this)
    this.ulStyle.display = "none"
    render()
  }

  render() {
    return <div style={this.style}>
       <input style={this.inputStyle} type="text" name="city" placeholder="city" onFocus={this.handleFocus} onBlur={this.handleBlur}></input>
       <ul style={this.ulStyle}>
         <li style={this.liStyle}>foo</li>
         <li style={this.liStyle}>bar</li>
         <li style={this.liStyle}>baz</li>
       </ul>
     </div>
  }
}

class Preview extends React.Component<any, any> {
  constructor() {
    super()
    var cities = fs.readFileSync("/Users/Garrett/workspaces/centroid/cities", "utf8").split("\n")
    this.city = cities[Math.floor(Math.random() * cities.length)]
    this.city = this.city.replace(", ", ",")
    this.city = this.city.replace(" ", "+")
    console.log("city is " + this.city)

    var key = fs.readFileSync('/Users/Garrett/workspaces/centroid/api_key')
    // console.log("api key is " + key)
    this.img_url = "https://maps.googleapis.com/maps/api/staticmap?center="+ this.city + 
      "&zoom=5&size=640x400&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R" + 
      "&markers=color:red%7C" + this.city + 
      "&key=" + key

  }

  city: string
  img_url: string
  imgStyle = {
    width: "300px",
    // height: "150px",
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
    <PreviewBar />,
    document.getElementById('root')
  )
}

render()
