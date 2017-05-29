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

// The state of our movie player.
type PlayerState = {
  url?: string
  width: number,
  height: number
}

function newPlayerState(): PlayerState {
  return {
    url: undefined,
    width: window.innerWidth,
    height: window.innerHeight
  }
}

type SET_URL = "SET_URL";
const SET_URL: SET_URL = "SET_URL";

type SetUrlAction = {
  type: SET_URL,
  url: string
}

function setUrl(url: string): SetUrlAction {
  return { type: SET_URL, url: url }
}

type SET_SIZE = "SET_SIZE";
const SET_SIZE: SET_SIZE = "SET_SIZE";

type SetSizeAction = {
  type: SET_SIZE,
  width: number,
  height: number
}

function setSize(width: number, height: number): SetSizeAction {
  return { type: SET_SIZE, width: width, height: height }
}

// See https://spin.atomicobject.com/2016/09/27/typed-redux-reducers-typescript-2-0/
// for the code which explains how we use `OtherAction` to cheat and make
// Redux messages strongly typed.  It's a bit evil but cool.  Essentially
// this message acts as a (disjoint) alternative to all known messages, and
// represents any unknown message.
type OtherAction = { type: '' }
const OtherAction: OtherAction = { type: '' }

type PlayerAction = SetUrlAction | SetSizeAction | OtherAction

function player(state: PlayerState = newPlayerState(),
  action: PlayerAction): PlayerState {
  switch (action.type) {
    case SET_URL:
      return objectAssign(state, { url: action.url })
    case SET_SIZE:
      return objectAssign(state, { width: action.width, height: action.height })
    default:
      return state
  }
}

interface IPlayerProps {
  url?: string,
  onSetUrl: (url: string) => void,
  onSetSize: (width: number, height: number) => void
}

interface INoState {
}

class Player extends React.Component<IPlayerProps, INoState> {
  static propTypes = {
    url: React.PropTypes.string,
    onSetUrl: React.PropTypes.func.isRequired,
    onSetSize: React.PropTypes.func.isRequired
  }

  render() {
    const { url } = this.props
    if (url) {
      return this.renderVideo(url)
    } else {
      return this.renderOpenButton()
    }
  }

  renderVideo(url: string) {
    const { onSetSize } = this.props
    function onLoadedMetadata(event: React.SyntheticEvent<HTMLVideoElement>) {
      onSetSize(event.currentTarget.videoWidth, event.currentTarget.videoHeight)
    }
    return <video src={url} onLoadedMetadata={onLoadedMetadata} controls></video>
  }

  renderOpenButton() {
    const { onSetUrl } = this.props

    function onOpen() {
      const files = remote.dialog.showOpenDialog({
        title: "Open video",
        properties: ["openFile"],
        filters: [
          { name: "Video Files", extensions: ["mp4"] }
        ]
      })
      if (files) {
        const url = urlFormat({
          pathname: files[0],
          protocol: 'file:',
          slashes: true
        })
        onSetUrl(url)
      }
    }

    return <button onClick={onOpen}>Open</button>
  }
}

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
