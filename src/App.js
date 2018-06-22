import React, {Component} from 'react';
import './App.css';
import Map from './Components/Map';
import * as api from './Data/Apis';
import { locations as AllLocation } from './Data/AllLocations.js';
import scriptLoader from 'react-async-script-loader';
import sortBy from 'sort-by';
import escapeRegExp from 'escape-string-regexp';
import fetchJsonp from 'fetch-jsonp';

let markers = [];
let infoWindows = [];

class App extends Component {

    constructor(props) {
        super(props);
        this.state = {
            map: {},
            bounds: {},
            query: '',
            locations: AllLocation,
            seccessfulRequest: true,
            locationSelected: '',
            data: [],
            // Future handling
            foursquareError: [],
            listShow: true
        };
    }

    updateQuery = (query) => {
        console.log("query");
        this.setState( { query: query } );
    }

    updateData = (newData) => {
        // console.log(newData);
        this.setState({ 
            data: newData 
        });
    }

    updateError = (newData) => {
        console.log(newData);
        this.setState({ 
            foursquareError: newData 
        });
    }

    componentWillReceiveProps({ isScriptLoadSucceed }) {
        // console.log(isScriptLoadSucceed);
        if(isScriptLoadSucceed) {
            // console.log("succeed");
            var map = new window.google.maps.Map(document.getElementById('map'),{
                zoom: 12,
                center: api.center
            });
            this.setState({ map: map });
        } else {
            this.setState({ seccessfulRequest: false });
            console.log("Error Google Map Can't be loaded!");
        }
    }

    componentDidUpdate() {
        const { locations, query, map, data, seccessfulRequest } = this.state;
        let showLocations = locations;

        if(query) {
            const match = new RegExp(escapeRegExp(query), 'i')
            showLocations = locations.filter((location) => match.test(location.name))
        } else {
            showLocations = locations;
        }

        markers.forEach(marker => { marker.setMap(null) });
        markers = [];
        infoWindows = [];
        showLocations.map((marker) => {

            // Get Accuret Place Name
            if (seccessfulRequest) {
                let getCorrectName = data.filter((single) => single[0].name.includes(marker.name)).map(item2 => {// marker.name === single[0].name
                    // console.log(item2);
                    if(item2.length === 0 ){
                        return 'No Result, Please try again!';
                    } else if (item2[0] !== '' ){
                        if (item2[0] !== undefined) {
                            // console.log(item2[0].name);
                            return item2[0].name;
                        }
                        else {
                            console.log(item2[0]);    
                            return "Error in retrive data!"
                        }
                    } else {
                        return 'No Result, Please try again!';
                    }
                });
                
                // Get Accuret Location
                let getData = data.filter((single) => single[0].name.includes(marker.name)).map(item2 => {// marker.name === single[0].name
                    // console.log(item2);
                    if(item2.length === 0 ){
                        return 'No Result, Please try again!';
                    } else if (item2[0] !== '' ){
                        // console.log("Address: " + item2[0].location);
                        return "Address: " + item2[0].location['address'] + "\nCity: " + item2[0].location['city'] + "\nCountry: " + item2[0].location['country'];
                    } else {
                        return 'No Result, Please try again!';
                    }
                });
                
                // Get Status of checked in 
                let getStatus = data.filter((single) => single[0].name.includes(marker.name)).map(item2 => {
                    // console.log(item2);
                    let da = []
                    if(item2.length === 0 ){
                        return 'Nothing to Show!';
                    } else if (item2[0] !== '' ){
                        // console.log(item2[0].hereNow);
                        da.push(item2[0].hereNow.count)
                        da.push(item2[0].hereNow.summary)
                        // console.log(da);
                        
                        return da;
                    } else {
                        return 'Nothing to Show!';
                    }
                });

                var contentInfo =   `<div tabIndex="0" class="infoWindow">
                                        <h4>${getCorrectName[0]}</h4>
                                        <p>${getData}</p>
                                        <p>${getStatus[0]}</p>
                                    </div>`;

                let addInfoWindow = new window.google.maps.InfoWindow(
                    { content: contentInfo }
                );
                let bounds = new window.google.maps.LatLngBounds();
                let addMarker = new window.google.maps.Marker({
                    map: map,
                    position: marker.location,
                    animation: window.google.maps.Animation.DROP,
                    name: marker.name
                });
                markers.push(addMarker);
                infoWindows.push(addInfoWindow);
                addMarker.addListener('click', function(){
                    infoWindows.forEach(info => {info.close() });
                    addInfoWindow.open(map, addMarker);
                    if(addMarker.getAnimation() !== null){
                        addMarker.setAnimation(null);
                    } else {
                        addMarker.setAnimation(window.google.maps.Animation.BOUNCE);
                        setTimeout(() => { 
                            addMarker.setAnimation(null);
                        }, 500);
                    }
                });
                markers.forEach((singleMarker) => 
                    bounds.extend(singleMarker.position)
                )
                map.fitBounds(bounds);
            }
        })
    }

    componentDidMount() {
        this.state.locations.map( (location, index) => {
            // console.log(location);
            return fetchJsonp(`https://api.foursquare.com/v2/venues/search?client_id=${api.clientId}&client_secret=${api.clientSecret}&v=20180323&ll=${location.location.lat},${location.location.lng}&limit=1`)
            .then(response => response.json()).then( (responseJson) => {
                // console.log(responseJson);
                if(responseJson.response === undefined || responseJson.response.length === 0){
                    let newData = [...this.state.data,[responseJson.meta]];
                    this.updateError(newData)
                } else {
                    let newData = [...this.state.data,[responseJson.response.venues[0]]];
                    this.updateData(newData)
                }
            }).catch(error => {
                console.log(error);
            })
        })
    }

    toggleListView = () => {
        const { listShow } = this.state;
        console.log(listShow);
        this.setState({ listShow: !listShow });
    }

    ListItem = (item, event) => {
        console.log(item, event);
        let selected = markers.filter( (currentMarker ) => currentMarker.name === item.name)
        window.google.maps.event.trigger(selected[0], 'click');
    }
    
    render() {
        const { locations, query, seccessfulRequest } = this.state;
        let showLocations;
        
        if(query){
            const match = new RegExp(escapeRegExp(query), 'i')
            showLocations = locations.filter( (location) => match.test(location.name))
        } else {
            showLocations = locations;
        }

        showLocations.sort(sortBy('name'));

        return (
            seccessfulRequest ? (
                <div className="main" role="main">
                    <nav className='nav'>
                        <a 
                            id="mobView"
                            tabIndex='0' 
                            className="icon"
                            onClick={this.toggleListView.bind(this)}
                        >
                            &#9776;
                        </a>
                        <h1 id='subject' tabIndex='1'>Riyadh Map</h1>
                    </nav>
                    <div id='container'>
                        <div className='map-container'>
                            <Map markers={this.state.markers}></Map>
                        </div>
                        {this.state.listShow && 
                        <div className='view'>
                            <div id='view' className='listView'>
                                
                                <input
                                    id='textForFilter'
                                    className='form-control'
                                    type='text'
                                    placeholder='Search for location'
                                    value={ query }
                                    onChange={ (event) => this.updateQuery(event.target.value) }
                                    role='search'
                                    aria-labelledby='Search for Location'
                                    tabIndex='1'
                                />
                                <ul
                                    aria-labelledby='list of locations'
                                    tabIndex='1'
                                >
                                    {showLocations.map((getLocation, index) =>
                                        <li 
                                            key={index}
                                            tabIndex={index+2}
                                            onClick={this.ListItem.bind(this, getLocation)}
                                        >
                                            {getLocation.name}
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                        }
                    </div>
                </div>
            ) : (
                <div>
                    <h1 style={{'text-align': 'center'}}>Error: Something Went Wrong!</h1>
                </div>
            )
            
        )
    }
}

export default scriptLoader(
    [`https://maps.googleapis.com/maps/api/js?key=${api.googleMapApi}&v=3`]
)(App);
