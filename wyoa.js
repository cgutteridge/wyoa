
$(document).ready(function(){
  var game;
  var currentNode;
  var waypoints=[];
  var waylines=[];
  var waypointsIds=[];
  var userMarker;
  var userPos;
  var map;
  var inRangeId = false;
  var lastNodeId = false;
  var storyRoute = [];
  var fromLine = false;
  var dash = "5,10";

  $('#storyButton').click( function() {
    $('#mapView').hide();
    $('#storyView').show();
  } );
  $('#mapButton').click( function() {
    $('#mapView').show();
    $('#storyView').hide();
  } );
  $('#activateButton').click( function() {
    if( !inRangeId ) { return; }
   
    $('#activateButton').hide();

    var node = game.nodes[inRangeId];

    var icon = L.icon( { 
      iconUrl: 'http://data.southampton.ac.uk/map-icons/Nature/snail.png',
      iconSize: [32, 37],
      labelAnchor: [16, -18],
      iconAnchor: [16, 37]
    } );
    var marker = L.marker(node.ll,{icon:icon}).addTo(map);

    if( lastNodeId ) {
      var wayline = L.polyline([game.nodes[lastNodeId].ll,node.ll],{
        color: 'green', 
        dashArray: dash
      });
      wayline.addTo(map);
    }
/*
    if( !fromLine ) {
      fromLine = L.polyline([node.ll,node.ll],{
        color: 'green', 
        dashArray: dash
      });
      fromLine.addTo(map);
    }
*/

    setWaypoints( node.next );

    var chapter = $('<div class="chapter"><a name="'+inRangeId+'"></a></div>');
    chapter.append( $('<h3>'+node.title+'</h3>' ));
    $('#chapters').append( chapter );
    for( i=0; i<node.content.length; i++ ) {
      chapter.append( $('<p></p>').html( node.content[i] ) );
    } 

    $('#storyEnd').empty();
    if( node.choice ) {
      for( i=0; i<node.choice.length; i++ ) {
        $('#storyEnd').append( $('<p></p>').html( node.choice[i] ) );
      } 
    } else if( node.next && node.next.length > 0 ) {
        $('#storyEnd').append( $('<p>Keep walking! The red circles show where you can go next.</p>' ));
    } else {
        $('#storyEnd').append( $('<p>THE END</p><p>This story has come to an end but there are other ways you could have gone. Return to the Exchange for a new story.</p>' ));
    }


    
    $('#mapView').hide();
    $('#storyView').show();

    window.location.hash = '#'+inRangeId;
    
    //setTimeout( function() { $('#storyArea').scrollTop(chapter.offset().top); }, 1000 ); 
    storyRoute.push( inRangeId );
    lastNodeId = inRangeId; 

    setUserPos( userPos ); // make lines update but resets inRangeId


  } );
    
  if (!("geolocation" in navigator)) {
    doom("Sorry, you need geolocation for this system to work. Either it's disabled or your phone don't do that.");
    return;
  }

  var debug = false;
  if( window.location.host == 'lemur.ecs.soton.ac.uk' ) {
    debug = true;
  }

  $.ajax({
    url: "data.php",
    context: document.body
  }).done(function(loadedData) {
    game = loadedData;
    game.nodeIds = Object.keys( game.nodes );
    doom("Pay no attention to the manatee wearing the kaftan.");
    runGame(debug);
  }).fail(function() {
    doom('failed to load database. Sorry.');
  });

  var getUpdate = function(p) { ; }
  var geoFail = function(p) { ; }

  function initGPS() {
    var geo = navigator.geolocation;
    setInterval( function() {  
      geo.getCurrentPosition(
        getUpdate,
        geoFail,
        {enableHighAccuracy:true});
    }, 5000 );
    geo.getCurrentPosition(
      getUpdate,
      geoFail,
      {enableHighAccuracy:true});
  }
  function error_callback() {
    alert( "GEOFAIL");
  }
    

  function doom(text) {
    $('#init').text(text);
  }


  function runGame(debug) {

    map = L.map('map').setView([50.59466,-1.20618], 18);
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
        maxZoom: 19
    }).addTo(map);

/*
    for(var i=0;i<game.nodeIds.length;i++) {
      var node = game.nodes[game.nodeIds[i]];
      var circle = L.circle(node.ll, node.size, {
          color: 'blue',
          opacity: 0.1
      }).addTo(map);
    }
*/

    setWaypoints( game.start );
   
    if( debug ) { 
      map.on('click', function(e) { setUserPos( [e.latlng.lat,e.latlng.lng] ); } );
    } else {
      getUpdate = function(p){ setUserPos( [p.coords.latitude, p.coords.longitude ] ); }
      initGPS();
    }
  }

  function setUserPos( ll ) {
    // map.setView( ll ); // don't centre on the player (automatically)
    if( !userMarker ) {
      var icon = L.icon( { 
        iconUrl: 'http://data.southampton.ac.uk/map-icons/Stores/hats.png',
        iconSize: [32, 37],
        labelAnchor: [16, -18],
        iconAnchor: [16, 37]
      } );
      userMarker = L.marker(ll,{ icon: icon } );
      userMarker.addTo(map);
    }
    userMarker.setLatLng(ll);
    userPos = L.latLng(ll);
    if( fromLine ) {
      fromLine.setLatLngs( [game.nodes[lastNodeId].ll,ll ] );
    }
    inRangeId = false;
    for(var i=0; i<waypointIds.length; ++i ) {
      var node = game.nodes[waypointIds[i]];
      if( !node ) { alert( "BUG A (sorry): Can't load waypoint "+i+": "+ waypointIds[i] + " from "+lastNodeId ); }
      waylines[i].setLatLngs( [ll, node.ll] );
      if( userPos.distanceTo( node.ll ) <= node.size ) {
        inRangeId = waypointIds[i];
        $('#activateButton').show();
      }
    }
    if( !inRangeId ) {
      $('#activateButton').hide();
    }
  }


  function setWaypoints( newWaypointIds ) {
    // remove old waypoints
    for(var i=0; i<waypoints.length; ++i ) {
      map.removeLayer( waypoints[i] );
      map.removeLayer( waylines[i] );
    }
    waypoints = []; 
    waylines = []; 
    
    for(var i=0; i<newWaypointIds.length; ++i ) {
      var node = game.nodes[newWaypointIds[i]];
      if( !node ) { alert( "BUG B (sorry): Can't load waypoint "+i+": "+newWaypointIds[i] + " from "+lastNodeId ); }

      var waypoint = L.circle(node.ll, node.size, {
        stroke: false,
        fillColor: '#f00',
        fillOpacity: 0.2 
      });
      waypoint.addTo(map);
      waypoints.push( waypoint );

      var wayline = L.polyline([node.ll,node.ll],{
        color: 'red',
        dashArray: dash
      });
      wayline.addTo(map);
      waylines.push( wayline );
    }
    waypointIds = newWaypointIds;
  }        
    
});


