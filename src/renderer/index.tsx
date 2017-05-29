import React = require('react')
import ReactDOM = require('react-dom')
import Electron = require('electron')
import { format as urlFormat } from 'url'
import objectAssign = require("object-assign")
import native = require('../../native');
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
      <Preview/>
      <Preview/>
      <Preview/>
    </div>
  }
}

class Preview extends React.Component<any, any> {
  style = {
    width: "300px",
    // height: "150px",
    background: "#aacbff",
    margin: "10px",
    display: "inline-block",
    lineHeight: "50px",
    textAlign: "center",
    verticalAlign: "middle",
    fontFamily: "monospace",
    border: "1px solid black",
  }

  render () {
    // "47.6028817"
    // "-122.2249513"
    var lon_min = -19
    var lon_max = 140.522780
    var lat = Math.random() * 90
    var lon = Math.random() * (lon_max - lon_min) + lon_min
    var log_msg: string = "(lat, lon): (" + lat + ", " + lon + ")"
    console.log("foobar")
    console.log(log_msg)
    var key = fs.readFileSync('/Users/Garrett/workspaces/centroid/api_key')
    console.log("api key is " + key)
    var img_url = "https://maps.googleapis.com/maps/api/staticmap?center="
      + lat + "," + lon
      + "&zoom=5&size=640x400&path=weight:3%7Ccolor:blue%7Cenc:{coaHnetiVjM??_SkM??~R&key=" + key

    return <img style={this.style} src={img_url}></img>
  }
}

function render() {
  ReactDOM.render(
    <PreviewBar />,
    document.getElementById('root')
  )
}

render()
